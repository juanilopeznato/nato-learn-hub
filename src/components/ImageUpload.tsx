import { useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { uploadImage, deleteImageByUrl, type ImageKind } from '@/lib/storage'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'

/**
 * Si la URL es nuestra (de uno de los buckets) la borramos del storage.
 * Si es externa (URL legacy o de otro origen) la ignoramos.
 * No falla si el delete tira error — log silencioso.
 */
async function cleanupOldImage(oldUrl: string | undefined) {
  if (!oldUrl) return
  if (!oldUrl.includes('/storage/v1/object/public/')) return
  try {
    await deleteImageByUrl(oldUrl)
  } catch (e) {
    console.warn('[ImageUpload] No se pudo borrar imagen vieja:', e)
  }
}

interface Props {
  value?: string
  onChange: (url: string) => void
  /**
   * Tipo lógico de imagen. El bucket, tamaños y compresión se deciden por kind.
   * Compat: si pasan `bucket`/`aspectRatio` viejos, se mapean al kind correspondiente.
   */
  kind?: ImageKind
  bucket?: 'course-images' | 'avatars'
  label?: string
  hint?: string
  aspectRatio?: 'video' | 'square'
}

function resolveKind(props: Pick<Props, 'kind' | 'bucket' | 'aspectRatio'>): ImageKind {
  if (props.kind) return props.kind
  if (props.bucket === 'avatars') return 'avatar'
  if (props.aspectRatio === 'square') return 'avatar'
  return 'course-cover'
}

export function ImageUpload({
  value,
  onChange,
  kind,
  bucket,
  label = 'Imagen',
  hint,
  aspectRatio = 'video',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const { tenant } = useAuth()

  const resolvedKind = resolveKind({ kind, bucket, aspectRatio })
  const defaultHint = resolvedKind === 'avatar'
    ? 'JPG, PNG o WebP · Se comprime automáticamente'
    : 'JPG, PNG o WebP · Se optimiza automáticamente'

  async function uploadFile(file: File) {
    if (!tenant?.id) {
      toast.error('No se pudo identificar la escuela. Recargá la página.')
      return
    }
    setUploading(true)
    const oldUrl = value
    try {
      const result = await uploadImage(file, { kind: resolvedKind, tenantId: tenant.id })
      onChange(result.url)
      const kb = Math.round(result.bytes / 1024)
      toast.success(`Imagen subida (${kb} KB)`)
      // Cleanup en background — no bloquea la UI ni rompe si falla
      void cleanupOldImage(oldUrl)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al subir la imagen'
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  function removeImage() {
    const oldUrl = value
    onChange('')
    void cleanupOldImage(oldUrl)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  const containerClass = aspectRatio === 'square'
    ? 'w-24 h-24 rounded-full'
    : 'w-full aspect-video rounded-xl'

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div
        className={`${containerClass} relative border-2 border-dashed transition-colors cursor-pointer overflow-hidden group ${
          dragOver
            ? 'border-primary bg-primary/5'
            : value
            ? 'border-transparent'
            : 'border-border/50 bg-secondary/30 hover:border-primary/50 hover:bg-primary/5'
        }`}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {value ? (
          <>
            <img src={value} alt="Preview" className="w-full h-full object-cover" loading="lazy" decoding="async" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
                title="Cambiar imagen"
                aria-label="Cambiar imagen"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); removeImage() }}
                className="p-2 rounded-full bg-white/20 hover:bg-red-500/70 transition-colors text-white"
                title="Eliminar imagen"
                aria-label="Eliminar imagen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
            {uploading ? (
              <>
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Optimizando...</span>
              </>
            ) : (
              <>
                {aspectRatio === 'square'
                  ? <ImageIcon className="w-6 h-6" />
                  : <Upload className="w-7 h-7" />
                }
                {aspectRatio !== 'square' && (
                  <div className="text-center">
                    <p className="text-xs font-medium text-gray-500">
                      {dragOver ? 'Soltá la imagen' : 'Arrastrá o hacé click'}
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-0.5">{hint ?? defaultHint}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f) }}
      />
    </div>
  )
}
