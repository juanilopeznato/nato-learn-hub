import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Edit2, Check, X, Star, BookOpen, Zap } from 'lucide-react'
import { toast } from 'sonner'

const ACTION_LABELS: Record<string, string> = {
  complete_lesson:   '✅ Completó una lección',
  post_community:    '📝 Publicó en la comunidad',
  comment_lesson:    '💬 Comentó en una lección',
  comment_community: '💬 Comentó en la comunidad',
}

const LEVEL_LABELS = ['', 'Aprendiz', 'Explorador', 'Avanzado', 'Experto', 'Maestro']

function LevelBadge({ level }: { level: number }) {
  const colors = ['', 'bg-gray-100 text-gray-600', 'bg-blue-50 text-blue-600', 'bg-purple-50 text-purple-600', 'bg-orange-50 text-orange-600', 'bg-yellow-50 text-yellow-700']
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[level] ?? colors[1]}`}>
      Nv. {level} · {LEVEL_LABELS[level] ?? ''}
    </span>
  )
}

export default function MemberProfile() {
  const { profileId } = useParams<{ profileId: string }>()
  const { profile: currentProfile, tenant } = useAuth()
  const queryClient = useQueryClient()
  const isOwnProfile = currentProfile?.id === profileId
  const [editingBio, setEditingBio] = useState(false)
  const [bioValue, setBioValue] = useState('')

  const { data: member, isLoading } = useQuery({
    queryKey: ['member-profile', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, points, level, created_at')
        .eq('id', profileId!)
        .single()
      if (error) throw error
      return data
    },
  })

  const { data: enrollments = [] } = useQuery({
    queryKey: ['member-enrollments', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('id, courses(title, slug)')
        .eq('student_id', profileId!)
        .in('mp_status', ['free', 'approved'])
      return data ?? []
    },
  })

  const { data: activity = [] } = useQuery({
    queryKey: ['member-activity', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await supabase
        .from('points_log')
        .select('action, delta, created_at')
        .eq('profile_id', profileId!)
        .order('created_at', { ascending: false })
        .limit(10)
      return data ?? []
    },
  })

  const saveBio = useMutation({
    mutationFn: async () => {
      if (!isOwnProfile) throw new Error('No autorizado')
      const { error } = await supabase.from('profiles').update({ bio: bioValue }).eq('id', profileId!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-profile', profileId] })
      setEditingBio(false)
      toast.success('Bio actualizada')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando perfil...</span>
        </div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-gray-900 font-medium">Perfil no encontrado</p>
          <Link to="/dashboard" className="text-primary text-sm hover:underline">Volver al dashboard</Link>
        </div>
      </div>
    )
  }

  const initials = member.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:block">Volver</span>
          </Link>
          <div className="ml-auto">
            <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenant?.name ?? ''} className="h-6 w-auto object-contain" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-5">
        {/* Profile card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-4">
            {member.avatar_url ? (
              <img src={member.avatar_url} alt={member.full_name} className="w-16 h-16 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-primary">{initials}</span>
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-1.5">
              <h1 className="font-heading text-xl font-bold text-gray-900">{member.full_name}</h1>
              <LevelBadge level={member.level ?? 1} />
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-500" />
                  {member.points ?? 0} puntos totales
                </span>
                <span className="text-gray-300">·</span>
                <span>Desde {formatDistanceToNow(new Date(member.created_at), { addSuffix: true, locale: es })}</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            {editingBio ? (
              <div className="space-y-2">
                <Textarea
                  value={bioValue}
                  onChange={e => setBioValue(e.target.value)}
                  placeholder="Contá algo sobre vos..."
                  className="resize-none text-sm border-gray-200 focus:border-primary"
                  maxLength={500}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setEditingBio(false)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="hero" size="sm" onClick={() => saveBio.mutate()} disabled={saveBio.isPending}>
                    <Check className="w-3.5 h-3.5" />
                    Guardar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="flex-1 text-sm text-gray-600 leading-relaxed">
                  {member.bio ?? (isOwnProfile ? 'Agregá una bio para que te conozcan mejor.' : '')}
                </p>
                {isOwnProfile && (
                  <button
                    className="text-gray-400 hover:text-primary transition-colors shrink-0 mt-0.5"
                    onClick={() => { setBioValue(member.bio ?? ''); setEditingBio(true) }}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Enrolled courses */}
        {enrollments.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <BookOpen className="w-4 h-4 text-primary" />
              Cursos inscriptos
            </h3>
            <div className="flex flex-wrap gap-2">
              {enrollments.map((e: any) => e.courses && (
                <Link
                  key={e.id}
                  to={`/courses/${e.courses.slug}`}
                  className="text-xs px-3 py-1.5 bg-primary/5 text-primary rounded-full hover:bg-primary/10 transition-colors font-medium"
                >
                  {e.courses.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        {activity.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Zap className="w-4 h-4 text-yellow-500" />
              Actividad reciente
            </h3>
            <div className="space-y-2">
              {activity.map((a: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-600">{ACTION_LABELS[a.action] ?? a.action}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-primary">+{a.delta} pts</span>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
