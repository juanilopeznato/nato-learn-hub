import { useState } from 'react'
import { format, isPast } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, Plus, X, ExternalLink, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

type EventType = 'live_session' | 'webinar' | 'deadline' | 'other'

interface CalendarEvent {
  id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  event_type: EventType
  meeting_url: string | null
}

const TYPE_COLORS: Record<EventType, string> = {
  live_session: 'border-l-purple-500',
  webinar: 'border-l-blue-500',
  deadline: 'border-l-red-500',
  other: 'border-l-gray-400',
}

const TYPE_BADGES: Record<EventType, string> = {
  live_session: 'bg-purple-100 text-purple-700',
  webinar: 'bg-blue-100 text-blue-700',
  deadline: 'bg-red-100 text-red-700',
  other: 'bg-gray-100 text-gray-600',
}

const TYPE_LABELS: Record<EventType, string> = {
  live_session: 'Clase en vivo',
  webinar: 'Webinar',
  deadline: 'Entrega',
  other: 'Otro',
}

interface Props {
  courseId: string
  canManage?: boolean
  compact?: boolean // smaller version for sidebar
}

export function CourseCalendar({ courseId, canManage = false, compact = false }: Props) {
  const { profile, tenant } = useAuth()
  const queryClient = useQueryClient()
  const [showDialog, setShowDialog] = useState(false)
  const [showPast, setShowPast] = useState(false)
  const [form, setForm] = useState({
    title: '',
    event_type: 'live_session' as EventType,
    starts_at: '',
    ends_at: '',
    description: '',
    meeting_url: '',
  })

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['course-calendar', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data } = await supabase
        .from('calendar_events')
        .select('id, title, description, starts_at, ends_at, event_type, meeting_url')
        .eq('course_id', courseId)
        .order('starts_at')
      return (data ?? []) as CalendarEvent[]
    },
  })

  const createEvent = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error('Ingresá un título')
      if (!form.starts_at) throw new Error('Ingresá fecha y hora')
      if (!profile || !tenant) throw new Error('Sin sesión')
      const { error } = await supabase.from('calendar_events').insert({
        tenant_id: tenant.id,
        course_id: courseId,
        created_by: profile.id,
        title: form.title.trim(),
        event_type: form.event_type,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        description: form.description.trim() || null,
        meeting_url: form.meeting_url.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setShowDialog(false)
      setForm({ title: '', event_type: 'live_session', starts_at: '', ends_at: '', description: '', meeting_url: '' })
      queryClient.invalidateQueries({ queryKey: ['course-calendar', courseId] })
      toast.success('Clase creada')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-calendar', courseId] })
      toast.success('Evento eliminado')
    },
  })

  const upcoming = events.filter(e => !isPast(new Date(e.starts_at)))
  const past = events.filter(e => isPast(new Date(e.starts_at)))
  const displayed = showPast ? events : upcoming

  if (compact) {
    // Compact version for LessonSidebar
    if (isLoading) return null
    if (upcoming.length === 0) return null

    return (
      <div className="border-t border-gray-100 pt-3 px-4 pb-3 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5" />
          Próximas clases
        </p>
        <div className="space-y-1.5">
          {upcoming.slice(0, 3).map(event => (
            <div key={event.id} className={`border-l-2 pl-2 py-1 ${TYPE_COLORS[event.event_type]}`}>
              <p className="text-xs font-medium text-gray-800 leading-snug line-clamp-1">{event.title}</p>
              <p className="text-xs text-gray-400">
                {format(new Date(event.starts_at), "d MMM 'a las' HH:mm", { locale: es })}
              </p>
              {event.meeting_url && (
                <a
                  href={event.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                >
                  <Video className="w-3 h-3" />
                  Unirse
                </a>
              )}
            </div>
          ))}
          {upcoming.length > 3 && (
            <p className="text-xs text-gray-400">+{upcoming.length - 3} más</p>
          )}
        </div>
      </div>
    )
  }

  // Full version for InstructorCoursePage
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-gray-900">Clases en vivo</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Programá sesiones en vivo, webinars o entregas para los alumnos de este curso.
          </p>
        </div>
        {canManage && (
          <Button variant="hero" size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4" />
            Nueva clase
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : displayed.length === 0 && !showPast ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center space-y-3">
          <CalendarDays className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="text-gray-500 text-sm">No hay clases programadas próximamente.</p>
          {canManage && (
            <Button variant="hero-outline" size="sm" onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4" />
              Programar primera clase
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(event => {
            const inPast = isPast(new Date(event.starts_at))
            return (
              <div
                key={event.id}
                className={`bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4 border-l-4 ${TYPE_COLORS[event.event_type]} ${inPast ? 'opacity-60' : ''}`}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{event.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGES[event.event_type]}`}>
                      {TYPE_LABELS[event.event_type]}
                    </span>
                    {inPast && <Badge variant="secondary" className="text-xs">Pasado</Badge>}
                  </div>
                  <p className="text-sm text-gray-500">
                    {format(new Date(event.starts_at), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })}
                    {event.ends_at && ` — ${format(new Date(event.ends_at), 'HH:mm')}`}
                  </p>
                  {event.description && (
                    <p className="text-sm text-gray-600">{event.description}</p>
                  )}
                  {event.meeting_url && (
                    <a
                      href={event.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Unirse a la reunión
                    </a>
                  )}
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-gray-400 hover:text-destructive"
                    onClick={() => deleteEvent.mutate(event.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {past.length > 0 && !showPast && (
        <button
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => setShowPast(true)}
        >
          Ver {past.length} clase{past.length !== 1 ? 's' : ''} pasada{past.length !== 1 ? 's' : ''}
        </button>
      )}

      {/* Dialog crear evento */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Nueva clase en vivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                placeholder="Ej: Clase 1 — Introducción"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.event_type} onValueChange={v => setForm(p => ({ ...p, event_type: v as EventType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live_session">Clase en vivo</SelectItem>
                  <SelectItem value="webinar">Webinar</SelectItem>
                  <SelectItem value="deadline">Entrega / Deadline</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha y hora inicio</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={e => setForm(p => ({ ...p, starts_at: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fin (opcional)</Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Link de reunión (Google Meet, Zoom…)</Label>
              <Input
                placeholder="https://meet.google.com/..."
                value={form.meeting_url}
                onChange={e => setForm(p => ({ ...p, meeting_url: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción (opcional)</Label>
              <Input
                placeholder="Temas que se van a ver..."
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="hero" className="flex-1" onClick={() => createEvent.mutate()} disabled={createEvent.isPending}>
                {createEvent.isPending ? 'Guardando...' : 'Crear clase'}
              </Button>
              <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
