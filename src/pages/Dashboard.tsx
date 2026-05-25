import { useState, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, LogOut, BookOpen, User, Users, Play, MessageSquare } from 'lucide-react'
import { StreakBadge } from '@/components/StreakBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { EnrolledCourseCard } from '@/components/dashboard/EnrolledCourseCard'
import { Leaderboard } from '@/components/dashboard/Leaderboard'
// NotificationBell lazy: solo se carga cuando el shell del dashboard está montado;
// fuera del critical path inicial.
const NotificationBell = lazy(() => import('@/components/NotificationBell').then(m => ({ default: m.NotificationBell })))
import OnboardingModal from '@/components/OnboardingModal'
import { ThemeToggle } from '@/components/ThemeToggle'
import { SmartImage, SmartAvatar } from '@/components/SmartImage'

interface ProfileExtras {
  onboarding_completed?: boolean | null
  points?: number | null
  level?: number | null
  streak_days?: number | null
}
interface CommunityPostRow {
  id: string
  title: string
  body: string | null
  category: string
  created_at: string
  author: { full_name: string | null; avatar_url: string | null } | null
}

export default function Dashboard() {
  const { profile, tenant, signOut } = useAuth()
  const profileExtras = profile as (typeof profile & ProfileExtras) | null
  const queryClient = useQueryClient()
  const [onboardingDone, setOnboardingDone] = useState(false)
  const showOnboarding = profile && !profileExtras?.onboarding_completed && !onboardingDone

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
  const continueCourse = continueEnrollment?.courses as unknown as { id: string; title: string; slug: string; thumbnail_url: string | null } | null
  const continueProgress = continueEnrollment ? progressMap?.[continueEnrollment.id] : null

  const { data: communityPosts } = useQuery<CommunityPostRow[]>({
    queryKey: ['community-preview', tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('community_posts')
        .select('id, title, body, category, created_at, author:profiles(full_name, avatar_url)')
        .eq('tenant_id', tenant!.id)
        .order('created_at', { ascending: false })
        .limit(3)
      return (data ?? []) as unknown as CommunityPostRow[]
    },
  })

  const firstName = profile?.full_name?.split(' ')[0] ?? 'estudiante'

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Header glass */}
      <header className="glass-light sticky top-0 z-40">
        <div className="container h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenant?.name ?? 'NATO University'} className="h-7 w-auto object-contain transition-transform group-hover:scale-105" loading="lazy" decoding="async" />
          </Link>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
              <Link to="/community">
                <Users aria-hidden />
                Comunidad
              </Link>
            </Button>
            {profile?.id && (
              <Suspense fallback={<div className="w-8 h-8" aria-hidden />}>
                <NotificationBell profileId={profile.id} />
              </Suspense>
            )}
            <div className="hidden sm:flex items-center gap-3 text-sm pl-2 ml-2 border-l border-border/60">
              <Link to="/profile" className="flex items-center gap-2 group" title="Editar perfil">
                {profile?.avatar_url ? (
                  <SmartAvatar src={profile.avatar_url} alt={profile.full_name ?? ''} size={28} />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <User className="w-3.5 h-3.5 text-primary" aria-hidden />
                  </span>
                )}
                <span className="text-foreground/80 group-hover:text-foreground transition-colors">{profile?.full_name}</span>
              </Link>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-primary tabular-nums">{profileExtras?.points ?? 0} pts</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">Nv.{profileExtras?.level ?? 1}</span>
                <StreakBadge streak={profileExtras?.streak_days ?? 0} size="sm" />
              </div>
            </div>
            <ThemeToggle className="hidden md:inline-flex" />
            <Button variant="ghost" size="icon-sm" onClick={signOut} aria-label="Cerrar sesión">
              <LogOut />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-10 lg:py-12 space-y-10 max-w-6xl">
        {/* Greeting */}
        <div>
          <h1 className="font-heading text-display-md md:text-display-lg text-foreground tracking-tight">
            Hola, {firstName} 👋
          </h1>
          <p className="text-muted-foreground mt-1.5">
            {enrollments?.length
              ? `Tenés ${enrollments.length} curso${enrollments.length > 1 ? 's' : ''} activo${enrollments.length > 1 ? 's' : ''}`
              : 'Todavía no empezaste ningún curso'}
          </p>
        </div>

        {/* "Continuar" banner — solo si hay progreso activo */}
        {continueEnrollment && continueCourse && continueProgress && (
          <div className="bg-mesh-purple rounded-2xl overflow-hidden border border-primary/15">
            <div className="flex items-center gap-5 p-5 lg:p-6">
              {continueCourse.thumbnail_url ? (
                <SmartImage
                  src={continueCourse.thumbnail_url}
                  alt={continueCourse.title}
                  size="thumb"
                  className="w-20 h-16 object-cover rounded-xl shrink-0 hidden sm:block shadow-md"
                />
              ) : (
                <div className="w-20 h-16 bg-primary/15 rounded-xl flex items-center justify-center shrink-0 hidden sm:block">
                  <BookOpen className="w-7 h-7 text-primary" aria-hidden />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-eyebrow text-primary uppercase">Continuar aprendiendo</p>
                <h3 className="font-heading text-base font-semibold text-foreground truncate">{continueCourse.title}</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-background/80 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500 ease-apple"
                      style={{ width: `${Math.round(Number(continueProgress.percent))}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
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
              <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Comunidad
              </h2>
              <Link to="/community" className="text-sm text-primary hover:underline flex items-center gap-1">
                Ver todo <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-2">
              {communityPosts.map(post => {
                const author = post.author
                const initials = (author?.full_name ?? 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                return (
                  <Link
                    key={post.id}
                    to="/community"
                    className="flex items-start gap-3 bg-card border border-border/40 rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all group"
                  >
                    <div className="mt-0.5">
                      <SmartAvatar
                        src={author?.avatar_url ?? null}
                        alt={author?.full_name ?? ''}
                        size={32}
                        fallbackInitials={initials}
                        className="shrink-0 bg-primary/10 text-primary"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{post.title}</p>
                      {post.body && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{post.body}</p>
                      )}
                    </div>
                    <MessageSquare className="w-4 h-4 text-foreground/85 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
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
              <div key={i} className="bg-card rounded-xl h-48 animate-pulse border border-border/40" />
            ))}
          </div>
        ) : enrollments && enrollments.length > 0 ? (
          <section className="space-y-4">
            <h2 className="font-heading text-lg font-semibold text-foreground">Mis cursos</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrollments.map(enrollment => {
                const course = enrollment.courses as unknown as { id: string; title: string; slug: string; thumbnail_url: string | null } | null
                if (!course) return null
                const progress = progressMap?.[enrollment.id] ?? { percent: 0, completed: 0, total: 0 }
                return (
                  <EnrolledCourseCard
                    key={enrollment.id}
                    enrollmentId={enrollment.id}
                    courseId={course.id}
                    courseTitle={course.title}
                    courseSlug={course.slug}
                    thumbnailUrl={course.thumbnail_url ?? null}
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
          <div className="bg-card rounded-2xl p-12 text-center space-y-4 border border-border/40">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto" aria-hidden>
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-heading text-xl font-semibold text-foreground">
              Tu lista está vacía
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Tenés <strong>{(tenant as { name?: string } | null)?.name ?? 'la escuela'}</strong> entera para explorar. Hay cursos gratuitos para arrancar sin pagar.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <Button variant="hero" asChild>
                <Link to="/courses">
                  Ver cursos disponibles
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/community">
                  Ver la comunidad
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {tenant && (
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-semibold text-foreground">Ranking mensual</h2>
            <Leaderboard tenantId={tenant.id} currentProfileId={profile?.id} />
          </section>
        )}
      </main>

      {/* Onboarding modal — solo en el primer login */}
      {showOnboarding && tenant && (
        <OnboardingModal
          profileId={profile.id}
          tenantId={tenant.id}
          onComplete={() => {
            setOnboardingDone(true)
            queryClient.invalidateQueries({ queryKey: ['profile'] })
          }}
        />
      )}
    </div>
  )
}
