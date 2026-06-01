import React, { useState, Suspense } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Eye, LogOut, BookOpen, TrendingUp, Users, Settings, Mail,
  CreditCard, Gift, Trash2, Copy, Check, ChevronDown, Building2,
  ArrowRight, BarChart3, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { CourseForm, type CourseFormData } from '@/components/instructor/CourseForm'
import { SmartImage } from '@/components/SmartImage'
import { toast } from 'sonner'

const KpiDashboard = React.lazy(() => import('@/components/instructor/KpiDashboard').then(m => ({ default: m.KpiDashboard })))

/** Campos del tenant que no están en el tipo base (ver lib/supabase.ts) */
interface TenantExtras {
  plan_name?: string | null
  affiliate_code?: string | null
}

interface InstructorCourseRow {
  id: string
  title: string | null
  slug: string | null
  description: string | null
  thumbnail_url: string | null
  is_free: boolean | null
  is_published: boolean | null
  price: number | null
  created_at: string | null
  category: string | null
  billing_type: 'free' | 'one_time' | 'monthly' | 'annual' | null
}

interface AffiliateCommissionRow {
  id: string
  status: 'paid' | 'pending' | string
  amount_ars: number | null
  referred_tenant_id: string | null
  referred_tenant: { name: string | null } | null
  created_at: string
}

interface ProfileWithTenant {
  id: string
  tenant_id: string
  tenant: { name: string | null } | null
}

