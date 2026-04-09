import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const schema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  body: z.string().min(10, 'Mínimo 10 caracteres'),
  category: z.enum(['question', 'win', 'resource', 'general']),
})

export type PostFormData = z.infer<typeof schema>

const CATEGORIES = [
  { value: 'question', label: '❓ Pregunta' },
  { value: 'win', label: '🏆 Logro' },
  { value: 'resource', label: '📎 Recurso' },
  { value: 'general', label: '💬 General' },
]

interface Props {
  onSubmit: (data: PostFormData) => Promise<void>
  onCancel: () => void
}

export function PostForm({ onSubmit, onCancel }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PostFormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'general' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-gray-700 font-medium">Categoría</Label>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <label key={cat.value} className="cursor-pointer">
              <input type="radio" value={cat.value} {...register('category')} className="sr-only peer" />
              <span className="px-3 py-1.5 rounded-full text-xs border border-gray-200 text-gray-600 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-colors">
                {cat.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-gray-700 font-medium">Título</Label>
        <Input id="title" placeholder="¿Qué querés compartir?" {...register('title')} className="border-gray-200 focus:border-primary" />
        {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="body" className="text-gray-700 font-medium">Descripción</Label>
        <Textarea
          id="body"
          placeholder="Contá más detalles..."
          className="resize-none min-h-[120px] border-gray-200 focus:border-primary"
          {...register('body')}
        />
        {errors.body && <p className="text-xs text-red-500">{errors.body.message}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="hero" disabled={isSubmitting}>
          {isSubmitting ? 'Publicando...' : 'Publicar'}
        </Button>
      </div>
    </form>
  )
}
