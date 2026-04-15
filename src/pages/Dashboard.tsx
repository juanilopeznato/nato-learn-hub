import { Link } from 'react-router-dom'
import { ArrowRight, LogOut, BookOpen, User, Users, Play, MessageSquare } from 'lucide-react'
import { StreakBadge } from '@/components/StreakBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { EnrolledCourseCard } from '@/components/dashboard/EnrolledCourseCard'
import { Leaderboard } from '@/components/dashboard/Leaderboard'
import { NotificationBell } from '@/components/NotificationBell'

export default function Dashboard() {
  const { profile, tenant, signOut } = useAuth()

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['enrollments', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select(`
          id, course_id, last_lesson_id, last_accessed_at,
          courses (id, title, slug, thumbnail_url)
        `)
        .eq('student_id', profile!.id)
        .in('mp_status', ['free', 'approved'])
        .order('last_accessed_at', { ascending: false })
      return data ?? []
    },
  })

  const { data: progressMap } = useQuery({
    queryKey: ['course-progress', profile?.id],
    enabled: !!enrollments?.length,
    queryFn: async () => {
      const enrollmentIds = enrollments!.map(e => e.id)
      const { data } = await supabase
        .from('course_progress')
        .select('*')
        .in('enrollment_id', enrollmentIds)
      const map: Record<string, { percent: number; completed: number; total: number }> = {}
      data?.forEach(p => {
        map[p.enrollment_id!] = {
          percent: p.progress_percent ?? 0,
          completed: p.completed_lessons ?? 0,
          total: p.total_lessons ?? 0,
        }
      })
      return map
    },
  })

  // Último curso accedido con progreso > 0 para el "Continuar" banner
  const continueEnrollment = enrollments?.find(e => {
    const prog = progressMap?.[e.id]
    return e.last_lesson_id && prog && Number(prog.percent) > 0 && Number(prog.percent) < 100
  })
  const continueCourse = continueEnrollment?.courses as { id: string; title: string; slug: string; thumbnail_url: string | null } | null
  const continueProgress = continueEnrollment ? progressMap?.[continueEnrollment.id] : null

  const { data: communityPosts } = useQuery({
    queryKey: ['community-preview', tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('community_posts')
        .select('id, title, body, category, created_at, author:profiles(full_name, avatar_url)')
        .eq('tenant_id', tenant!.id)
        .order('created_at', { ascending: false })
        .limit(3)
      return data ?? []
    },
  })

  const firstName = profile?.full_name?.split(' ')[0] ?? 'estudiante'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenant?.name ?? 'NATO University'} className="h-8 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
              <Link to="/community">
                <Users className="w-4 h-4 mr-1" />
                Comunidad
              </Link>
            </Button>
            {profile?.id && <NotificationBell profileId={profile.id} />}
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500 mr-1">
              <Link to="/profile" className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0" title="Editar perfil">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name ?? ''} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5 text-primary" />
                )}
              </Link>
              <Link to={`/members/${profile?.id}`} className="hover:text-primary transition-colors">
                {profile?.full_name}
              </Link>
              <span className="text-xs font-semibold text-primary">{(profile as any)?.points ?? 0} pts</span>
              <span className="text-xs text-gray-400">Nv.{(profile as any)?.level ?? 1}</span>
              <StreakBadge streak={(profile as any)?.streak_days ?? 0} size="sm" />
            </div>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-400 hover:text-gray-700">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 space-y-10">
        {/* Greeting */}
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">
            Hola, {firstName} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            {enrollments?.length
              ? `Tenés ${enrollments.length} curso${enrollments.length > 1 ? 's' : ''} activo${enrollments.length > 1 ? 's' : ''}`
              : 'Todavía no empezaste ningún curso'}
          </p>
        </div>

        {/* "Continuar" banner — solo si hay progreso activo */}
        {continueEnrollment && continueCourse && continueProgress && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-5 p-5">
              {continueCourse.thumbnail_url ? (
                <img
                  src={continueCourse.thumbnail_url}
                  alt={continueCourse.title}
                  className="w-20 h-16 object-cover rounded-xl shrink-0 hidden sm:block"
                />
              ) : (
                <div className="w-20 h-16 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 hidden sm:block">
                  <BookOpen className="w-7 h-7 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Continuar aprendiendo</p>
                <h3 className="font-heading font-semibold text-gray-900 truncate">{continueCourse.title}</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.round(Number(continueProgress.percent))}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">
                    {continueProgress.completed}/{continueProgress.total} lecciones
                  </span>
                </div>
              </div>
              <Button variant="hero" size="sm" asChild className="shrink-0">
                <Link to={`/learn/${continueCourse.slug}/${continueEnrollment.last_lesson_id}`}>
                  <Play className="w-4 h-4" />
                  Continuar
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Preview comunidad */}
        {communityPosts && communityPosts.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Comunidad
              </h2>
              <Link to="/community" className="text-sm text-primary hover:underline flex items-center gap-1">
                Ver todo <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-2">
              {communityPosts.map((post: any) => {
                const author = post.author as { full_name: string; avatar_url: string | null } | null
                const initials = (author?.full_name ?? 'U').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
                return (
                  <Link
                    key={post.id}
                    to="/community"
                    className="flex items-start gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all group"
                  >
                    {author?.avatar_url ? (
                      <img src={author.avatar_url} alt={author.full_name} className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-primary">{initials}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary transition-colors">{post.title}</p>
                      {post.body && (
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{post.body}</p>
                      )}
                    </div>
                    <MessageSquare className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Cursos */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl h-48 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : enrollments && enrollments.length > 0 ? (
          <section className="space-y-4">
            <h2 className="font-heading text-lg font-semibold text-gray-900">Mis cursos</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrollments.map(enrollment => {
                const course = enrollment.courses as { id: string; title: string; slug: string } | null
                if (!course) return null
                const progress = progressMap?.[enrollment.id] ?? { percent: 0, completed: 0, total: 0 }
                return (
                  <EnrolledCourseCard
                    key={enrollment.id}
                    enrollmentId={enrollment.id}
                    courseId={course.id}
                    courseTitle={course.title}
                    courseSlug={course.slug}
                    progressPercent={Number(progress.percent)}
                    completedLessons={progress.completed}
                    totalLessons={progress.total}
                    studentName={profile?.full_name ?? ''}
                    tenantName={tenant?.name ?? 'NATO University'}
                  />
                )
              })}
            </div>
          </section>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center space-y-4 border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-heading text-xl font-semibold text-gray-900">Empezá a aprender</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Explorá los cursos disponibles y comenzá tu primer path de aprendizaje.
            </p>
            <Button variant="hero" asChild>
              <Link to="/courses">
                Ver cursos disponibles
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        )}

        {/* Leaderboard */}
        {tenant && (
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-semibold text-gray-900">Ranking mensual</h2>
            <Leaderboard tenantId={tenant.id} currentProfileId={profile?.id} />
          </section>
        )}
      </main>
    </div>
  )
}
