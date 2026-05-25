/**
 * Migrador de imágenes legacy.
 *
 * Tab dentro de NatoOwnerPanel. Lista las imágenes que NO están en formato
 * WebP (o que pesan más de 200 KB sin thumb hermano) y permite procesarlas
 * en batch desde el browser: descarga, comprime con canvas, sube el WebP
 * principal + thumb, actualiza la URL en la fila correspondiente de la DB
 * y borra el original.
 *
 * Patrón Ranerzzz (mayo 2026): el batch corre client-side desde admin con
 * el cliente público (RLS abierta para nato_owner). Si el plan es free y
 * se queda sin bandwidth a mitad, se puede pausar y reanudar — cada item
 * es idempotente.
 *
 * Requiere `docs/storage-metrics.sql` aplicado (para listar candidatos).
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { compressImage } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Loader2, Image as ImageIcon, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

type Status = 'pending' | 'processing' | 'done' | 'skipped' | 'error'

interface LegacyFile {
  bucket: 'course-images' | 'avatars' | 'community-uploads'
  /** Path dentro del bucket */
  path: string
  /** URL pública original */
  url: string
  /** Bytes del original (de get_storage_top_files) */
  sizeKb: number
  status: Status
  message?: string
}

const COURSE_PRESET = { maxW: 1280, maxH: 720, quality: 0.82 }
const COURSE_THUMB = { maxW: 480, maxH: 270, quality: 0.78 }
const AVATAR_PRESET = { maxW: 512, maxH: 512, quality: 0.85 }
const AVATAR_THUMB = { maxW: 128, maxH: 128, quality: 0.8 }