export default function InstructorDashboard() {
  const { profile, tenant, allProfiles, signOut, switchSchool } = useAuth()
  const [switching, setSwitching] = useState(false)
  const [schoolMenuOpen, setSchoolMenuOpen] = useState(false)
  const queryClient = useQueryClient()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [deletingCourse, setDeletingCourse] = useState<{ id: string; title: string } | null>(null)
  const [copiedAffiliateUrl, setCopiedAffiliateUrl] = useState(false)

  const tenantExtras = tenant as (typeof tenant & TenantExtras) | null

  const { data: courses, isLoading } = useQuery<InstructorCourseRow[]>({
    queryKey: ['instructor-courses', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', profile!.id)
        .order('created_at', { ascending: false })
      return (data ?? []) as unknown as InstructorCourseRow[]
    },
  })

  const { data: currentPlan } = useQuery({
    queryKey: ['plan', tenantExtras?.plan_name],
    enabled: !!tenantExtras?.plan_name,
    queryFn: async () => {
      const { data } = await supabase.from('plans').select('*').eq('name', tenantExtras!.plan_name!).single()
      return data
    },
  })

  const { data: affiliateCommissions } = useQuery({
    queryKey: ['affiliate-commissions', tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('affiliate_commissions')
        .select('*, referred_tenant:referred_tenant_id(name)')
        .eq('referrer_tenant_id', tenant!.id)
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const { data: enrollmentCounts } = useQuery({
    queryKey: ['enrollment-counts', tenant?.id, courses?.map(c => c.id)],
    enabled: !!courses?.length && !!tenant?.id,
    queryFn: async () => {
      // tenant_id filter explícito: defense in depth — un instructor de otra
      // escuela que conoce los course_ids no debería ver enrollments.
      const { data } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('tenant_id', tenant!.id)
        .in('course_id', courses!.map(c => c.id))
        .in('mp_status', ['free', 'approved'])
      const counts: Record<string, number> = {}
      data?.forEach(e => { counts[e.course_id] = (counts[e.course_id] ?? 0) + 1 })
      return counts
    },
  })

  const courseLimitReached =
    currentPlan?.max_courses !== null &&
    currentPlan?.max_courses !== undefined &&
    (courses?.length ?? 0) >= currentPlan.max_courses

  const affiliateUrl = `${window.location.origin}/signup?ref=${tenantExtras?.affiliate_code ?? ''}`

  const commissions = (affiliateCommissions ?? []) as unknown as AffiliateCommissionRow[]
  const totalEarned = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + (c.amount_ars ?? 0), 0)

  const totalPending = commissions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + (c.amount_ars ?? 0), 0)

  const referredCount = new Set(commissions.map(c => c.referred_tenant_id).filter(Boolean)).size

  const publishedCount = courses?.filter(c => c.is_published).length ?? 0
  const totalStudents = Object.values(enrollmentCounts ?? {}).reduce((a, b) => a + b, 0)
  const firstName = profile?.full_name?.split(' ')[0] ?? 'instructor'

  const createCourse = useMutation({
    mutationFn: async (data: CourseFormData) => {
      if (!profile) throw new Error('Sin sesión')
      const isFree = data.billing_type === 'free'
      const { error } = await supabase.from('courses').insert({
        tenant_id: profile.tenant_id,
        instructor_id: profile.id,
        title: data.title,
        slug: data.slug,
        description: data.description ?? null,
        thumbnail_url: data.thumbnail_url ?? null,
        intro_video_url: data.intro_video_url ?? null,
        price: isFree ? 0 : data.price,
        original_price: isFree ? null : (data.original_price || null),
        currency: 'ARS',
        is_free: isFree,
        billing_type: data.billing_type,
        is_published: data.is_published,
        learning_outcomes: data.learning_outcomes?.filter(Boolean) ?? [],
        for_who: data.for_who ?? null,
        instructor_bio: data.instructor_bio ?? null,
        instructor_avatar_url: data.instructor_avatar_url ?? null,
        faq: data.faq?.filter(f => f.q) ?? [],
        meta_pixel_id: data.meta_pixel_id ?? null,
        nato_produced: data.nato_produced ?? false,
        production_recovery_sales: data.production_recovery_sales ?? 10,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setShowCreateDialog(false)
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] })
      toast.success('Curso creado')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from('courses').update({ is_published: !published }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['instructor-courses'] }),
  })

  const deleteCourse = useMutation({
    mutationFn: async (id: string) => {
      // Recuperar imágenes para limpiar storage después
      const { data: course } = await supabase
        .from('courses')
        .select('thumbnail_url, instructor_avatar_url')
        .eq('id', id)
        .single()

      const { error } = await supabase.from('courses').delete().eq('id', id)
      if (error) throw error

      // Cleanup de storage en background — no bloquea
      if (course) {
        const { deleteImageByUrl } = await import('@/lib/storage')
        void Promise.allSettled([
          (course as { thumbnail_url?: string }).thumbnail_url ? deleteImageByUrl((course as { thumbnail_url: string }).thumbnail_url) : null,
          (course as { instructor_avatar_url?: string }).instructor_avatar_url ? deleteImageByUrl((course as { instructor_avatar_url: string }).instructor_avatar_url) : null,
        ].filter(Boolean) as Promise<void>[])
      }
    },
    onSuccess: () => {
      setDeletingCourse(null)
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] })
      toast.success('Curso eliminado')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="min-h-screen bg-secondary/30">

      {/* Header simplificado */}
      <header className="glass-light sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Logo + school switcher */}
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={tenant?.logo_url ?? '/nato-logo.png'}
              alt={tenant?.name ?? 'NATO University'}
              className="h-8 w-auto object-contain shrink-0"
            />
            {allProfiles.length > 1 ? (
              <div className="relative">
                <button
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 bg-card hover:bg-secondary/30 transition-colors text-sm font-medium text-foreground/85 max-w-[180px]"
                  onClick={() => setSchoolMenuOpen(o => !o)}
                  disabled={switching}
                >
                  <span className="truncate">{tenant?.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                </button>
                {schoolMenuOpen && (
                  <div className="absolute left-0 top-full mt-1 w-56 bg-card border border-border/60 rounded-xl shadow-lg py-1 z-50">
                    <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wide">Mis escuelas</p>
                    {allProfiles.map(p => (
                      <button
                        key={p.id}
                        disabled={switching || p.tenant_id === profile?.tenant_id}
                        onClick={async () => {
                          setSchoolMenuOpen(false)
                          setSwitching(true)
                          try {
                            await switchSchool(p.id)
                            window.location.reload()
                          } catch {
                            toast.error('No se pudo cambiar la escuela')
                            setSwitching(false)
                          }
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/30 flex items-center justify-between gap-2 disabled:opacity-50"
                      >
                        <span className="truncate">{(p as unknown as ProfileWithTenant).tenant?.name ?? 'Escuela'}</span>
                        {p.tenant_id === profile?.tenant_id && (
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                    <div className="border-t border-border/40 mt-1 pt-1">
                      <Link
                        to="/create-school"
                        className="block px-3 py-2 text-sm text-primary hover:bg-primary/5 font-medium"
                        onClick={() => setSchoolMenuOpen(false)}
                      >
                        + Crear nueva escuela
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-sm font-medium text-foreground/85 truncate hidden sm:block">{tenant?.name}</span>
            )}
          </div>

          {/* Nav — solo íconos con tooltip */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild title="Vista de alumno">
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground/85 text-xs gap-1.5">
                Vista alumno
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild title="Email marketing">
              <Link to="/instructor/email" className="text-muted-foreground hover:text-foreground/85">
                <Mail className="w-4 h-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild title="Configuración">
              <Link to="/settings" className="text-muted-foreground hover:text-foreground/85">
                <Settings className="w-4 h-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} title="Cerrar sesión" className="text-muted-foreground/80 hover:text-foreground/70">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6 max-w-5xl">

        {/* Saludo personalizado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Hola, {firstName}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {courses && courses.length > 0
                ? `${publishedCount} curso${publishedCount !== 1 ? 's' : ''} publicado${publishedCount !== 1 ? 's' : ''} · ${totalStudents} alumno${totalStudents !== 1 ? 's' : ''} inscripto${totalStudents !== 1 ? 's' : ''}`
                : 'Seguí estos pasos para lanzar tu primera escuela.'
              }
            </p>
          </div>
          {courses && courses.length > 0 && (
            <Button
              variant="hero"
              onClick={() => setShowCreateDialog(true)}
              disabled={courseLimitReached}
              title={courseLimitReached ? `Límite de ${currentPlan?.max_courses} cursos en tu plan` : undefined}
            >
              <Plus className="w-4 h-4" />
              Nuevo curso
            </Button>
          )}
        </div>

        <Tabs defaultValue="courses">
          <TabsList className="bg-secondary">
            <TabsTrigger value="courses" className="gap-1.5">
              <BookOpen className="w-4 h-4" />
              Mis cursos
            </TabsTrigger>
            <TabsTrigger value="kpis" className="gap-1.5">
              <BarChart3 className="w-4 h-4" />
              Estadísticas
            </TabsTrigger>
            <TabsTrigger value="affiliates" className="gap-1.5">
              <Gift className="w-4 h-4" />
              Afiliados
            </TabsTrigger>
          </TabsList>

          {/* Tab: Mis cursos */}
          <TabsContent value="courses" className="mt-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="bg-card border border-border/60 rounded-xl h-20 animate-pulse" />)}
              </div>
            ) : courses && courses.length > 0 ? (
              <div className="space-y-3">
                {courses.map(course => {
                  const students = enrollmentCounts?.[course.id] ?? 0
                  return (
                    <div
                      key={course.id}
                      className="bg-card border border-border/60 rounded-xl p-4 flex items-center gap-4 hover:border-border transition-colors"
                    >
                      {/* Thumbnail */}
                      {course.thumbnail_url ? (
                        <SmartImage src={course.thumbnail_url} alt={course.title ?? ''} size="thumb" className="w-14 h-14 rounded-lg object-cover shrink-0 hidden sm:block" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center shrink-0 hidden sm:block">
                          <BookOpen className="w-5 h-5 text-foreground/85" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground text-sm truncate">{course.title}</h3>
                          {course.is_free && (
                            <span className="text-xs text-accent bg-accent/10 px-1.5 py-0.5 rounded-full font-medium shrink-0">Gratis</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground/80">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {students} alumno{students !== 1 ? 's' : ''}
                          </span>
                          {!course.is_free && (
                            <span>ARS {Number(course.price).toLocaleString('es-AR')}</span>
                          )}
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2 shrink-0">

                        {/* Toggle publicar */}
                        <button
                          onClick={() => togglePublish.mutate({ id: course.id, published: course.is_published })}
                          disabled={togglePublish.isPending}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                            course.is_published
                              ? 'bg-accent/15 text-accent hover:bg-accent/25'
                              : 'bg-secondary text-muted-foreground hover:bg-border'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${course.is_published ? 'bg-accent' : 'bg-muted-foreground'}`} />
                          {course.is_published ? 'Publicado' : 'Borrador'}
                        </button>

                        {/* Gestionar (principal) */}
                        <Button variant="hero-outline" size="sm" asChild>
                          <Link to={`/instructor/courses/${course.id}`}>
                            Gestionar
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>

                        {/* Ver en público */}
                        <Button variant="ghost" size="icon" asChild title="Ver página pública">
                          <Link to={`/courses/${course.slug}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="w-4 h-4 text-muted-foreground/80" />
                          </Link>
                        </Button>

                        {/* Eliminar */}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Eliminar curso"
                          className="text-foreground/85 hover:text-red-400 transition-colors"
                          onClick={() => setDeletingCourse({ id: course.id, title: course.title })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}

                {courseLimitReached && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                    <Zap className="w-5 h-5 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-amber-800">Llegaste al límite de cursos de tu plan</p>
                      <p className="text-xs text-amber-600 mt-0.5">Subí de plan para crear más cursos sin límites.</p>
                    </div>
                    <Button variant="hero" size="sm" asChild>
                      <Link to="/settings">Subir plan</Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Estado vacío — onboarding */
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Paso 1 */}
                  <div className="bg-card border-2 border-accent/30 rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-accent" />
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-0.5">Listo</p>
                      <h3 className="font-semibold text-foreground text-sm">Tu escuela está creada</h3>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">Ya tenés tu espacio propio.</p>
                    </div>
                  </div>

                  {/* Paso 2 — acción principal */}
                  <div className="bg-card border-2 border-primary rounded-2xl p-5 flex flex-col gap-3 shadow-sm shadow-primary/10">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-0.5">Siguiente paso</p>
                      <h3 className="font-semibold text-foreground text-sm">Creá tu primer curso</h3>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">Subí tus lecciones y configurá el precio.</p>
                    </div>
                    <Button variant="hero" size="sm" className="mt-auto" onClick={() => setShowCreateDialog(true)}>
                      <Plus className="w-3.5 h-3.5" />
                      Crear curso
                    </Button>
                  </div>

                  {/* Paso 3 */}
                  <div className="bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-3 opacity-60">
                    <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-muted-foreground/80" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wide mb-0.5">Después</p>
                      <h3 className="font-semibold text-foreground/85 text-sm">Conectá Mercado Pago</h3>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">Para cobrar tus inscripciones automáticamente.</p>
                    </div>
                    <Button variant="hero-outline" size="sm" asChild className="mt-auto">
                      <Link to="/settings">Conectar MP</Link>
                    </Button>
                  </div>

                  {/* Paso 4 */}
                  <div className="bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-3 opacity-60">
                    <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-muted-foreground/80" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wide mb-0.5">Al final</p>
                      <h3 className="font-semibold text-foreground/85 text-sm">Publicá y compartí</h3>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">Tu primer alumno puede pagar ese mismo día.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab: Estadísticas */}
          <TabsContent value="kpis" className="mt-6">
            {courses && courses.length > 0 ? (
              <Suspense fallback={<div className="text-sm text-muted-foreground">Cargando métricas…</div>}><KpiDashboard courseIds={courses.map(c => c.id)} /></Suspense>
            ) : (
              <div className="bg-card border border-border/60 rounded-2xl p-12 text-center">
                <BarChart3 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Nada que mostrar todavía</p>
                <p className="text-sm text-muted-foreground/80 mt-1">Cuando tengas inscriptos, acá vas a ver las métricas de tu escuela.</p>
              </div>
            )}
          </TabsContent>

          {/* Tab: Afiliados */}
          <TabsContent value="affiliates" className="mt-6">
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="font-heading text-lg font-bold text-foreground">Programa de afiliados</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Recomendá NATO University y ganás comisiones automáticas cada vez que alguien se suscribe con tu link.
                </p>
              </div>

              {/* Link de afiliado */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                <p className="text-sm font-semibold text-foreground/85">Tu link único</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-card border border-amber-200 rounded-lg px-3 py-2 text-sm font-mono text-foreground/70 truncate">
                    {affiliateUrl}
                  </div>
                  <button
                    className="shrink-0 flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-amber-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(affiliateUrl)
                      setCopiedAffiliateUrl(true)
                      setTimeout(() => setCopiedAffiliateUrl(false), 2000)
                    }}
                  >
                    {copiedAffiliateUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedAffiliateUrl ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="text-xs text-amber-700">
                  Cuando alguien se suscribe a un plan con tu link, recibís una comisión automática cada mes.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card border border-border/60 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{referredCount}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">Escuelas referidas</p>
                </div>
                <div className="bg-card border border-border/60 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-accent">
                    {totalEarned > 0 ? `ARS ${totalEarned.toLocaleString('es-AR')}` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground/80 mt-1">Total cobrado</p>
                </div>
                <div className="bg-card border border-border/60 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-500">
                    {totalPending > 0 ? `ARS ${totalPending.toLocaleString('es-AR')}` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground/80 mt-1">Pendiente</p>
                </div>
              </div>

              {/* Historial */}
              {affiliateCommissions && affiliateCommissions.length > 0 ? (
                <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/40">
                    <h3 className="text-sm font-semibold text-foreground/85">Historial</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/30 border-b border-border/60">
                      <tr>
                        {['Escuela', 'Monto', 'Estado', 'Fecha'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {commissions.map(c => (
                        <tr key={c.id} className="hover:bg-secondary/30">
                          <td className="px-4 py-3 font-medium text-foreground">{c.referred_tenant?.name ?? '—'}</td>
                          <td className="px-4 py-3 text-foreground/85 font-semibold">ARS {Number(c.amount_ars ?? 0).toLocaleString('es-AR')}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              c.status === 'paid' ? 'bg-accent/15 text-accent' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {c.status === 'paid' ? 'Cobrado' : 'Pendiente'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground/80 text-xs">
                            {c.created_at ? new Date(c.created_at).toLocaleDateString('es-AR') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-card border border-border/60 rounded-xl p-10 text-center">
                  <Gift className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm font-medium">Todavía no tenés comisiones</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">Compartí tu link y empezá a ganar.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialog crear curso */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-secondary border-border/60">
          <DialogHeader>
            <DialogTitle className="font-heading text-foreground">Crear nuevo curso</DialogTitle>
          </DialogHeader>
          <CourseForm
            onSubmit={createCourse.mutateAsync}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación */}
      <Dialog open={!!deletingCourse} onOpenChange={open => !open && setDeletingCourse(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminás este curso?</DialogTitle>
            <DialogDescription>
              <strong>"{deletingCourse?.title}"</strong> y todo su contenido se borran para siempre. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeletingCourse(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleteCourse.isPending}
              onClick={() => deletingCourse && deleteCourse.mutate(deletingCourse.id)}
            >
              {deleteCourse.isPending ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
