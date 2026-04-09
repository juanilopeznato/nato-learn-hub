import { useForm, Controller } from 'react-hook-form'
import { ImageUpload } from '@/components/ImageUpload'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Tables } from '@/types/database.types'

const CATEGORIES = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'negocios', label: 'Negocios' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'diseño', label: 'Diseño' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'fotografia', label: 'Fotografía' },
  { value: 'musica', label: 'Música' },
  { value: 'productividad', label: 'Productividad' },
  { value: 'idiomas', label: 'Idiomas' },
  { value: 'otro', label: 'Otro' },
]

const faqItemSchema = z.object({ q: z.string(), a: z.string() })

const schema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  original_price: z.coerce.number().min(0).optional(),
  is_free: z.boolean(),
  is_published: z.boolean(),
  thumbnail_url: z.string().optional(),
  intro_video_url: z.string().optional(),
  learning_outcomes: z.array(z.string()).optional(),
  for_who: z.string().optional(),
  instructor_bio: z.string().optional(),
  instructor_avatar_url: z.string().optional(),
  faq: z.array(faqItemSchema).optional(),
  meta_pixel_id: z.string().optional(),
  category: z.string().optional(),
  nato_produced: z.boolean().optional(),
  production_recovery_sales: z.coerce.number().min(1).optional(),
})

export type CourseFormData = z.infer<typeof schema>
type Course = Tables<'courses'>

interface Props {
  defaultValues?: Partial<CourseFormData>
  onSubmit: (data: CourseFormData) => Promise<void>
  onCancel: () => void
  isEditing?: boolean
}

