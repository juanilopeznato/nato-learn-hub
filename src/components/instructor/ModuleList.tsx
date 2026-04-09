import { useState } from 'react'
import { Plus, Trash2, ChevronDown, Video, Pencil, X, Check, GripVertical, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Props {
  courseId: string
}

interface LessonEditState {
  title: string
  videoUrl: string
  provider: string
  isFreePreview: boolean
}

interface Resource {
  id: string
  lesson_id: string
  title: string
  file_url: string
  file_type: string
}

// Sortable module wrapper
function SortableModule({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative">
      <div
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1 touch-none"
        style={{ top: '20px', transform: 'none' }}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      {children}
    </div>
  )
}

// Sortable lesson wrapper
function SortableLesson({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex items-start gap-1">
      <div
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 mt-2 touch-none"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

// Resource panel inside lesson edit form
function LessonResources({ lessonId }: { lessonId: string }) {
  const queryClient = useQueryClient()
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')

  const { data: resources } = useQuery({
    queryKey: ['lesson-resources', lessonId],
    queryFn: async () => {
      const { data } = await supabase
        .from('resources')
        .select('*')
        .eq('lesson_id', lessonId)
      return (data ?? []) as Resource[]
    },
  })

  const addResource = useMutation({
    mutationFn: async () => {
      if (!newTitle.trim()) throw new Error('Ingresá un título')
      if (!newUrl.trim()) throw new Error('Ingresá una URL')
      const { error } = await supabase.from('resources').insert({
        lesson_id: lessonId,
        title: newTitle.trim(),
        file_url: newUrl.trim(),
        file_type: 'document',
      })
      if (error) throw error
    },
    onSuccess: () => {
      setNewTitle('')
      setNewUrl('')
      queryClient.invalidateQueries({ queryKey: ['lesson-resources', lessonId] })
      toast.success('Recurso agregado')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteResource = useMutation({
    mutationFn: async (resourceId: string) => {
      const { error } = await supabase.from('resources').delete().eq('id', resourceId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-resources', lessonId] })
      toast.success('Recurso eliminado')
    },
  })

  return (
    <div className="border-t border-blue-200 pt-2 mt-2 space-y-2">
      <p className="text-xs font-semibold text-gray-600">Recursos descargables</p>

      {resources && resources.length > 0 && (
        <div className="space-y-1">
          {resources.map(r => (
            <div key={r.id} className="flex items-center gap-2 bg-white rounded px-2 py-1">
              <FileText className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="text-xs text-gray-700 flex-1 truncate">{r.title}</span>
              <button
                type="button"
                className="text-gray-400 hover:text-destructive shrink-0"
                onClick={() => deleteResource.mutate(r.id)}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <Input
          placeholder="Título del recurso"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          className="h-7 text-xs"
        />
        <Input
          placeholder="URL del archivo"
          value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
          className="h-7 text-xs"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs w-full gap-1"
          onClick={() => addResource.mutate()}
          disabled={addResource.isPending}
        >
          <Plus className="w-3 h-3" />
          Agregar recurso
        </Button>
      </div>
    </div>
  )
}

export function ModuleList({ courseId }: Props) {
  const queryClient = useQueryClient()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [newLessons, setNewLessons] = useState<Record<string, { title: string; videoUrl: string; provider: string }>>({})
  const [editingLesson, setEditingLesson] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<LessonEditState>({ title: '', videoUrl: '', provider: 'youtube', isFreePreview: false })

  const { data: modules } = useQuery({
    queryKey: ['instructor-modules', courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('modules')
        .select('*, lessons (id, title, video_url, video_provider, order_index, is_free_preview)')
        .eq('course_id', courseId)
        .order('order_index')
      return data ?? []
    },
  })

  // --- Module drag end ---
  async function handleModuleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !modules) return
    const oldIndex = modules.findIndex(m => m.id === active.id)
    const newIndex = modules.findIndex(m => m.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(modules, oldIndex, newIndex)
    // Optimistic update
    queryClient.setQueryData(['instructor-modules', courseId], reordered)
    try {
      await Promise.all(
        reordered.map((m, i) =>
          supabase.from('modules').update({ order_index: i }).eq('id', m.id)
        )
      )
      queryClient.invalidateQueries({ queryKey: ['instructor-modules', courseId] })
    } catch {
      queryClient.invalidateQueries({ queryKey: ['instructor-modules', courseId] })
      toast.error('Error al reordenar módulos')
    }
  }

  // --- Lesson drag end ---
  function handleLessonDragEnd(moduleId: string) {
    return async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id || !modules) return
      const module = modules.find(m => m.id === moduleId)
      if (!module?.lessons) return
      const lessons = [...module.lessons].sort((a, b) => a.order_index - b.order_index)
      const oldIndex = lessons.findIndex(l => l.id === active.id)
      const newIndex = lessons.findIndex(l => l.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(lessons, oldIndex, newIndex)
      // Optimistic update
      queryClient.setQueryData(['instructor-modules', courseId], (old: typeof modules) =>
        old?.map(m =>
          m.id === moduleId ? { ...m, lessons: reordered.map((l, i) => ({ ...l, order_index: i })) } : m
        )
      )
      try {
        await Promise.all(
          reordered.map((l, i) =>
            supabase.from('lessons').update({ order_index: i }).eq('id', l.id)
          )
        )
        queryClient.invalidateQueries({ queryKey: ['instructor-modules', courseId] })
      } catch {
        queryClient.invalidateQueries({ queryKey: ['instructor-modules', courseId] })
        toast.error('Error al reordenar lecciones')
      }
    }
  }

  const addModule = useMutation({
    mutationFn: async () => {
      if (!newModuleTitle.trim()) throw new Error('Ingresá un título')
      const nextIndex = (modules?.length ?? 0)
      const { error } = await supabase.from('modules').insert({
        course_id: courseId,
        title: newModuleTitle.trim(),
        order_index: nextIndex,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setNewModuleTitle('')
      queryClient.invalidateQueries({ queryKey: ['instructor-modules', courseId] })
      toast.success('Módulo creado')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteModule = useMutation({
    mutationFn: async (moduleId: string) => {
      const { error } = await supabase.from('modules').delete().eq('id', moduleId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-modules', courseId] })
      toast.success('Módulo eliminado')
    },
  })

  const addLesson = useMutation({
    mutationFn: async (moduleId: string) => {
      const lesson = newLessons[moduleId]
      if (!lesson?.title.trim()) throw new Error('Ingresá un título de lección')
      const module = modules?.find(m => m.id === moduleId)
      const nextIndex = module?.lessons?.length ?? 0
      const { error } = await supabase.from('lessons').insert({
        module_id: moduleId,
        title: lesson.title.trim(),
        video_url: lesson.videoUrl || null,
        video_provider: (lesson.provider as 'youtube' | 'vimeo') || null,
        order_index: nextIndex,
      })
      if (error) throw error
    },
    onSuccess: (_data, moduleId) => {
      setNewLessons(prev => ({ ...prev, [moduleId]: { title: '', videoUrl: '', provider: 'youtube' } }))
      queryClient.invalidateQueries({ queryKey: ['instructor-modules', courseId] })
      toast.success('Lección agregada')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateLesson = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!editValues.title.trim()) throw new Error('Ingresá un título')
      const { error } = await supabase.from('lessons').update({
        title: editValues.title.trim(),
        video_url: editValues.videoUrl || null,
        video_provider: (editValues.provider as 'youtube' | 'vimeo') || null,
        is_free_preview: editValues.isFreePreview,
      }).eq('id', lessonId)
      if (error) throw error
    },
    onSuccess: () => {
      setEditingLesson(null)
      queryClient.invalidateQueries({ queryKey: ['instructor-modules', courseId] })
      toast.success('Lección guardada')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteLesson = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase.from('lessons').delete().eq('id', lessonId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-modules', courseId] })
      toast.success('Lección eliminada')
    },
  })

  function toggleModule(id: string) {
    setExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function startEdit(lesson: { id: string; title: string; video_url: string | null; video_provider: string | null; is_free_preview: boolean | null }) {
    setEditingLesson(lesson.id)
    setEditValues({
      title: lesson.title,
      videoUrl: lesson.video_url ?? '',
      provider: lesson.video_provider ?? 'youtube',
      isFreePreview: lesson.is_free_preview ?? false,
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="font-heading font-semibold text-gray-900">Módulos y lecciones</h3>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
        <SortableContext items={modules?.map(m => m.id) ?? []} strategy={verticalListSortingStrategy}>
          {modules?.map(module => (
            <SortableModule key={module.id} id={module.id}>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden ml-6">
                <div className="flex items-center justify-between p-4">
                  <button
                    className="flex items-center gap-2 flex-1 text-left"
                    onClick={() => toggleModule(module.id)}
                  >
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedModules.has(module.id) ? 'rotate-180' : ''}`} />
                    <span className="font-medium text-gray-900">{module.title}</span>
                    <span className="text-xs text-gray-500">({module.lessons?.length ?? 0} lecciones)</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-500 hover:text-destructive shrink-0"
                    onClick={() => deleteModule.mutate(module.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {expandedModules.has(module.id) && (
                  <div className="border-t border-gray-200 p-4 space-y-3">
                    {/* Lecciones existentes */}
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleLessonDragEnd(module.id)}
                    >
                      <SortableContext
                        items={[...(module.lessons ?? [])].sort((a, b) => a.order_index - b.order_index).map(l => l.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {[...(module.lessons ?? [])].sort((a, b) => a.order_index - b.order_index).map(lesson => (
                          <div key={lesson.id}>
                            {editingLesson === lesson.id ? (
                              /* Edit form */
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                                <Input
                                  autoFocus
                                  placeholder="Título de la lección"
                                  value={editValues.title}
                                  onChange={e => setEditValues(prev => ({ ...prev, title: e.target.value }))}
                                  className="h-8 text-sm"
                                />
                                <div className="flex gap-2">
                                  <Select
                                    value={editValues.provider}
                                    onValueChange={v => setEditValues(prev => ({ ...prev, provider: v }))}
                                  >
                                    <SelectTrigger className="w-28 h-8 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="youtube">YouTube</SelectItem>
                                      <SelectItem value="vimeo">Vimeo</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    placeholder="URL del video"
                                    value={editValues.videoUrl}
                                    onChange={e => setEditValues(prev => ({ ...prev, videoUrl: e.target.value }))}
                                    className="flex-1 h-8 text-sm"
                                  />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={editValues.isFreePreview}
                                    onChange={e => setEditValues(prev => ({ ...prev, isFreePreview: e.target.checked }))}
                                    className="rounded"
                                  />
                                  Vista previa gratuita
                                </label>

                                {/* Resources section */}
                                <LessonResources lessonId={lesson.id} />

                                <div className="flex gap-2 pt-1">
                                  <Button
                                    size="sm"
                                    variant="hero"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => updateLesson.mutate(lesson.id)}
                                    disabled={updateLesson.isPending}
                                  >
                                    <Check className="w-3 h-3" />
                                    Guardar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs gap-1 text-gray-500"
                                    onClick={() => setEditingLesson(null)}
                                  >
                                    <X className="w-3 h-3" />
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              /* Display row */
                              <SortableLesson id={lesson.id}>
                                <div className="flex items-center gap-3 bg-gray-100/50 rounded-lg px-3 py-2 group">
                                  <Video className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                  <span className="text-sm text-gray-700 flex-1 truncate">{lesson.title}</span>
                                  {lesson.is_free_preview && (
                                    <span className="text-xs text-primary font-medium shrink-0">Preview</span>
                                  )}
                                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-7 h-7 text-gray-400 hover:text-gray-700"
                                      onClick={() => startEdit(lesson)}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-7 h-7 text-gray-400 hover:text-destructive"
                                      onClick={() => deleteLesson.mutate(lesson.id)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </SortableLesson>
                            )}
                          </div>
                        ))}
                      </SortableContext>
                    </DndContext>

                    {/* Agregar lección */}
                    <div className="space-y-2 pt-2 border-t border-border/10">
                      <Label className="text-xs text-gray-500">Nueva lección</Label>
                      <Input
                        placeholder="Título de la lección"
                        value={newLessons[module.id]?.title ?? ''}
                        onChange={e => setNewLessons(prev => ({ ...prev, [module.id]: { ...prev[module.id], title: e.target.value, videoUrl: prev[module.id]?.videoUrl ?? '', provider: prev[module.id]?.provider ?? 'youtube' } }))}
                        className="bg-gray-100 border-border/50 text-foreground text-sm h-8"
                      />
                      <div className="flex gap-2">
                        <Select
                          value={newLessons[module.id]?.provider ?? 'youtube'}
                          onValueChange={v => setNewLessons(prev => ({ ...prev, [module.id]: { ...prev[module.id], provider: v, title: prev[module.id]?.title ?? '', videoUrl: prev[module.id]?.videoUrl ?? '' } }))}
                        >
                          <SelectTrigger className="w-28 h-8 bg-gray-100 border-border/50 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="vimeo">Vimeo</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="URL del video"
                          value={newLessons[module.id]?.videoUrl ?? ''}
                          onChange={e => setNewLessons(prev => ({ ...prev, [module.id]: { ...prev[module.id], videoUrl: e.target.value, title: prev[module.id]?.title ?? '', provider: prev[module.id]?.provider ?? 'youtube' } }))}
                          className="flex-1 bg-gray-100 border-border/50 text-foreground text-sm h-8"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="hero-outline"
                        className="w-full h-8 text-xs"
                        onClick={() => addLesson.mutate(module.id)}
                        disabled={addLesson.isPending}
                      >
                        <Plus className="w-3 h-3" />
                        Agregar lección
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </SortableModule>
          ))}
        </SortableContext>
      </DndContext>

      {/* Agregar módulo */}
      <div className="flex gap-2">
        <Input
          placeholder="Título del nuevo módulo"
          value={newModuleTitle}
          onChange={e => setNewModuleTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addModule.mutate()}
          className="bg-gray-100 border-border/50 text-foreground"
        />
        <Button variant="hero-outline" onClick={() => addModule.mutate()} disabled={addModule.isPending}>
          <Plus className="w-4 h-4" />
          Módulo
        </Button>
      </div>
    </div>
  )
}
