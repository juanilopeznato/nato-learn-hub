import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, Globe, EyeOff, LogOut, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { CourseForm, type CourseFormData } from '@/components/instructor/CourseForm'
import { ModuleList } from '@/components/instructor/ModuleList'
import { KpiDashboard } from '@/components/instructor/KpiDashboard'
import { CourseCalendar } from '@/components/course/CourseCalendar'
import { toast } from 'sonner'

export default function InstructorCoursePage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { profile, tenant, signOut } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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
      const { error } = await supabase.from('courses')
        .update({ is_published: !course?.is_published })
        .eq('id', courseId!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-course', courseId] })
      toast.success(course?.is_published ? 'Curso despublicado' : 'Curso publicado')
    },
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

          {/* Tab: Métricas */}
          <TabsContent value="kpis">
            <KpiDashboard courseIds={[courseId!]} />
          </TabsContent>

          {/* Tab: Estudiantes */}
          <TabsContent value="students">
            <div className="max-w-4xl space-y-4">
              <div>
                <h2 className="font-heading text-xl font-bold text-gray-900">Estudiantes inscriptos</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {enrollments && enrollments.length > 0
                    ? `${enrollments.length} estudiante${enrollments.length !== 1 ? 's' : ''} inscripto${enrollments.length !== 1 ? 's' : ''}`
                    : 'Aún no hay estudiantes inscriptos'}
                </p>
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
