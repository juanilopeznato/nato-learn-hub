import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, Plus, X, LogOut, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// DB schema: calendar_events(id, tenant_id, course_id, created_by, title, description, starts_at, ends_at, event_type, meeting_url, is_public, created_at)
type EventType = 'live_session' | 'webinar' | 'deadline' | 'other'

interface CalendarEvent {
  id: string
  tenant_id: string
  course_id: string | null
  created_by: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  event_type: EventType
  meeting_url: string | null
  is_public: boolean
  created_at: string
  course?: { title: string; slug: string } | null
}

const EVENT_COLORS: Record<EventType, string> = {
  live_session: 'border-l-purple-500',
  webinar: 'border-l-blue-500',
  deadline: 'border-l-red-500',
  other: 'border-l-gray-400',
}

const EVENT_BADGE_COLORS: Record<EventType, string> = {
  live_session: 'bg-purple-100 text-purple-700',
  webinar: 'bg-blue-100 text-blue-700',
  deadline: 'bg-red-100 text-red-700',
  other: 'bg-gray-100 text-gray-600',
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  live_session: 'Sesión en vivo',
  webinar: 'Webinar',
  deadline: 'Fecha límite',
  other: 'Otro',
}

interface NewEventForm {
  title: string
  event_type: EventType
  starts_at: string
  ends_at: string
  description: string
  meeting_url: string
  course_id: string
}

const defaultForm: NewEventForm = {
  title: '',
  event_type: 'live_session',
  starts_at: '',
  ends_at: '',
  description: '',
  meeting_url: '',
  course_id: '',
}

export default function Calendar() {
  const { profile, tenant, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState<NewEventForm>(defaultForm)

  const isInstructor = profile?.role === 'instructor' || profile?.role === 'admin' || profile?.role === 'super_admin'

  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar-events', tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*, course:courses(title, slug)')
        .eq('tenant_id', tenant!.id)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
      if (error) throw error
      return (data ?? []) as CalendarEvent[]
    },
  })

  const { data: instructorCourses } = useQuery({
    queryKey: ['instructor-courses-calendar', profile?.id],
    enabled: !!profile?.id && isInstructor,
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, title')
        .eq('instructor_id', profile!.id)
        .order('title')
      return data ?? []
    },
  })

  const createEvent = useMutation({
    mutationFn: async (data: NewEventForm) => {
      if (!profile || !tenant) throw new Error('Sin sesión')
      const { error } = await supabase.from('calendar_events').insert({
        tenant_id: tenant.id,
        created_by: profile.id,
        title: data.title,
        event_type: data.event_type,
        starts_at: data.starts_at,
        ends_at: data.ends_at || null,
        description: data.description || null,
        meeting_url: data.meeting_url || null,
        course_id: data.course_id || null,
        is_public: true,
      } as any)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      setShowDialog(false)
      setForm(defaultForm)
      toast.success('Evento creado')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from('calendar_events').delete().eq('id', eventId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Evento eliminado')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Group events by month
  const groupedEvents: Record<string, CalendarEvent[]> = {}
  events?.forEach(event => {
    const monthKey = format(new Date(event.starts_at), 'MMMM yyyy', { locale: es })
    if (!groupedEvents[monthKey]) groupedEvents[monthKey] = []
    groupedEvents[monthKey].push(event)
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.starts_at) {
      toast.error('El título y la fecha de inicio son obligatorios')
      return
    }
    createEvent.mutate(form)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenant?.name} className="h-8 w-auto object-contain" />
            <Badge variant="secondary" className="text-xs">Calendario</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/instructor">Panel Instructor</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-400">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-gray-900">Calendario</h1>
            <p className="text-gray-500 mt-1">Próximos eventos y sesiones</p>
          </div>
          {isInstructor && (
            <Button variant="hero" onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4" />
              Nuevo evento
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl h-20 animate-pulse" />
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedEvents).map(([month, monthEvents]) => (
              <div key={month} className="space-y-3">
                <h2 className="font-heading font-semibold text-gray-700 text-sm uppercase tracking-wide capitalize">
                  {month}
                </h2>
                <div className="space-y-2">
                  {monthEvents.map(event => (
                    <div
                      key={event.id}
                      className={`bg-white border border-gray-200 border-l-4 ${EVENT_COLORS[event.event_type]} rounded-xl p-4 flex items-start gap-4`}
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{event.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVENT_BADGE_COLORS[event.event_type]}`}>
                            {EVENT_TYPE_LABELS[event.event_type]}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {format(new Date(event.starts_at), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
                        </p>
                        {event.course && (
                          <p className="text-xs text-gray-400">{event.course.title}</p>
                        )}
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        )}
                        {event.meeting_url && (
                          <a
                            href={event.meeting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Unirse
                          </a>
                        )}
                      </div>
                      {isInstructor && (
                        <button
                          onClick={() => deleteEvent.mutate(event.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                          title="Eliminar evento"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-4">
            <CalendarDays className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-gray-500">No hay eventos próximos.</p>
            {isInstructor && (
              <Button variant="hero" onClick={() => setShowDialog(true)}>
                <Plus className="w-4 h-4" />
                Crear primer evento
              </Button>
            )}
          </div>
        )}
      </main>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="font-heading text-gray-900">Nuevo evento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                placeholder="Sesión en vivo — Módulo 3"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de evento</Label>
              <select
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                value={form.event_type}
                onChange={e => setForm(f => ({ ...f, event_type: e.target.value as EventType }))}
              >
                <option value="live_session">Sesión en vivo</option>
                <option value="webinar">Webinar</option>
                <option value="deadline">Fecha límite</option>
                <option value="other">Otro</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Inicio *</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fin (opcional)</Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <textarea
                placeholder="Descripción del evento..."
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>URL de la reunión</Label>
              <Input
                placeholder="https://meet.google.com/..."
                value={form.meeting_url}
                onChange={e => setForm(f => ({ ...f, meeting_url: e.target.value }))}
              />
            </div>

            {instructorCourses && instructorCourses.length > 0 && (
              <div className="space-y-1.5">
                <Label>Curso relacionado (opcional)</Label>
                <select
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                  value={form.course_id}
                  onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
                >
                  <option value="">— Sin curso —</option>
                  {instructorCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="hero" disabled={createEvent.isPending} className="flex-1">
                {createEvent.isPending ? 'Creando...' : 'Crear evento'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setShowDialog(false); setForm(defaultForm) }}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
