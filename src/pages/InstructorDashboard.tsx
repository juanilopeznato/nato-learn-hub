import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Eye, LogOut, BookOpen, TrendingUp, Users, Settings, Mail, CreditCard, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { CourseForm, type CourseFormData } from '@/components/instructor/CourseForm'
import { ModuleList } from '@/components/instructor/ModuleList'
import { KpiDashboard } from '@/components/instructor/KpiDashboard'
import { toast } from 'sonner'

export default function InstructorDashboard() {
  const { profile, tenant, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)

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
        .select('*')
        .eq('referrer_tenant_id', tenant!.id)
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
        .eq('mp_status', 'free')
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

  const editingCourse = courses?.find(c => c.id === editingCourseId)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenant?.name ?? 'NATO University'} className="h-8 w-auto object-contain" />
            <Badge variant="secondary" className="ml-1 text-xs">Instructor</Badge>
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
    </div>
  )
}