export function StorageMigration() {
  const [files, setFiles] = useState<LegacyFile[]>([])
  const [running, setRunning] = useState(false)
  const [scanned, setScanned] = useState(false)

  // Scan: pedir el top de archivos pesados por bucket y filtrar los que no son .webp
  const { data: usage } = useQuery<{ bucket_id: string }[]>({
    queryKey: ['nato-storage-usage-for-migration'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_storage_usage' as never) as { data: { bucket_id: string }[] | null; error: { message: string } | null }
      if (error) throw error
      return (data ?? []) as { bucket_id: string }[]
    },
  })

  async function scanBuckets() {
    if (!usage) return
    setScanned(false)
    setFiles([])
    const found: LegacyFile[] = []

    for (const b of usage) {
      const bucketId = b.bucket_id as LegacyFile['bucket']
      if (!['course-images', 'avatars', 'community-uploads'].includes(bucketId)) continue
      const { data, error } = await supabase.rpc('get_storage_top_files' as never, { p_bucket: bucketId, p_limit: 200 } as never) as { data: { name: string; size_kb: number }[] | null; error: { message: string } | null }
      if (error) {
        toast.error(`Falló el scan de ${bucketId}: ${error.message}`)
        continue
      }
      for (const f of data ?? []) {
        // Saltamos los thumbs y los que ya son .webp principales chicos
        if (f.name.endsWith('.thumb.webp')) continue
        const isWebp = f.name.endsWith('.webp')
        if (isWebp && f.size_kb < 200) continue
        const { data: { publicUrl } } = supabase.storage.from(bucketId).getPublicUrl(f.name)
        found.push({
          bucket: bucketId,
          path: f.name,
          url: publicUrl,
          sizeKb: Math.round(f.size_kb),
          status: 'pending',
        })
      }
    }
    setFiles(found)
    setScanned(true)
    toast.success(`Scan completo: ${found.length} archivo${found.length === 1 ? '' : 's'} para migrar`)
  }

  async function migrateOne(file: LegacyFile, idx: number): Promise<LegacyFile> {
    function update(status: Status, message?: string) {
      setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status, message } : f))
      return { ...file, status, message }
    }

    try {
      update('processing')

      // 1. Descargar
      const res = await fetch(file.url)
      if (!res.ok) return update('error', `HTTP ${res.status}`)
      const blob = await res.blob()
      const originalFile = new File([blob], file.path.split('/').pop() ?? 'image', { type: blob.type })

      // Saltar si no es imagen
      if (!originalFile.type.startsWith('image/')) {
        return update('skipped', 'No es imagen')
      }

      // 2. Comprimir principal + thumb
      const isAvatar = file.bucket === 'avatars'
      const mainBlob = await compressImage(originalFile, isAvatar ? AVATAR_PRESET : COURSE_PRESET)
      const thumbBlob = await compressImage(originalFile, isAvatar ? AVATAR_THUMB : COURSE_THUMB)

      // 3. Subir con MISMO nombre base pero extensión .webp + thumb hermano
      // Path nuevo: <dir>/<basename>.webp y <dir>/<basename>.thumb.webp
      const dir = file.path.includes('/') ? file.path.replace(/\/[^/]+$/, '/') : ''
      const baseName = file.path.split('/').pop()!.replace(/\.[^.]+$/, '')
      const newPath = `${dir}${baseName}.webp`
      const newThumbPath = `${dir}${baseName}.thumb.webp`

      const cacheControl = '31536000'
      const contentType = 'image/webp'

      const { error: e1 } = await supabase.storage
        .from(file.bucket)
        .upload(newPath, mainBlob, { cacheControl, upsert: true, contentType })
      if (e1) return update('error', `upload main: ${e1.message}`)

      const { error: e2 } = await supabase.storage
        .from(file.bucket)
        .upload(newThumbPath, thumbBlob, { cacheControl, upsert: true, contentType })
      if (e2) console.warn('[migration] thumb upload falló:', e2.message)

      // 4. Si el path cambió de extensión, actualizar la fila correspondiente
      //    en la DB (courses.thumbnail_url, courses.instructor_avatar_url, profiles.avatar_url, tenants.logo_url)
      if (newPath !== file.path) {
        const { data: { publicUrl: newUrl } } = supabase.storage.from(file.bucket).getPublicUrl(newPath)
        await updateReferencesInDb(file.url, newUrl)
      }

      // 5. Si cambió extensión, borrar el original
      if (newPath !== file.path) {
        await supabase.storage.from(file.bucket).remove([file.path])
      }

      const savedKb = file.sizeKb - Math.round(mainBlob.size / 1024)
      return update('done', `-${savedKb} KB`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error'
      return update('error', msg)
    }
  }

  async function runMigration() {
    setRunning(true)
    let donedCount = 0
    let savedKb = 0
    for (let i = 0; i < files.length; i++) {
      const result = await migrateOne(files[i], i)
      if (result.status === 'done') {
        donedCount++
        const m = result.message?.match(/-(\d+) KB/)
        if (m) savedKb += parseInt(m[1], 10)
      }
    }
    setRunning(false)
    toast.success(`Migración OK: ${donedCount}/${files.length} archivos · ahorraste ~${(savedKb / 1024).toFixed(1)} MB`)
  }

  const counts = {
    pending: files.filter(f => f.status === 'pending').length,
    done: files.filter(f => f.status === 'done').length,
    error: files.filter(f => f.status === 'error').length,
    skipped: files.filter(f => f.status === 'skipped').length,
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <ImageIcon className="w-6 h-6 text-yellow-400 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-1">
            <h3 className="text-white font-medium">Migración de imágenes legacy a WebP + thumbs</h3>
            <p className="text-sm text-gray-400">
              Escanea los buckets, lista imágenes que no están optimizadas y las procesa
              en batch desde el browser. Las nuevas se generan con compresión + thumb +
              cacheControl 1 año. Idempotente — podés pausar y reanudar.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={scanBuckets} disabled={running}>
            {scanned ? 'Re-escanear' : 'Escanear buckets'}
          </Button>
          {files.length > 0 && (
            <Button
              size="sm"
              onClick={runMigration}
              disabled={running || counts.pending === 0}
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900"
            >
              {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando…</> : `Migrar ${counts.pending} archivos`}
            </Button>
          )}
          {scanned && files.length === 0 && (
            <span className="text-sm text-green-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Todo está optimizado
            </span>
          )}
        </div>
        {files.length > 0 && (
          <div className="flex gap-4 text-xs text-muted-foreground mt-3">
            <span>✓ {counts.done} listos</span>
            <span>⏳ {counts.pending} pendientes</span>
            {counts.error > 0 && <span className="text-red-400">✗ {counts.error} con error</span>}
            {counts.skipped > 0 && <span>↷ {counts.skipped} salteados</span>}
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-950 text-gray-400">
              <tr>
                <th className="text-left px-5 py-2 font-medium">Archivo</th>
                <th className="text-right px-5 py-2 font-medium">Bucket</th>
                <th className="text-right px-5 py-2 font-medium">Original</th>
                <th className="text-right px-5 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {files.map(f => (
                <tr key={`${f.bucket}/${f.path}`} className="border-t border-gray-800/60">
                  <td className="px-5 py-2 text-gray-300 truncate max-w-[420px]">{f.path}</td>
                  <td className="px-5 py-2 text-right text-muted-foreground text-xs">{f.bucket}</td>
                  <td className="px-5 py-2 text-right text-gray-400">{f.sizeKb} KB</td>
                  <td className="px-5 py-2 text-right">
                    <StatusBadge status={f.status} message={f.message} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status, message }: { status: Status; message?: string }) {
  if (status === 'processing') return <span className="inline-flex items-center gap-1 text-blue-400 text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Procesando…</span>
  if (status === 'done') return <span className="inline-flex items-center gap-1 text-green-400 text-xs"><CheckCircle2 className="w-3 h-3" /> Listo {message ? `(${message})` : ''}</span>
  if (status === 'error') return <span className="inline-flex items-center gap-1 text-red-400 text-xs" title={message}><AlertTriangle className="w-3 h-3" /> Error</span>
  if (status === 'skipped') return <span className="text-muted-foreground text-xs">{message ?? 'Salteado'}</span>
  return <span className="text-muted-foreground text-xs">Pendiente</span>
}

/**
 * Actualiza las tablas que pueden tener la URL como FK textual.
 * Best-effort: cada update es independiente. No fallar todo si una tabla
 * no tiene la URL.
 */
async function updateReferencesInDb(oldUrl: string, newUrl: string) {
  const updates: Promise<unknown>[] = [
    supabase.from('courses').update({ thumbnail_url: newUrl }).eq('thumbnail_url', oldUrl).then(() => null, () => null),
    supabase.from('courses').update({ instructor_avatar_url: newUrl }).eq('instructor_avatar_url', oldUrl).then(() => null, () => null),
    supabase.from('profiles').update({ avatar_url: newUrl }).eq('avatar_url', oldUrl).then(() => null, () => null),
    supabase.from('tenants').update({ logo_url: newUrl }).eq('logo_url', oldUrl).then(() => null, () => null),
  ]
  await Promise.allSettled(updates)
}
