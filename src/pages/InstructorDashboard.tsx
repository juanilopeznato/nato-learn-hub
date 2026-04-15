import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Eye, LogOut, BookOpen, TrendingUp, Users, Settings, Mail, CreditCard, Gift, Trash2, Copy, Check, ChevronDown, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { CourseForm, type CourseFormData } from '@/components/instructor/CourseForm'
import { ModuleList } from '@/components/instructor/ModuleList'
import { KpiDashboard } from '@/components/instructor/KpiDashboard'
import { toast } from 'sonner'

export default function InstructorDashboard() {
  const { profile, tenant, allProfiles, signOut, switchSchool } = useAuth()
  const [switching, setSwitching] = useState(false)
  const [schoolMenuOpen, setSchoolMenuOpen] = useState(false)
  const queryClient = useQueryClient()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [deletingCourse, setDeletingCourse] = useState<{ id: string; title: string } | null>(null)
  const [copiedAffiliateUrl, setCopiedAffiliateUrl] = useState(false)

  const { data: courses, isLoading } = useQuery({
    queryKey: ['instructor-courses', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', profile!.id)
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const { data: currentPlan } = useQuery({
    queryKey: ['plan', (tenant as any)?.plan_name],
    enabled: !!(tenant as any)?.plan_name,
    queryFn: async () => {
      const { data } = await supabase.from('plans').select('*').eq('name', (tenant as any).plan_name).single()
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

  const courseLimitReached =
    currentPlan?.max_courses !== null &&
    currentPlan?.max_courses !== undefined &&
    (courses?.length ?? 0) >= currentPlan.max_courses

  const affiliateUrl = `${window.location.origin}/signup?ref=${(tenant as any)?.affiliate_code ?? ''}`

  const totalEarned = affiliateCommissions
    ?.filter((c: any) => c.status === 'paid')
    .reduce((sum: number, c: any) => sum + (c.amount_ars ?? 0), 0) ?? 0

  const totalPending = affiliateCommissions
    ?.filter((c: any) => c.status === 'pending')
    .reduce((sum: number, c: any) => sum + (c.amount_ars ?? 0), 0) ?? 0

  const referredCount = new Set(affiliateCommissions?.map((c: any) => c.referred_tenant_id)).size

  const { data: enrollmentCounts } = useQuery({
    queryKey: ['enrollment-counts', courses?.map(c => c.id)],
    enabled: !!courses?.length,
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('course_id')
        .in('course_id', courses!.map(c => c.id))
        .in('mp_status', ['free', 'approved'])
      const counts: Record<string, number> = {}
      data?.forEach(e => { counts[e.course_id] = (counts[e.course_id] ?? 0) + 1 })
      return counts
    },
  })

  const createCourse = useMutation({
    mutationFn: async (data: CourseFormData) => {
      if (!profile) throw new Error('Sin sesión')
      const { error } = await supabase.from('courses').insert({
        tenant_id: profile.tenant_id,
        instructor_id: profile.id,
        title: data.title,
        slug: data.slug,
        description: data.description ?? null,
        thumbnail_url: data.thumbnail_url ?? null,
        intro_video_url: (data as any).intro_video_url ?? null,
        price: data.is_free ? 0 : data.price,
        original_price: data.is_free ? null : ((data as any).original_price || null),
        currency: 'ARS',
        is_free: data.is_free,
        is_published: data.is_published,
        learning_outcomes: (data as any).learning_outcomes?.filter(Boolean) ?? [],
        for_who: (data as any).for_who ?? null,
        instructor_bio: (data as any).instructor_bio ?? null,
        instructor_avatar_url: (data as any).instructor_avatar_url ?? null,
        faq: (data as any).faq?.filter((f: any) => f.q) ?? [],
        meta_pixel_id: (data as any).meta_pixel_id ?? null,
        nato_produced: (data as any).nato_produced ?? false,
        production_recovery_sales: (data as any).production_recovery_sales ?? 10,
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

  const updateCourse = useMutation({
    mutationFn: async (data: CourseFormData) => {
      if (!editingCourseId) throw new Error('No course selected')
      const { error } = await supabase.from('courses').update({
        title: data.title,
        slug: data.slug,
        description: data.description ?? null,
        thumbnail_url: data.thumbnail_url ?? null,
        intro_video_url: (data as any).intro_video_url ?? null,
        price: data.is_free ? 0 : data.price,
        original_price: data.is_free ? null : ((data as any).original_price || null),
        is_free: data.is_free,
        is_published: data.is_published,
        learning_outcomes: (data as any).learning_outcomes?.filter(Boolean) ?? [],
        for_who: (data as any).for_who ?? null,
        instructor_bio: (data as any).instructor_bio ?? null,
        instructor_avatar_url: (data as any).instructor_avatar_url ?? null,
        faq: (data as any).faq?.filter((f: any) => f.q) ?? [],
        meta_pixel_id: (data as any).meta_pixel_id ?? null,
      } as any).eq('id', editingCourseId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] })
      toast.success('Curso actualizado')
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
      const { error } = await supabase.from('courses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      setDeletingCourse(null)
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] })
      toast.success('Curso eliminado')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const editingCourse = courses?.find(c => c.id === editingCourseId)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenant?.name ?? 'NATO University'} className="h-8 w-auto object-contain" />
            {/* School switcher — solo visible si tiene más de 1 escuela */}
            {allProfiles.length > 1 ? (
              <div className="relative">
                <button
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                  onClick={() => setSchoolMenuOpen(o => !o)}
                  disabled={switching}
                >
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  <span className="max-w-[120px] truncate">{tenant?.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
                {schoolMenuOpen && (
                  <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
                    <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Mis escuelas</p>
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
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2 disabled:opacity-50"
                      >
                        <span className="truncate">{(p as any).tenant?.name ?? 'Escuela'}</span>
                        {p.tenant_id === profile?.tenant_id && (
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
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
              <Badge variant="secondary" className="ml-1 text-xs">Instructor</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/instructor/email">
                <Mail className="w-4 h-4 mr-1" />
                Email
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/settings">
                <Settings className="w-4 h-4 mr-1" />
                Configuración
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">Vista estudiante</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-500">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-gray-900">Panel Instructor</h1>
            <p className="text-gray-500 mt-1">Gestioná tus cursos y estudiantes</p>
          </div>
          <Button variant="hero" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4" />
            Nuevo curso
          </Button>
        </div>

        <Tabs defaultValue="courses">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="courses" className="gap-1.5">
              <BookOpen className="w-4 h-4" />
              Mis cursos
            </TabsTrigger>
            <TabsTrigger value="kpis" className="gap-1.5">
              <TrendingUp className="w-4 h-4" />
              KPIs
            </TabsTrigger>
            <TabsTrigger value="affiliates" className="gap-1.5">
              <Gift className="w-4 h-4" />
              Afiliados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="mt-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="bg-white border border-gray-200 rounded-xl h-24 animate-pulse" />)}
              </div>
            ) : courses && courses.length > 0 ? (
              <div className="space-y-3">
                {courses.map(course => (
                  <div key={course.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading font-semibold text-gray-900 truncate">{course.title}</h3>
                        <Badge variant={course.is_published ? 'default' : 'secondary'} className="text-xs shrink-0">
                          {course.is_published ? 'Publicado' : 'Borrador'}
                        </Badge>
                        {course.is_free && <Badge variant="outline" className="text-xs text-accent border-accent/30 shrink-0">Gratis</Badge>}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {enrollmentCounts?.[course.id] ?? 0} inscriptos
                        </span>
                        <span className="text-xs">/courses/{course.slug}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500"
                        onClick={() => togglePublish.mutate({ id: course.id, published: course.is_published })}
                      >
                        {course.is_published ? 'Despublicar' : 'Publicar'}
                      </Button>
                      <Button
                        variant="hero-outline"
                        size="sm"
                        asChild
                      >
                        <Link to={`/instructor/courses/${course.id}`}>
                          Editar
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/courses/${course.slug}`} target="_blank">
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-red-500"
                        onClick={() => setDeletingCourse({ id: course.id, title: course.title })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <h2 className="font-heading text-xl font-bold text-gray-900">¡Bienvenido a NATO University!</h2>
                  <p className="text-gray-500 text-sm mt-1">Seguí estos pasos para lanzar tu primera escuela online.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Step 1 */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">1</span>
                      <Settings className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">Configurar tu escuela</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Personalizá el nombre, logo y dominio de tu plataforma.</p>
                    </div>
                    <Button variant="hero-outline" size="sm" asChild className="mt-auto">
                      <Link to="/settings">Ir a configuración</Link>
                    </Button>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">2</span>
                      <BookOpen className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">Crear tu primer curso</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Cargá módulos, lecciones y el precio de tu curso.</p>
                    </div>
                    <Button variant="hero" size="sm" className="mt-auto" onClick={() => setShowCreateDialog(true)}>
                      <Plus className="w-3.5 h-3.5" />
                      Crear curso
                    </Button>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">3</span>
                      <CreditCard className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">Conectar Mercado Pago</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Vinculá tu cuenta para cobrar inscripciones automáticamente.</p>
                    </div>
                    <Button variant="hero-outline" size="sm" asChild className="mt-auto">
                      <Link to="/settings">Conectar MP</Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="kpis" className="mt-6">
            {courses && courses.length > 0 ? (
              <KpiDashboard courseIds={courses.map(c => c.id)} />
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Creá al menos un curso para ver métricas.</p>
              </div>
            )}
          </TabsContent>

          {/* Tab: Afiliados */}
          <TabsContent value="affiliates" className="mt-6">
            <div className="max-w-3xl space-y-6">
              <div>
                <h2 className="font-heading text-xl font-bold text-gray-900">Programa de afiliados</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Ganá comisiones recomendando NATO University a otros instructores
                </p>
              </div>

              {/* Tu link de afiliado */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-6 space-y-3">
                <p className="text-sm font-semibold text-gray-700">Tu link de referido</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white border border-yellow-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-700 truncate">
                    {affiliateUrl}
                  </div>
                  <button
                    className="shrink-0 flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
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
                <p className="text-xs text-yellow-700">
                  Cuando alguien se registra con tu link y contrata un plan, recibís una comisión automática.
                </p>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{referredCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Escuelas referidas</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {totalEarned > 0 ? `ARS ${totalEarned.toLocaleString('es-AR')}` : '$0'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Total cobrado</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {totalPending > 0 ? `ARS ${totalPending.toLocaleString('es-AR')}` : '$0'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Pendiente de cobro</p>
                </div>
              </div>

              {/* Historial de comisiones */}
              {!affiliateCommissions || affiliateCommissions.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                  <Gift className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Aún no tenés comisiones</p>
                  <p className="text-xs text-gray-400 mt-1">Compartí tu link y empezá a ganar</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700">Historial de comisiones</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Escuela referida', 'Monto', 'Comisión %', 'Estado', 'Fecha'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {affiliateCommissions.map((c: any) => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {(c.referred_tenant as any)?.name ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-700 font-semibold">
                            ARS {Number(c.amount_ars ?? 0).toLocaleString('es-AR')}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{c.commission_pct}%</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              c.status === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {c.status === 'paid' ? 'Pagado' : 'Pendiente'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {c.created_at ? new Date(c.created_at).toLocaleDateString('es-AR') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialog crear curso */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-gray-100 border-gray-200">
          <DialogHeader>
            <DialogTitle className="font-heading text-gray-900">Crear nuevo curso</DialogTitle>
          </DialogHeader>
          <CourseForm
            onSubmit={createCourse.mutateAsync}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog editar curso + módulos */}
      <Dialog open={!!editingCourseId} onOpenChange={open => !open && setEditingCourseId(null)}>
        <DialogContent className="bg-gray-100 border-gray-200 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-gray-900">
              Editar: {editingCourse?.title}
            </DialogTitle>
          </DialogHeader>
          {editingCourseId && (
            <Tabs defaultValue="content">
              <TabsList className="bg-gray-200 w-full">
                <TabsTrigger value="content" className="flex-1 text-xs">Contenido</TabsTrigger>
                <TabsTrigger value="details" className="flex-1 text-xs">Info y ventas</TabsTrigger>
              </TabsList>
              <TabsContent value="content" className="mt-4">
                <ModuleList courseId={editingCourseId} />
              </TabsContent>
              <TabsContent value="details" className="mt-4">
                <CourseForm
                  isEditing
                  defaultValues={{
                    title: editingCourse?.title ?? '',
                    slug: editingCourse?.slug ?? '',
                    description: editingCourse?.description ?? '',
                    price: Number(editingCourse?.price ?? 0),
                    original_price: Number((editingCourse as any)?.original_price ?? 0),
                    is_free: editingCourse?.is_free ?? true,
                    is_published: editingCourse?.is_published ?? false,
                    thumbnail_url: editingCourse?.thumbnail_url ?? '',
                    intro_video_url: (editingCourse as any)?.intro_video_url ?? '',
                    learning_outcomes: (editingCourse as any)?.learning_outcomes ?? [''],
                    for_who: (editingCourse as any)?.for_who ?? '',
                    instructor_bio: (editingCourse as any)?.instructor_bio ?? '',
                    instructor_avatar_url: (editingCourse as any)?.instructor_avatar_url ?? '',
                    faq: (editingCourse as any)?.faq ?? [{ q: '', a: '' }],
                    meta_pixel_id: (editingCourse as any)?.meta_pixel_id ?? '',
                  }}
                  onSubmit={updateCourse.mutateAsync}
                  onCancel={() => setEditingCourseId(null)}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deletingCourse} onOpenChange={open => !open && setDeletingCourse(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar curso?</DialogTitle>
            <DialogDescription>
              Vas a eliminar <strong>"{deletingCourse?.title}"</strong>. Esta acción no se puede deshacer y borrará todos los módulos y lecciones del curso.
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
