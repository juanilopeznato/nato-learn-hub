import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Eye, Globe, EyeOff, LogOut, ExternalLink, Download,
  Tag, Plus, Users, UserX, BarChart3, Calendar, ChevronDown, ChevronRight,
} from 'lucide-react'
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
  const [showInactive, setShowInactive] = useState(false)
  const [openSection, setOpenSection] = useState<'coupons' | 'calendar' | 'metrics' | null>('coupons')

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
      if (publishing && !course?.is_free) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('mp_access_token')
          .eq('id', tenant!.id)
          .single()
        if (!tenantData?.mp_access_token) {
          throw new Error('Necesitás configurar Mercado Pago antes de publicar un curso pago. Ir a Configuración → Pagos.')
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

  // Calcular inactivos
  const now = Date.now()
  const d3 = 3 * 24 * 60 * 60 * 1000
  const d7 = 7 * 24 * 60 * 60 * 1000
  const inactiveEnrollments = (enrollments ?? [])
    .filter((e: any) => {
      const progress = progressData?.[e.id] ?? 0
      if (progress >= 100) return false
      if (!e.last_accessed_at) return true
      return now - new Date(e.last_accessed_at).getTime() >= d3
    })
    .map((e: any) => ({
      ...e,
      daysSince: e.last_accessed_at
        ? Math.floor((now - new Date(e.last_accessed_at).getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }))
    .sort((a: any, b: any) => (b.daysSince ?? 999) - (a.daysSince ?? 999))

  const displayedEnrollments = showInactive ? inactiveEnrollments : (enrollments ?? [])

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
          <Link to="/instructor" className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:block">Mis cursos</span>
          </Link>
          <span className="text-gray-200">/</span>
          <span className="text-sm font-semibold text-gray-900 truncate flex-1">{course.title}</span>

          <div className="flex items-center gap-2 shrink-0">
            {/* Toggle publicar — igual al dashboard */}
            <button
              onClick={() => togglePublish.mutate()}
              disabled={togglePublish.isPending}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                course.is_published
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {course.is_published ? <Globe className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {course.is_published ? 'Publicado' : 'Borrador'}
            </button>

            <Button variant="ghost" size="sm" asChild className="text-gray-400 hover:text-gray-700">
              <Link to={`/courses/${course.slug}`} target="_blank" title="Ver página pública">
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:block ml-1 text-xs">Ver landing</span>
              </Link>
            </Button>

            <Button variant="ghost" size="icon" onClick={signOut} className="text-gray-300 hover:text-gray-500" title="Cerrar sesión">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="content" className="space-y-6">

          {/* 4 tabs en vez de 7 */}
          <TabsList className="bg-gray-100">
            <TabsTrigger value="content">Contenido</TabsTrigger>
            <TabsTrigger value="details">Página del curso</TabsTrigger>
            <TabsTrigger value="students">
              Alumnos
              {inactiveEnrollments.length > 0 && (
                <span className="ml-1.5 w-4 h-4 rounded-full bg-orange-400 text-white text-[10px] font-bold inline-flex items-center justify-center">
                  {inactiveEnrollments.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tools">Herramientas</TabsTrigger>
          </TabsList>

          {/* Tab: Contenido */}
          <TabsContent value="content">
            <div className="max-w-3xl space-y-4">
              <div>
                <h2 className="font-heading text-lg font-bold text-gray-900">Módulos y lecciones</h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  Agregá módulos para organizar el contenido y lecciones dentro de cada módulo.
                </p>
              </div>
              <ModuleList courseId={courseId!} />
            </div>
          </TabsContent>

          {/* Tab: Página del curso */}
          <TabsContent value="details">
            <div className="max-w-2xl">
              <div className="mb-5">
                <h2 className="font-heading text-lg font-bold text-gray-900">Página del curso</h2>
                <p className="text-sm text-gray-400 mt-0.5">
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

          {/* Tab: Alumnos (todos + inactivos) */}
          <TabsContent value="students">
            <div className="max-w-4xl space-y-4">

              {/* Header con toggle Todos / Inactivos */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="font-heading text-lg font-bold text-gray-900">Alumnos</h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {enrollments?.length ?? 0} inscripto{(enrollments?.length ?? 0) !== 1 ? 's' : ''}
                    {inactiveEnrollments.length > 0 && ` · ${inactiveEnrollments.length} inactivo${inactiveEnrollments.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {inactiveEnrollments.length > 0 && (
                    <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                      <button
                        onClick={() => setShowInactive(false)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          !showInactive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        Todos
                      </button>
                      <button
                        onClick={() => setShowInactive(true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          showInactive ? 'bg-orange-400 text-white' : 'text-gray-500'
                        }`}
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Inactivos
                        <span className="bg-white/30 text-white text-[10px] font-bold w-4 h-4 rounded-full inline-flex items-center justify-center">
                          {inactiveEnrollments.length}
                        </span>
                      </button>
                    </div>
                  )}
                  {enrollments && enrollments.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => {
                        const rows = enrollments.map((e: any) => ({
                          Nombre: e.student?.full_name ?? '',
                          Email: e.student?.email ?? '',
                          'Fecha inscripción': e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString('es-AR') : '',
                          'Estado': e.mp_status === 'free' ? 'Gratis' : e.mp_status === 'approved' ? 'Pagado' : e.mp_status ?? '',
                          'Progreso (%)': Math.round(progressData?.[e.id] ?? 0),
                        }))
                        exportToCsv(`estudiantes-${course.slug}-${new Date().toISOString().slice(0, 10)}.csv`, rows)
                      }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      CSV
                    </Button>
                  )}
                </div>
              </div>

              {/* Aviso cuando se ven inactivos */}
              {showInactive && inactiveEnrollments.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-700">
                  Alumnos sin actividad en los últimos 3 días con curso incompleto. Considerá enviarles un email de seguimiento.
                </div>
              )}

              {/* Tabla */}
              {displayedEnrollments.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                  {showInactive ? (
                    <p className="text-green-600 font-medium">Todos los estudiantes están activos</p>
                  ) : (
                    <p className="text-gray-400 text-sm">Aún no hay estudiantes inscriptos</p>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {showInactive
                          ? ['Estudiante', 'Progreso', 'Última actividad', 'Inactividad'].map(h => (
                              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                            ))
                          : ['Estudiante', 'Estado', 'Progreso', 'Inscripto'].map(h => (
                              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                            ))
                        }
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayedEnrollments.map((enrollment: any) => {
                        const student = enrollment.student
                        const progress = progressData?.[enrollment.id] ?? 0
                        return (
                          <tr key={enrollment.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {student?.avatar_url ? (
                                  <img src={student.avatar_url} alt={student.full_name ?? ''} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-xs text-gray-500 font-medium">
                                    {(student?.full_name ?? '?').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 truncate max-w-[140px]">{student?.full_name ?? '—'}</p>
                                  <p className="text-xs text-gray-400 truncate max-w-[140px]">{student?.email ?? ''}</p>
                                </div>
                              </div>
                            </td>

                            {showInactive ? (
                              <>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2 min-w-[100px]">
                                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                      <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(100, progress)}%` }} />
                                    </div>
                                    <span className="text-xs text-gray-500 shrink-0">{Math.round(progress)}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-400 text-xs">
                                  {enrollment.last_accessed_at
                                    ? new Date(enrollment.last_accessed_at).toLocaleDateString('es-AR')
                                    : 'Nunca'}
                                </td>
                                <td className="px-4 py-3">
                                  {(() => {
                                    const days = (enrollment as any).daysSince
                                    const color = days === null ? 'bg-gray-100 text-gray-500'
                                      : days >= 7 ? 'bg-red-100 text-red-700'
                                      : 'bg-orange-100 text-orange-700'
                                    return (
                                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${color}`}>
                                        {days === null ? 'Sin actividad' : `${days} días`}
                                      </span>
                                    )
                                  })()}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3">
                                  <Badge variant={enrollment.mp_status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                                    {enrollment.mp_status === 'free' ? 'Gratis' : enrollment.mp_status === 'approved' ? 'Pagado' : enrollment.mp_status}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2 min-w-[100px]">
                                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                      <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(100, progress)}%` }} />
                                    </div>
                                    <span className="text-xs text-gray-500 shrink-0">{Math.round(progress)}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-400 text-xs">
                                  {enrollment.enrolled_at ? new Date(enrollment.enrolled_at).toLocaleDateString('es-AR') : '—'}
                                </td>
                              </>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab: Herramientas — accordion */}
          <TabsContent value="tools">
            <div className="max-w-3xl space-y-3">

              {/* Cupones */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenSection(openSection === 'coupons' ? null : 'coupons')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Tag className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 text-sm">Cupones de descuento</p>
                      <p className="text-xs text-gray-400">
                        {coupons?.length ? `${coupons.length} cupón${coupons.length !== 1 ? 'es' : ''} creado${coupons.length !== 1 ? 's' : ''}` : 'Creá códigos para tu audiencia'}
                      </p>
                    </div>
                  </div>
                  {openSection === 'coupons' ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </button>

                {openSection === 'coupons' && (
                  <div className="border-t border-gray-100 p-5 space-y-4">
                    <div className="flex justify-end">
                      <Button size="sm" className="gap-2" onClick={() => setShowCouponForm(v => !v)}>
                        <Plus className="w-4 h-4" />
                        Nuevo cupón
                      </Button>
                    </div>

                    {showCouponForm && (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
                        <h3 className="font-semibold text-gray-900 text-sm">Crear cupón</h3>
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
                      <div className="text-center py-8 text-gray-400 text-sm">
                        Aún no creaste ningún cupón
                      </div>
                    ) : (
                      <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              {['Código', 'Descuento', 'Usos', 'Estado', ''].map(h => (
                                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {coupons.map((c: any) => (
                              <tr key={c.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono font-semibold text-gray-900 text-xs">{c.code}</td>
                                <td className="px-4 py-3 text-gray-700 text-xs">
                                  {c.discount_type === 'percent' ? `${c.discount_value}%` : `ARS ${Number(c.discount_value).toLocaleString('es-AR')}`}
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs">
                                  {c.uses_count}{c.max_uses !== null ? ` / ${c.max_uses}` : ''}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant={c.is_active ? 'default' : 'secondary'} className="text-xs">
                                    {c.is_active ? 'Activo' : 'Inactivo'}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => toggleCoupon.mutate({ id: c.id, is_active: c.is_active })}
                                    className="text-xs text-gray-400 hover:text-gray-700 underline"
                                  >
                                    {c.is_active ? 'Desactivar' : 'Activar'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Clases en vivo */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenSection(openSection === 'calendar' ? null : 'calendar')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 text-sm">Clases en vivo</p>
                      <p className="text-xs text-gray-400">Programá sesiones en vivo para tus alumnos</p>
                    </div>
                  </div>
                  {openSection === 'calendar' ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </button>
                {openSection === 'calendar' && (
                  <div className="border-t border-gray-100 p-5">
                    <CourseCalendar courseId={courseId!} canManage />
                  </div>
                )}
              </div>

              {/* Métricas */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenSection(openSection === 'metrics' ? null : 'metrics')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 text-sm">Métricas del curso</p>
                      <p className="text-xs text-gray-400">Funnel de conversión y tasa de abandono por lección</p>
                    </div>
                  </div>
                  {openSection === 'metrics' ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </button>
                {openSection === 'metrics' && (
                  <div className="border-t border-gray-100 p-5">
                    <KpiDashboard courseIds={[courseId!]} />
                  </div>
                )}
              </div>

            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
