import { useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface Props {
  value?: string
  onChange: (url: string) => void
  bucket?: 'course-images' | 'avatars'
  label?: string
  hint?: string
  aspectRatio?: 'video' | 'square'
}

export function ImageUpload({
  value,
  onChange,
  bucket = 'course-images',
  label = 'Imagen',
  hint = 'JPG, PNG o WebP · Máx 5MB',
  aspectRatio = 'video',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes')
      return
    }
    const maxSize = bucket === 'avatars' ? 2 * 1024 * 1024 : 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error(`La imagen no puede superar ${maxSize / 1024 / 1024}MB`)
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path)
      onChange(publicUrl)
      toast.success('Imagen subida')
    } catch (e: any) {
      toast.error(e.message ?? 'Error al subir la imagen')
    } finally {
      setUploading(false)
    }
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
            : 'border-border/50 bg-gray-50 hover:border-primary/50 hover:bg-primary/5'
        }`}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {value ? (
          <>
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
                title="Cambiar imagen"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onChange('') }}
                className="p-2 rounded-full bg-white/20 hover:bg-red-500/70 transition-colors text-white"
                title="Eliminar imagen"
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
                <span className="text-xs">Subiendo...</span>
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
                    <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
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
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f) }}
      />
    </div>
  )
}
