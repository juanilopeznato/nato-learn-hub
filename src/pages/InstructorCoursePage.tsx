import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, Globe, EyeOff, LogOut, ExternalLink, Download, Tag, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { CourseForm, type CourseFormData } from '@/components/instructor/CourseForm'
import { exportToCsv } from '@/lib/exportCsv'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ModuleList } from '@/components/instructor/ModuleList'
import { KpiDashboard } from '@/components/instructor/KpiDashboard'
import { CourseCalendar } from '@/components/course/CourseCalendar'
import { toast } from 'sonner'

export default function InstructorCoursePage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { profile, tenant, signOut } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [couponForm, setCouponForm] = useState<{
    code: string; discount_type: 'percent' | 'fixed'; discount_value: string
    max_uses: string; expires_at: string; course_specific: boolean
  }>({ code: '', discount_type: 'percent', discount_value: '', max_uses: '', expires_at: '', course_specific: false })
  const [showCouponForm, setShowCouponForm] = useState(false)

  const { data: course, isLoading } = useQuery({
    queryKey: ['instructor-course', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId!)
        .single()
      if (error) throw error
      return data
    },
  })

  const { data: enrollments } = useQuery({
    queryKey: ['instructor-course-students', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, student:profiles(id, full_name, email, avatar_url, created_at)')
        .eq('course_id', courseId!)
        .in('mp_status', ['free', 'approved'])
        .order('enrolled_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const { data: progressData } = useQuery({
    queryKey: ['instructor-course-progress', courseId, enrollments?.map(e => e.id)],
    enabled: !!enrollments && enrollments.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('course_progress')
        .select('enrollment_id, progress_percent')
        .in('enrollment_id', enrollments!.map(e => e.id))
      const map: Record<string, number> = {}
      data?.forEach(p => { map[p.enrollment_id] = p.progress_percent ?? 0 })
      return map
    },
  })

  const { data: coupons, refetch: refetchCoupons } = useQuery({
    queryKey: ['instructor-coupons', courseId, tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const createCoupon = useMutation({
    mutationFn: async () => {
      const code = couponForm.code.trim().toUpperCase()
      if (!code || !couponForm.discount_value) throw new Error('Completá los campos requeridos')
      const { error } = await supabase.from('coupons').insert({
        tenant_id: tenant!.id,
        code,
        discount_type: couponForm.discount_type,
        discount_value: Number(couponForm.discount_value),
        max_uses: couponForm.max_uses ? Number(couponForm.max_uses) : null,
        expires_at: couponForm.expires_at || null,
        course_id: couponForm.course_specific ? courseId : null,
        is_active: true,
      })
      if (error) throw error
    },
    onSuccess: () => {
      refetchCoupons()
      setCouponForm({ code: '', discount_type: 'percent', discount_value: '', max_uses: '', expires_at: '', course_specific: false })
      setShowCouponForm(false)
      toast.success('Cupón creado')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleCoupon = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('coupons').update({ is_active: !is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => refetchCoupons(),
    onError: (e: Error) => toast.error(e.message),
  })

  const updateCourse = useMutation({
    mutationFn: async (data: CourseFormData) => {
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
        nato_produced: (data as any).nato_produced ?? false,
        production_recovery_sales: (data as any).production_recovery_sales ?? 10,
      } as any).eq('id', courseId!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-course', courseId] })
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] })
      toast.success('Curso guardado')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const togglePublish = useMutation({
    mutationFn: async () => {
      const publishing = !course?.is_published

      // Validate MP credentials before publishing a paid course
      if (publishing && !course?.is_free) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('mp_access_token')
          .eq('id', tenant!.id)
          .single()

        if (!tenantData?.mp_access_token) {
          throw new Error('Necesitás configurar tu cuenta de Mercado Pago antes de publicar un curso pago. Ir a Configuración → Pagos.')
        }
      }

      const { error } = await supabase.from('courses')
        .update({ is_published: !course?.is_published })
        .eq('id', courseId!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-course', courseId] })
      toast.success(course?.is_published ? 'Curso despublicado' : 'Curso publicado')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <Link to="/instructor" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:block">Mis cursos</span>
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900 truncate flex-1">{course.title}</span>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={course.is_published ? 'default' : 'secondary'} className="text-xs hidden sm:flex">
              {course.is_published ? 'Publicado' : 'Borrador'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => togglePublish.mutate()}
              disabled={togglePublish.isPending}
              className="text-gray-500 gap-1"
            >
              {course.is_published ? <EyeOff className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              <span className="hidden sm:block">{course.is_published ? 'Despublicar' : 'Publicar'}</span>
            </Button>
            <Button variant="ghost" size="sm" asChild className="text-gray-500">
              <Link to={`/courses/${course.slug}`} target="_blank">
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:block ml-1">Ver landing</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-400">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="content" className="space-y-6">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="content">Lecciones</TabsTrigger>
            <TabsTrigger value="details">Info y ventas</TabsTrigger>
            <TabsTrigger value="calendar">Clases en vivo</TabsTrigger>
            <TabsTrigger value="students">Estudiantes</TabsTrigger>
            <TabsTrigger value="coupons">Cupones</TabsTrigger>
            <TabsTrigger value="kpis">Métricas</TabsTrigger>
          </TabsList>

          {/* Tab: Contenido (módulos y lecciones) */}
          <TabsContent value="content">
            <div className="max-w-3xl space-y-6">
              <div>
                <h2 className="font-heading text-xl font-bold text-gray-900">Contenido del curso</h2>
                <p className="text-sm text-gray-500 mt-1">Organizá los módulos y lecciones. El orden se puede cambiar con los índices.</p>
              </div>
              <ModuleList courseId={courseId!} />
            </div>
          </TabsContent>

          {/* Tab: Info y copy de ventas */}
          <TabsContent value="details">
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="font-heading text-xl font-bold text-gray-900">Información y copy de ventas</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Todo lo que completés acá aparece en la landing del curso. Un buen copy vende solo.
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <CourseForm
                  isEditing
                  defaultValues={{
                    title: course.title ?? '',
                    slug: course.slug ?? '',
                    description: course.description ?? '',
                    price: Number(course.price ?? 0),
                    original_price: Number((course as any).original_price ?? 0),
                    is_free: course.is_free ?? true,
                    is_published: course.is_published ?? false,
                    thumbnail_url: course.thumbnail_url ?? '',
                    intro_video_url: (course as any).intro_video_url ?? '',
                    learning_outcomes: (course as any).learning_outcomes?.length ? (course as any).learning_outcomes : [''],
                    for_who: (course as any).for_who ?? '',
                    instructor_bio: (course as any).instructor_bio ?? '',
                    instructor_avatar_url: (course as any).instructor_avatar_url ?? '',
                    faq: (course as any).faq?.length ? (course as any).faq : [{ q: '', a: '' }],
                    meta_pixel_id: (course as any).meta_pixel_id ?? '',
                    nato_produced: (course as any).nato_produced ?? false,
                    production_recovery_sales: (course as any).production_recovery_sales ?? 10,
                  }}
                  onSubmit={updateCourse.mutateAsync}
                  onCancel={() => navigate('/instructor')}
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab: Clases en vivo */}
          <TabsContent value="calendar">
            <div className="max-w-3xl">
              <CourseCalendar courseId={courseId!} canManage />
            </div>
          </TabsContent>

          {/* Tab: Cupones */}
          <TabsContent value="coupons">
            <div className="max-w-3xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-xl font-bold text-gray-900">Cupones de descuento</h2>
                  <p className="text-sm text-gray-500 mt-1">Creá códigos de descuento para compartir con tu audiencia</p>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setShowCouponForm(v => !v)}>
                  <Plus className="w-4 h-4" />
                  Nuevo cupón
                </Button>
              </div>

              {showCouponForm && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold text-gray-900">Crear cupón</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Código *</Label>
                      <Input
                        placeholder="BIENVENIDA20"
                        value={couponForm.code}
                        onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Tipo de descuento *</Label>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={couponForm.discount_type}
                        onChange={e => setCouponForm(f => ({ ...f, discount_type: e.target.value as 'percent' | 'fixed' }))}
                      >
                        <option value="percent">Porcentaje (%)</option>
                        <option value="fixed">Monto fijo (ARS)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>Valor *</Label>
                      <Input
                        type="number"
                        placeholder={couponForm.discount_type === 'percent' ? 'ej: 20' : 'ej: 5000'}
                        value={couponForm.discount_value}
                        onChange={e => setCouponForm(f => ({ ...f, discount_value: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Usos máximos (vacío = ilimitado)</Label>
                      <Input
                        type="number"
                        placeholder="ej: 50"
                        value={couponForm.max_uses}
                        onChange={e => setCouponForm(f => ({ ...f, max_uses: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Fecha de expiración (opcional)</Label>
                      <Input
                        type="date"
                        value={couponForm.expires_at}
                        onChange={e => setCouponForm(f => ({ ...f, expires_at: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1 flex flex-col justify-end">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={couponForm.course_specific}
                          onCheckedChange={v => setCouponForm(f => ({ ...f, course_specific: v }))}
                        />
                        <Label>Solo para este curso</Label>
                      </div>
                      <p className="text-xs text-gray-400">Si está desactivado aplica a todos tus cursos</p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowCouponForm(false)}>Cancelar</Button>
                    <Button onClick={() => createCoupon.mutate()} disabled={createCoupon.isPending}>
                      {createCoupon.isPending ? 'Creando...' : 'Crear cupón'}
                    </Button>
                  </div>
                </div>
              )}

              {!coupons || coupons.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                  <Tag className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Aún no creaste ningún cupón</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Código', 'Descuento', 'Usos', 'Vence', 'Aplica a', 'Estado', ''].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {coupons.map((c: any) => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-semibold text-gray-900">{c.code}</td>
                          <td className="px-4 py-3 text-gray-700">
                            {c.discount_type === 'percent'
                              ? `${c.discount_value}%`
                              : `ARS ${Number(c.discount_value).toLocaleString('es-AR')}`}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {c.uses_count}{c.max_uses !== null ? ` / ${c.max_uses}` : ''}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {c.expires_at ? new Date(c.expires_at).toLocaleDateString('es-AR') : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {c.course_id ? 'Este curso' : 'Todos'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={c.is_active ? 'default' : 'secondary'} className="text-xs">
                              {c.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleCoupon.mutate({ id: c.id, is_active: c.is_active })}
                              className="text-xs text-gray-400 hover:text-gray-600 underline"
                            >
                              {c.is_active ? 'Deshabilitar' : 'Habilitar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab: Métricas */}
          <TabsContent value="kpis">
            <KpiDashboard courseIds={[courseId!]} />
          </TabsContent>

          {/* Tab: Estudiantes */}
          <TabsContent value="students">
            <div className="max-w-4xl space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-xl font-bold text-gray-900">Estudiantes inscriptos</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {enrollments && enrollments.length > 0
                      ? `${enrollments.length} estudiante${enrollments.length !== 1 ? 's' : ''} inscripto${enrollments.length !== 1 ? 's' : ''}`
                      : 'Aún no hay estudiantes inscriptos'}
                  </p>
                </div>
                {enrollments && enrollments.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-2"
                    onClick={() => {
                      const rows = enrollments.map((e: any) => ({
                        Nombre: e.student?.full_name ?? '',
                        Email: e.student?.email ?? '',
                        'Fecha inscripción': e.enrolled_at
                          ? new Date(e.enrolled_at).toLocaleDateString('es-AR')
                          : '',
                        'Estado pago': e.mp_status === 'free' ? 'Gratis' : e.mp_status === 'approved' ? 'Pagado' : e.mp_status ?? '',
                        'Monto pagado (ARS)': e.paid_amount ?? e.amount_paid ?? 0,
                        'Progreso (%)': Math.round(progressData?.[e.id] ?? 0),
                      }))
                      const date = new Date().toISOString().slice(0, 10)
                      exportToCsv(`estudiantes-${course.slug}-${date}.csv`, rows)
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Exportar CSV
                  </Button>
                )}
              </div>

              {!enrollments || enrollments.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                  <p className="text-gray-400 text-sm">Aún no hay estudiantes inscriptos</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Estudiante', 'Email', 'Estado', 'Progreso', 'Inscripto'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {enrollments.map((enrollment: any) => {
                        const student = enrollment.student
                        const progress = progressData?.[enrollment.id] ?? 0
                        return (
                          <tr key={enrollment.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {student?.avatar_url ? (
                                  <img
                                    src={student.avatar_url}
                                    alt={student.full_name ?? ''}
                                    className="w-8 h-8 rounded-full object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                                    <span className="text-xs text-gray-500 font-medium">
                                      {(student?.full_name ?? '?').charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <span className="font-medium text-gray-900 truncate max-w-[140px]">
                                  {student?.full_name ?? '—'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{student?.email ?? '—'}</td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={enrollment.mp_status === 'approved' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {enrollment.mp_status === 'free' ? 'Gratis' : enrollment.mp_status === 'approved' ? 'Pagado' : enrollment.mp_status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 min-w-[100px]">
                                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="bg-primary h-1.5 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, progress)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 shrink-0">{Math.round(progress)}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs">
                              {enrollment.enrolled_at
                                ? new Date(enrollment.enrolled_at).toLocaleDateString('es-AR')
                                : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