export function CourseForm({ defaultValues, onSubmit, onCancel, isEditing }: Props) {
  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting } } = useForm<CourseFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      price: 0, is_free: true, is_published: false,
      learning_outcomes: [''],
      faq: [{ q: '', a: '' }],
      ...defaultValues,
    },
  })

  const isFree = watch('is_free')
  const outcomes = watch('learning_outcomes') ?? ['']
  const faqItems = watch('faq') ?? [{ q: '', a: '' }]

  function addOutcome() { setValue('learning_outcomes', [...outcomes, '']) }
  function removeOutcome(i: number) { setValue('learning_outcomes', outcomes.filter((_, idx) => idx !== i)) }
  function updateOutcome(i: number, v: string) {
    const next = [...outcomes]; next[i] = v; setValue('learning_outcomes', next)
  }

  function addFaq() { setValue('faq', [...faqItems, { q: '', a: '' }]) }
  function removeFaq(i: number) { setValue('faq', faqItems.filter((_, idx) => idx !== i)) }
  function updateFaq(i: number, field: 'q' | 'a', v: string) {
    const next = [...faqItems]; next[i] = { ...next[i], [field]: v }; setValue('faq', next)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Tabs defaultValue="basic">
        <TabsList className="bg-gray-100 w-full">
          <TabsTrigger value="basic" className="flex-1 text-xs">Básico</TabsTrigger>
          <TabsTrigger value="sales" className="flex-1 text-xs">Ventas</TabsTrigger>
          <TabsTrigger value="instructor" className="flex-1 text-xs">Instructor</TabsTrigger>
        </TabsList>

        {/* Tab: Básico */}
        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label className="text-foreground">Título</Label>
            <Input placeholder="Edición Limitada" className="bg-gray-100 border-border/50 text-foreground" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground">Slug (URL)</Label>
            <Input placeholder="edicion-limitada" className="bg-gray-100 border-border/50 text-foreground" {...register('slug')} />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground">Categoría</Label>
            <Select value={watch('category') ?? 'otro'} onValueChange={v => setValue('category', v)}>
              <SelectTrigger className="bg-gray-100 border-border/50 text-foreground">
                <SelectValue placeholder="Elegí una categoría" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground">Descripción (subtítulo del curso)</Label>
            <textarea
              placeholder="Una frase que resume el valor del curso..."
              className="w-full bg-gray-100 border border-border/50 text-foreground rounded-md px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary"
              {...register('description')}
            />
          </div>

          <Controller
            control={control}
            name="thumbnail_url"
            render={({ field }) => (
              <ImageUpload
                value={field.value ?? ''}
                onChange={field.onChange}
                bucket="course-images"
                label="Imagen del curso"
                hint="JPG, PNG o WebP · Máx 5MB · Recomendado 1280×720px"
                aspectRatio="video"
              />
            )}
          />

          <div className="space-y-1.5">
            <Label className="text-foreground">Video de presentación (URL YouTube/Vimeo)</Label>
            <Input placeholder="https://youtube.com/watch?v=..." className="bg-gray-100 border-border/50 text-foreground" {...register('intro_video_url')} />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isFree} onCheckedChange={v => setValue('is_free', v)} id="is_free" />
            <Label htmlFor="is_free" className="text-foreground cursor-pointer">Curso gratuito</Label>
          </div>

          {!isFree && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-foreground">Precio (ARS)</Label>
                <Input type="number" min={0} className="bg-gray-100 border-border/50 text-foreground" {...register('price')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Precio tachado (opcional)</Label>
                <Input type="number" min={0} placeholder="Precio original" className="bg-gray-100 border-border/50 text-foreground" {...register('original_price')} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Switch checked={watch('is_published')} onCheckedChange={v => setValue('is_published', v)} id="is_published" />
            <Label htmlFor="is_published" className="text-foreground cursor-pointer">Publicar</Label>
          </div>
        </TabsContent>

        {/* Tab: Ventas */}
        <TabsContent value="sales" className="space-y-5 mt-4">
          {/* Qué vas a aprender */}
          <div className="space-y-2">
            <Label className="text-foreground font-semibold">¿Qué vas a aprender? (bullets)</Label>
            <p className="text-xs text-gray-500">Listá los resultados concretos del curso. Estos aparecen como checklist en la landing.</p>
            <div className="space-y-2">
              {outcomes.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={o}
                    onChange={e => updateOutcome(i, e.target.value)}
                    placeholder={`Resultado ${i + 1}...`}
                    className="bg-gray-100 border-border/50 text-foreground text-sm flex-1"
                  />
                  {outcomes.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="shrink-0 text-gray-400 hover:text-destructive" onClick={() => removeOutcome(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="hero-outline" size="sm" onClick={addOutcome} className="text-xs h-8">
                <Plus className="w-3 h-3" /> Agregar resultado
              </Button>
            </div>
          </div>

          {/* Para quién es */}
          <div className="space-y-1.5">
            <Label className="text-foreground font-semibold">¿Para quién es este curso?</Label>
            <textarea
              placeholder="Este curso es para vos si sos community manager, dueño de una marca personal, o querés..."
              className="w-full bg-gray-100 border border-border/50 text-foreground rounded-md px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-1 focus:ring-primary"
              {...register('for_who')}
            />
          </div>

          {/* FAQ */}
          <div className="space-y-2">
            <Label className="text-foreground font-semibold">Preguntas frecuentes</Label>
            <div className="space-y-3">
              {faqItems.map((item, i) => (
                <div key={i} className="space-y-1.5 bg-gray-50 rounded-lg p-3 border border-border/20">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium w-4">{i + 1}</span>
                    <Input
                      value={item.q}
                      onChange={e => updateFaq(i, 'q', e.target.value)}
                      placeholder="¿Cuánto dura el curso?"
                      className="bg-white border-border/50 text-foreground text-sm flex-1"
                    />
                    {faqItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="shrink-0 text-gray-400 hover:text-destructive w-7 h-7" onClick={() => removeFaq(i)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <Input
                    value={item.a}
                    onChange={e => updateFaq(i, 'a', e.target.value)}
                    placeholder="Respuesta..."
                    className="bg-white border-border/50 text-foreground text-sm ml-6"
                  />
                </div>
              ))}
              <Button type="button" variant="hero-outline" size="sm" onClick={addFaq} className="text-xs h-8">
                <Plus className="w-3 h-3" /> Agregar pregunta
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Instructor */}
        <TabsContent value="instructor" className="space-y-4 mt-4">
          <p className="text-xs text-gray-500">Estos datos aparecen en la sección "Tu instructor" de la landing del curso.</p>
          <Controller
            control={control}
            name="instructor_avatar_url"
            render={({ field }) => (
              <ImageUpload
                value={field.value ?? ''}
                onChange={field.onChange}
                bucket="avatars"
                label="Foto del instructor"
                hint="JPG o PNG · Máx 2MB"
                aspectRatio="square"
              />
            )}
          />
          <div className="space-y-1.5">
            <Label className="text-foreground">Bio del instructor</Label>
            <textarea
              placeholder="Soy diseñador de marca con 10 años de experiencia. Trabajé con marcas como..."
              className="w-full bg-gray-100 border border-border/50 text-foreground rounded-md px-3 py-2 text-sm resize-none h-28 focus:outline-none focus:ring-1 focus:ring-primary"
              {...register('instructor_bio')}
            />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/20">
            <Label className="text-foreground">Meta Pixel (este curso)</Label>
            <Input
              placeholder="123456789012345"
              className="bg-gray-100 border-border/50 text-foreground"
              {...register('meta_pixel_id')}
            />
            <p className="text-xs text-gray-500">Opcional. Sobreescribe el pixel de la escuela.</p>
          </div>

          <div className="space-y-3 pt-2 border-t border-border/20">
            <div className="flex items-center gap-3">
              <Switch
                checked={watch('nato_produced') ?? false}
                onCheckedChange={v => setValue('nato_produced', v)}
                id="nato_produced"
              />
              <div>
                <Label htmlFor="nato_produced" className="text-foreground cursor-pointer">
                  Producido por NATO Creative
                </Label>
                <p className="text-xs text-gray-500">Los primeros N cobros recuperan el costo de producción</p>
              </div>
            </div>
            {watch('nato_produced') && (
              <div className="space-y-1.5 ml-1">
                <Label className="text-foreground text-sm">Ventas de recupero</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="10"
                  className="bg-gray-100 border-border/50 text-foreground w-32"
                  {...register('production_recovery_sales')}
                />
                <p className="text-xs text-gray-500">Primeras N ventas van 100% a NATO. A partir de ahí cobra el creador.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="hero" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear curso'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  )
}
