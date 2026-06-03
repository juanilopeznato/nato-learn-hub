import { useState } from 'react'
import { Plus, Trash2, ChevronDown, Video, Pencil, X, Check, GripVertical, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
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
  description: string
  body: string
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
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing text-muted-foreground/80 hover:text-foreground/70 p-1 touch-none"
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
        className="shrink-0 cursor-grab active:cursor-grabbing text-foreground/85 hover:text-muted-foreground mt-2 touch-none"
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
    <div className="border-t border-primary/30 pt-2 mt-2 space-y-2">
      <p className="text-xs font-semibold text-foreground/70">Recursos descargables</p>

      {resources && resources.length > 0 && (
        <div className="space-y-1">
          {resources.map(r => (
            <div key={r.id} className="flex items-center gap-2 bg-card rounded px-2 py-1">
              <FileText className="w-3 h-3 text-muted-foreground/80 shrink-0" />
              <span className="text-xs text-foreground/85 flex-1 truncate">{r.title}</span>
              <button
                type="button"
                className="text-muted-foreground/80 hover:text-destructive shrink-0"
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
  const [editValues, setEditValues] = useState<LessonEditState>({ title: '', description: '', body: '', videoUrl: '', provider: 'youtube', isFreePreview: false })

  // Módulo edit state — editar title + description + promise del módulo inline
  const [editingModule, setEditingModule] = useState<string | null>(null)
  const [editModuleValues, setEditModuleValues] = useState<{ title: string; description: string; promise: string }>({ title: '', description: '', promise: '' })

  // Bulk URL import — pegar 25 URLs y asignarlas en orden M1L1 → M5L5
  const [bulkImportOpen, setBulkImportOpen] = useState(false)
  const [bulkUrls, setBulkUrls] = useState('')
  const [bulkProvider, setBulkProvider] = useState<'youtube' | 'vimeo' | 'supabase'>('youtube')
  // ConfirmDialog state — un único dialog reusado para módulos y lecciones
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; description?: string; onConfirm: () => void } | null>(null)

  const { data: modules } = useQuery({
    queryKey: ['instructor-modules', courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('modules')
        .select('*, lessons (id, title, description, body, video_url, video_provider, order_index, is_free_preview)')
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

  const updateModule = useMutation({
    mutationFn: async (moduleId: string) => {
      if (!editModuleValues.title.trim()) throw new Error('Ingresá un título')
      const { error } = await supabase.from('modules').update({
        title: editModuleValues.title.trim(),
        description: editModuleValues.description.trim() || null,
        promise: editModuleValues.promise.trim() || null,
      }).eq('id', moduleId)
      if (error) throw error
    },
    onSuccess: () => {
      setEditingModule(null)
      queryClient.invalidateQueries({ queryKey: ['instructor-modules', courseId] })
      toast.success('Módulo guardado')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function startEditModule(module: { id: string; title: string; description?: string | null; promise?: string | null }) {
    setEditingModule(module.id)
    setEditModuleValues({
      title: module.title,
      description: module.description ?? '',
      promise: module.promise ?? '',
    })
  }

  // Bulk import: 1 URL por línea, asigna en orden M1L1 → M5L5
  const bulkImport = useMutation({
    mutationFn: async () => {
      if (!modules) throw new Error('No hay módulos cargados')
      const urls = bulkUrls.split('\n').map(s => s.trim()).filter(Boolean)
      if (urls.length === 0) throw new Error('Pegá al menos 1 URL')

      // Aplanar lecciones en orden estricto
      const ordered = [...modules]
        .sort((a, b) => a.order_index - b.order_index)
        .flatMap(m => [...(m.lessons ?? [])].sort((a, b) => a.order_index - b.order_index))

      if (urls.length > ordered.length) {
        throw new Error(`Pegaste ${urls.length} URLs pero el curso solo tiene ${ordered.length} lecciones`)
      }

      // Actualizar en lote — paralelo de a 5 para no saturar
      const results = await Promise.allSettled(
        urls.map((url, i) =>
          supabase.from('lessons').update({
            video_url: url,
            video_provider: bulkProvider,
          }).eq('id', ordered[i].id)
        )
      )
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${failed} de ${urls.length} fallaron`)
      return urls.length
    },
    onSuccess: (count) => {
      setBulkImportOpen(false)
      setBulkUrls('')
      queryClient.invalidateQueries({ queryKey: ['instructor-modules', courseId] })
      toast.success(`${count} URLs asignadas a las lecciones`)
    },
    onError: (e: Error) => toast.error(e.message),
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
        description: editValues.description.trim() || null,
        body: editValues.body.trim() || null,
        video_url: editValues.videoUrl || null,
        video_provider: (editValues.provider as 'youtube' | 'vimeo' | 'supabase') || null,
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

  function startEdit(lesson: { id: string; title: string; description?: string | null; body?: string | null; video_url: string | null; video_provider: string | null; is_free_preview: boolean | null }) {
    setEditingLesson(lesson.id)
    setEditValues({
      title: lesson.title,
      description: lesson.description ?? '',
      body: lesson.body ?? '',
      videoUrl: lesson.video_url ?? '',
      provider: lesson.video_provider ?? 'youtube',
      isFreePreview: lesson.is_free_preview ?? false,
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-heading font-semibold text-foreground">Módulos y lecciones</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setBulkImportOpen(true)}
          className="gap-2"
        >
          <Video className="w-3.5 h-3.5" />
          Importar URLs en bulk
        </Button>
      </div>

      {/* Modal bulk import — pegar 25 URLs y asignarlas en orden */}
      {bulkImportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4"
          onClick={() => setBulkImportOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">Importar URLs en bulk</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Pegá <strong>una URL por línea</strong>, en el orden M1L1, M1L2, ..., M5L5. Se asignan automáticamente a cada lección.
              </p>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-foreground/80 space-y-1">
              <p className="font-semibold text-primary">💡 Flujo recomendado:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
                <li>Subí los videos a YouTube como Unlisted (en orden M1L1 → M5L5)</li>
                <li>En YouTube Studio, abrí cada video → copiá el URL</li>
                <li>Pegá las 25 URLs acá, una por línea</li>
              </ol>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Provider</label>
              <Select value={bulkProvider} onValueChange={v => setBulkProvider(v as 'youtube' | 'vimeo' | 'supabase')}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="vimeo">Vimeo</SelectItem>
                  <SelectItem value="supabase">Supabase Storage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">URLs (una por línea)</label>
              <textarea
                value={bulkUrls}
                onChange={e => setBulkUrls(e.target.value)}
                rows={12}
                placeholder={`https://youtu.be/abc123     ← M1L1\nhttps://youtu.be/def456     ← M1L2\nhttps://youtu.be/ghi789     ← M1L3\n...`}
                className="w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{bulkUrls.split('\n').filter(s => s.trim()).length} URLs detectadas</span>
                <span>{(modules ?? []).reduce((acc, m) => acc + (m.lessons?.length ?? 0), 0)} lecciones disponibles</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setBulkImportOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="hero"
                onClick={() => bulkImport.mutate()}
                disabled={bulkImport.isPending || !bulkUrls.trim()}
              >
                {bulkImport.isPending ? 'Asignando...' : 'Asignar URLs a lecciones'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
        <SortableContext items={modules?.map(m => m.id) ?? []} strategy={verticalListSortingStrategy}>
          {modules?.map((module, moduleIdx) => (
            <SortableModule key={module.id} id={module.id}>
              <div className="bg-card border border-border/60 rounded-xl overflow-hidden ml-6 shadow-xs hover:border-border transition-colors">
                {editingModule === module.id ? (
                  /* Edit form del módulo — title + description + promise */
                  <div className="bg-primary/5 border-b border-primary/20 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                        {moduleIdx + 1}
                      </span>
                      <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">Editando módulo</span>
                    </div>

                    <Input
                      autoFocus
                      placeholder="Título del módulo"
                      value={editModuleValues.title}
                      onChange={e => setEditModuleValues(prev => ({ ...prev, title: e.target.value }))}
                      className="h-9 text-sm font-semibold"
                    />

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Descripción del módulo</label>
                      <textarea
                        placeholder="¿De qué se trata este módulo? (qué temas se cubren — máx 300 caracteres)"
                        value={editModuleValues.description}
                        onChange={e => setEditModuleValues(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        maxLength={350}
                        className="w-full resize-none rounded-md border border-border/60 bg-card px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                      />
                      <span className="text-[10px] text-muted-foreground tabular-nums">{editModuleValues.description.length}/350</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Transformación / Promesa</label>
                      <Input
                        placeholder="De [estado inicial] a [estado final] — ej: De vestirte por hábito, a usar tu imagen estratégicamente"
                        value={editModuleValues.promise}
                        onChange={e => setEditModuleValues(prev => ({ ...prev, promise: e.target.value }))}
                        maxLength={180}
                        className="h-9 text-sm italic"
                      />
                      <span className="text-[10px] text-muted-foreground tabular-nums">{editModuleValues.promise.length}/180</span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="hero"
                        className="h-8 text-xs gap-1"
                        onClick={() => updateModule.mutate(module.id)}
                        disabled={updateModule.isPending}
                      >
                        <Check className="w-3 h-3" />
                        Guardar módulo
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => setEditingModule(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                <div className="flex items-start justify-between p-4 gap-2">
                  <button
                    className="flex items-start gap-3 flex-1 text-left min-w-0"
                    onClick={() => toggleModule(module.id)}
                  >
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 tabular-nums mt-0.5">
                      {moduleIdx + 1}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 mt-1.5 ${expandedModules.has(module.id) ? 'rotate-180' : ''}`} aria-hidden />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground line-clamp-1">{module.title}</span>
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">· {module.lessons?.length ?? 0} {(module.lessons?.length ?? 0) === 1 ? 'lección' : 'lecciones'}</span>
                      </div>
                      {module.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{module.description}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground/60 italic">Sin descripción · click "Editar" para agregarla</p>
                      )}
                      {module.promise && (
                        <p className="text-[11px] text-primary/80 italic line-clamp-1">→ {module.promise}</p>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Editar módulo ${module.title}`}
                      onClick={() => startEditModule(module)}
                    >
                      <Pencil className="w-4 h-4" aria-hidden />
                    </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    aria-label={`Eliminar módulo ${module.title}`}
                    onClick={() => {
                      const lessonCount = module.lessons?.length ?? 0
                      setConfirmState({
                        open: true,
                        title: `¿Eliminar el módulo "${module.title}"?`,
                        description: lessonCount > 0
                          ? `Se van a borrar también sus ${lessonCount} lección${lessonCount === 1 ? '' : 'es'}. Esta acción no se puede deshacer.`
                          : 'Esta acción no se puede deshacer.',
                        onConfirm: () => deleteModule.mutate(module.id),
                      })
                    }}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </Button>
                  </div>
                </div>
                )}

                {expandedModules.has(module.id) && (
                  <div className="border-t border-border/60 p-4 space-y-3">
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
                              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 space-y-3">
                                <Input
                                  autoFocus
                                  placeholder="Título de la lección"
                                  value={editValues.title}
                                  onChange={e => setEditValues(prev => ({ ...prev, title: e.target.value }))}
                                  className="h-9 text-sm font-medium"
                                />

                                {/* Descripción corta — aparece antes del video */}
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Descripción corta</label>
                                  <textarea
                                    placeholder="Gancho de 1-2 líneas: ¿qué va a aprender el alumno en esta clase? (máx 200 caracteres)"
                                    value={editValues.description}
                                    onChange={e => setEditValues(prev => ({ ...prev, description: e.target.value }))}
                                    rows={2}
                                    maxLength={250}
                                    className="w-full resize-none rounded-md border border-border/60 bg-card px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                                  />
                                  <span className="text-[10px] text-muted-foreground tabular-nums">{editValues.description.length}/250</span>
                                </div>

                                {/* Body markdown — aparece debajo del video */}
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Explicación amigable (markdown)</label>
                                  <textarea
                                    placeholder={`Notas, conceptos clave y takeaways. Soporta markdown:\n\n## Lo que vas a aprender\n- Punto 1\n- Punto 2\n\n## Para reflexionar\n¿Pregunta clave?\n\n## Aplicalo ya\nAcción concreta para esta semana.`}
                                    value={editValues.body}
                                    onChange={e => setEditValues(prev => ({ ...prev, body: e.target.value }))}
                                    rows={8}
                                    className="w-full resize-y rounded-md border border-border/60 bg-card px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                                  />
                                </div>

                                <div className="flex gap-2 pt-1">
                                  <Select
                                    value={editValues.provider}
                                    onValueChange={v => setEditValues(prev => ({ ...prev, provider: v }))}
                                  >
                                    <SelectTrigger className="w-28 h-8 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="supabase">Supabase</SelectItem>
                                      <SelectItem value="youtube">YouTube</SelectItem>
                                      <SelectItem value="vimeo">Vimeo</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    placeholder={editValues.provider === 'supabase' ? 'path en bucket (auto)' : 'URL del video'}
                                    value={editValues.videoUrl}
                                    onChange={e => setEditValues(prev => ({ ...prev, videoUrl: e.target.value }))}
                                    className="flex-1 h-8 text-sm"
                                  />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-foreground/85 cursor-pointer select-none">
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
                                    className="h-7 text-xs gap-1 text-muted-foreground"
                                    onClick={() => setEditingLesson(null)}
                                  >
                                    <X className="w-3 h-3" />
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              /* Display row — clickeable entero abre edit, badges visibles muestran qué tiene cargado */
                              <SortableLesson id={lesson.id}>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => startEdit(lesson)}
                                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEdit(lesson) } }}
                                  className="flex items-start gap-3 bg-secondary/50 hover:bg-secondary border border-transparent hover:border-border/60 rounded-lg px-3 py-3 group cursor-pointer transition-colors"
                                >
                                  <Video className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
                                  <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-medium text-foreground line-clamp-1">{lesson.title}</span>
                                      {lesson.is_free_preview && (
                                        <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5 shrink-0 uppercase tracking-wide">
                                          Preview
                                        </span>
                                      )}
                                    </div>
                                    {lesson.description ? (
                                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                        {lesson.description}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-muted-foreground/60 italic">Sin descripción · click para agregar</p>
                                    )}
                                    {/* Badges de lo que tiene cargado */}
                                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${lesson.description ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground/60'}`}>
                                        <FileText className="w-2.5 h-2.5" aria-hidden />
                                        Desc
                                      </span>
                                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${lesson.body ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground/60'}`}>
                                        <FileText className="w-2.5 h-2.5" aria-hidden />
                                        Body
                                      </span>
                                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${lesson.video_url ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'}`}>
                                        <Video className="w-2.5 h-2.5" aria-hidden />
                                        {lesson.video_url ? 'Video' : 'Falta video'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-8 h-8 text-muted-foreground hover:text-foreground"
                                      aria-label={`Editar lección ${lesson.title}`}
                                      onClick={() => startEdit(lesson)}
                                    >
                                      <Pencil className="w-3.5 h-3.5" aria-hidden />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-8 h-8 text-muted-foreground hover:text-destructive"
                                      aria-label={`Eliminar lección ${lesson.title}`}
                                      onClick={() => setConfirmState({
                                        open: true,
                                        title: `¿Eliminar la lección "${lesson.title}"?`,
                                        description: 'El progreso de los alumnos en esta lección se perderá. Esta acción no se puede deshacer.',
                                        onConfirm: () => deleteLesson.mutate(lesson.id),
                                      })}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" aria-hidden />
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
                      <Label className="text-xs text-muted-foreground">Nueva lección</Label>
                      <Input
                        placeholder="Título de la lección"
                        value={newLessons[module.id]?.title ?? ''}
                        onChange={e => setNewLessons(prev => ({ ...prev, [module.id]: { ...prev[module.id], title: e.target.value, videoUrl: prev[module.id]?.videoUrl ?? '', provider: prev[module.id]?.provider ?? 'youtube' } }))}
                        className="bg-secondary border-border/50 text-foreground text-sm h-8"
                      />
                      <div className="flex gap-2">
                        <Select
                          value={newLessons[module.id]?.provider ?? 'youtube'}
                          onValueChange={v => setNewLessons(prev => ({ ...prev, [module.id]: { ...prev[module.id], provider: v, title: prev[module.id]?.title ?? '', videoUrl: prev[module.id]?.videoUrl ?? '' } }))}
                        >
                          <SelectTrigger className="w-28 h-8 bg-secondary border-border/50 text-sm">
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
                          className="flex-1 bg-secondary border-border/50 text-foreground text-sm h-8"
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
          className="bg-secondary border-border/50 text-foreground"
        />
        <Button variant="hero-outline" onClick={() => addModule.mutate()} disabled={addModule.isPending}>
          <Plus className="w-4 h-4" />
          Módulo
        </Button>
      </div>

      {/* Confirm dialog reusado para deletes destructivos */}
      <ConfirmDialog
        open={confirmState?.open ?? false}
        onOpenChange={(open) => !open && setConfirmState(null)}
        title={confirmState?.title ?? ''}
        description={confirmState?.description}
        confirmLabel="Sí, eliminar"
        destructive
        onConfirm={() => confirmState?.onConfirm()}
      />
    </div>
  )
}
