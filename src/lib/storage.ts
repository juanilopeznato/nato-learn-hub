/**
 * Pipeline ÚNICO de uploads a Supabase Storage.
 *
 * Reglas (post-crisis Ranerzzz 14-may-2026):
 *  - Toda imagen pasa por aquí. Nada de `supabase.storage.from(x).upload()` suelto.
 *  - Compresión client-side + conversión a WebP antes de subir.
 *  - Generación de thumb en el mismo flow (sufijo `.thumb.webp`).
 *  - Path con prefijo `${tenant_id}/` para aislamiento + listing seguro.
 *  - `cacheControl` de 1 año (filename hasheado garantiza invalidación).
 *
 * Lectura: usar `<SmartImage>` o `getOptimizedUrl()` — nunca el publicUrl crudo
 * en listas / thumbnails / avatars chicos.
 */
import { supabase } from './supabase'

export type ImageKind = 'avatar' | 'course-cover' | 'community-post'

export type ImageBucket = 'avatars' | 'course-images' | 'community-uploads'

interface KindPreset {
  bucket: ImageBucket
  /** Dimensiones máximas de la imagen principal */
  maxW: number
  maxH: number
  /** Tamaño máximo del archivo original (pre-compresión) en bytes */
  maxInputBytes: number
  /** Calidad WebP 0..1 */
  quality: number
  /** Si se genera thumb */
  thumb: { w: number; h: number; quality: number } | null
}

const PRESETS: Record<ImageKind, KindPreset> = {
  avatar: {
    bucket: 'avatars',
    maxW: 512,
    maxH: 512,
    maxInputBytes: 8 * 1024 * 1024, // 8MB (un iPhone manda fácil 5MB)
    quality: 0.85,
    thumb: { w: 128, h: 128, quality: 0.8 },
  },
  'course-cover': {
    bucket: 'course-images',
    maxW: 1280,
    maxH: 720,
    maxInputBytes: 10 * 1024 * 1024, // 10MB de input
    quality: 0.82,
    thumb: { w: 480, h: 270, quality: 0.78 },
  },
  'community-post': {
    bucket: 'community-uploads',
    maxW: 1600,
    maxH: 1600,
    maxInputBytes: 10 * 1024 * 1024,
    quality: 0.82,
    thumb: { w: 600, h: 600, quality: 0.78 },
  },
}

const ACCEPTED_MIME = /^image\/(jpeg|jpg|png|webp|gif|heic|heif)$/

export class StorageError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'StorageError'
  }
}

/**
 * Decodifica un File a ImageBitmap (rápido) con fallback a HTMLImageElement.
 */
async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // Algunos formatos (HEIC viejo) caen acá → fallback
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new StorageError('No se pudo decodificar la imagen', 'DECODE_FAILED')) }
    img.src = url
  })
}

function dimsOf(bm: ImageBitmap | HTMLImageElement): { w: number; h: number } {
  return { w: (bm as ImageBitmap).width, h: (bm as ImageBitmap).height }
}

function computeTarget(srcW: number, srcH: number, maxW: number, maxH: number) {
  const ratio = Math.min(maxW / srcW, maxH / srcH, 1)
  return { w: Math.round(srcW * ratio), h: Math.round(srcH * ratio) }
}

/**
 * Comprime una imagen a WebP usando canvas. No upload — solo retorna el Blob.
 * Útil si querés inspeccionar el resultado antes de subir.
 */
export async function compressImage(
  file: File,
  opts: { maxW: number; maxH: number; quality: number }
): Promise<Blob> {
  if (!ACCEPTED_MIME.test(file.type)) {
    throw new StorageError(`Tipo no soportado: ${file.type}`, 'BAD_TYPE')
  }
  const bitmap = await decodeImage(file)
  const { w: srcW, h: srcH } = dimsOf(bitmap)
  const { w, h } = computeTarget(srcW, srcH, opts.maxW, opts.maxH)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new StorageError('Canvas 2D no disponible', 'NO_CANVAS')
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, w, h)

  // Liberar bitmap si aplica
  if ('close' in bitmap) (bitmap as ImageBitmap).close()

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => b ? resolve(b) : reject(new StorageError('Falló la compresión', 'ENCODE_FAILED')),
      'image/webp',
      opts.quality,
    )
  })
}

function randomName(): string {
  // 12 chars base36 — suficiente entropía y filename corto
  const r = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    : Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 6)
  return `${Date.now().toString(36)}-${r}`
}

export interface UploadResult {
  /** URL pública de la imagen principal */
  url: string
  /** URL pública del thumb (igual a `url` si el kind no genera thumb) */
  thumbUrl: string
  /** Path dentro del bucket (`${tenant_id}/${name}.webp`) */
  path: string
  /** Bytes finales de la imagen principal */
  bytes: number
  /** Bucket usado */
  bucket: ImageBucket
}

/**
 * Sube una imagen al pipeline blindado:
 *  1. Valida tipo y peso de entrada
 *  2. Comprime + convierte a WebP
 *  3. Genera y sube thumb si el preset lo pide
 *  4. Sube ambas con `cacheControl: 1 año`
 *  5. Retorna URL públicas
 */
export async function uploadImage(
  file: File,
  opts: { kind: ImageKind; tenantId: string },
): Promise<UploadResult> {
  const preset = PRESETS[opts.kind]
  if (!preset) throw new StorageError(`Kind desconocido: ${opts.kind}`, 'BAD_KIND')

  if (!opts.tenantId) {
    throw new StorageError('Falta tenantId — uploads siempre van bajo prefijo de tenant', 'NO_TENANT')
  }

  if (!file.type.startsWith('image/')) {
    throw new StorageError('Solo se permiten imágenes', 'BAD_TYPE')
  }
  if (!ACCEPTED_MIME.test(file.type)) {
    throw new StorageError('Formato no soportado (usá JPG, PNG o WebP)', 'BAD_TYPE')
  }
  if (file.size > preset.maxInputBytes) {
    const mb = (preset.maxInputBytes / 1024 / 1024).toFixed(0)
    throw new StorageError(`La imagen es muy grande (máx ${mb}MB)`, 'TOO_LARGE')
  }

  // Compresión principal
  const mainBlob = await compressImage(file, {
    maxW: preset.maxW,
    maxH: preset.maxH,
    quality: preset.quality,
  })

  // Thumb (mismo source decodificado seria mejor, pero por simplicidad re-procesamos
  // desde el File — el costo extra es chico y el thumb sale mejor del original)
  const thumbBlob = preset.thumb
    ? await compressImage(file, {
      maxW: preset.thumb.w,
      maxH: preset.thumb.h,
      quality: preset.thumb.quality,
    })
    : null

  const name = randomName()
  const mainPath = `${opts.tenantId}/${name}.webp`
  const thumbPath = `${opts.tenantId}/${name}.thumb.webp`

  const cacheControl = '31536000' // 1 año
  const contentType = 'image/webp'

  const { error: e1 } = await supabase.storage
    .from(preset.bucket)
    .upload(mainPath, mainBlob, { cacheControl, upsert: false, contentType })
  if (e1) throw new StorageError(e1.message, 'UPLOAD_FAILED')

  if (thumbBlob) {
    const { error: e2 } = await supabase.storage
      .from(preset.bucket)
      .upload(thumbPath, thumbBlob, { cacheControl, upsert: false, contentType })
    if (e2) {
      // Si falla el thumb, no abortamos — la imagen principal ya subió.
      // Loggeamos para Sentry/console y seguimos.
      console.warn('[storage] Thumb upload falló, sigo sin thumb:', e2.message)
    }
  }

  const { data: { publicUrl } } = supabase.storage.from(preset.bucket).getPublicUrl(mainPath)
  const { data: { publicUrl: thumbPublic } } = supabase.storage.from(preset.bucket).getPublicUrl(thumbPath)

  return {
    url: publicUrl,
    thumbUrl: thumbBlob ? thumbPublic : publicUrl,
    path: mainPath,
    bytes: mainBlob.size,
    bucket: preset.bucket,
  }
}

/**
 * Borra una imagen (principal + thumb) por su URL pública.
 * Best-effort: si el thumb no existe, no falla.
 */
export async function deleteImageByUrl(url: string): Promise<void> {
  // Formato esperado: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(?:\?.*)?$/)
  if (!match) return
  const [, bucket, path] = match
  const targets = [path]
  // Si la URL era la principal `.webp`, también borrar el thumb hermano
  if (path.endsWith('.webp') && !path.endsWith('.thumb.webp')) {
    targets.push(path.replace(/\.webp$/, '.thumb.webp'))
  }
  await supabase.storage.from(bucket).remove(targets)
}

/**
 * Devuelve una URL "optimizada" para un tamaño dado.
 *
 *  - Si la URL ya apunta a un `.webp` con thumb generado por `uploadImage`,
 *    para tamaños chicos (size <= 600) devuelve el thumb existente.
 *  - Si el plan Supabase tiene render/image (Pro+), agrega `?width=&quality=&resize=cover`
 *    para que el CDN transforme on-the-fly. Esto es gratis en bandwidth (cache CDN)
 *    y reduce el tamaño servido en mobile.
 *  - Si no hay nada, devuelve la URL original.
 */
export function getOptimizedUrl(
  url: string | null | undefined,
  opts: { size: 'thumb' | 'sm' | 'md' | 'lg' | 'full' } = { size: 'md' },
): string {
  if (!url) return ''

  // Preferir thumb pre-generado para tamaños chicos
  if ((opts.size === 'thumb' || opts.size === 'sm') && /\.webp(\?|$)/.test(url) && !url.includes('.thumb.webp')) {
    const thumb = url.replace(/\.webp(\?|$)/, '.thumb.webp$1')
    return thumb
  }

  // Render/image transform (Supabase Pro). Es no-op si el proyecto está en Free.
  // En Free el CDN ignora los query params y sirve original; no rompe nada.
  const widths: Record<typeof opts.size, number> = {
    thumb: 240,
    sm: 480,
    md: 768,
    lg: 1280,
    full: 1920,
  }
  const w = widths[opts.size]
  if (!w || !url.includes('/storage/v1/object/public/')) return url

  const renderUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
  const sep = renderUrl.includes('?') ? '&' : '?'
  return `${renderUrl}${sep}width=${w}&quality=80&resize=cover`
}
