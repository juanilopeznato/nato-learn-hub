import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle, FileDown, Menu, X, Award, Pencil, MessageSquare } from 'lucide-react'
import { useConfetti } from '@/hooks/useConfetti'
import { StreakBadge } from '@/components/StreakBadge'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { VideoEmbed } from '@/components/lesson/VideoEmbed'
import { LessonSidebar } from '@/components/lesson/LessonSidebar'
import { LessonComments } from '@/components/lesson/LessonComments'
import { CertificateModal } from '@/components/CertificateModal'
import { toast } from 'sonner'

export default function LessonView() {
  const { courseSlug, lessonId } = useParams<{ courseSlug: string; lessonId: string }>()
  const { profile, tenant } = useAuth()
  const { fireLesson, fireCourse } = useConfetti()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [certificateData, setCertificateData] = useState<{ code: string; issuedAt: string } | null>(null)

  // Notes state
  const [noteContent, setNoteContent] = useState('')
  const [noteSaveStatus, setNoteSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Traer curso completo con módulos y lecciones
  const { data: course, isLoading: courseLoading, isError: courseError } = useQuery({
    queryKey: ['course-full', courseSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id, title, slug,
          modules (
            id, title, order_index,
            lessons (id, title, order_index, video_url, video_provider, duration_seconds, is_free_preview)
          )
        `)
        .eq('slug', courseSlug!)
        .single()
      if (error) throw error
      return data
    },
  })

  // Lección actual
  const currentLesson = course?.modules
    ?.flatMap(m => m.lessons ?? [])
    .find(l => l.id === lessonId)

  // Enrollment del estudiante
  const { data: enrollment, isLoading: enrollmentLoading } = useQuery({
    queryKey: ['enrollment-lesson', course?.id, profile?.id],
    enabled: !!course?.id && !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', course!.id)
        .eq('student_id', profile!.id)
        .single()
      return data
    },
  })

  // Progreso del estudiante
  const { data: progressData } = useQuery({
    queryKey: ['progress', enrollment?.id],
    enabled: !!enrollment?.id,
    queryFn: async () => {
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('enrollment_id', enrollment!.id)

      const { data: courseProgress } = await supabase
        .from('course_progress')
        .select('progress_percent')
        .eq('enrollment_id', enrollment!.id)
        .single()

      return {
        completedIds: new Set(lessonProgress?.filter(p => p.completed).map(p => p.lesson_id) ?? []),
        percent: courseProgress?.progress_percent ?? 0,
      }
    },
  })

  // Recursos de la lección
  const { data: resources } = useQuery({
    queryKey: ['resources', lessonId],
    enabled: !!lessonId,
    queryFn: async () => {
      const { data } = await supabase
        .from('resources')
        .select('*')
        .eq('lesson_id', lessonId!)
      return data ?? []
    },
  })

  // Notes query
  const { data: existingNote } = useQuery({
    queryKey: ['lesson-note', lessonId, profile?.id],
    enabled: !!lessonId && !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('lesson_notes')
        .select('content')
        .eq('profile_id', profile!.id)
        .eq('lesson_id', lessonId!)
        .maybeSingle()
      return data
    },
  })

  // Sync loaded note into state
  useEffect(() => {
    if (existingNote?.content !== undefined) {
      setNoteContent(existingNote.content ?? '')
    }
  }, [existingNote])

  // Save note function
  const saveNote = useCallback(async (content: string) => {
    if (!profile?.id || !lessonId) return
    setNoteSaveStatus('saving')
    await supabase
      .from('lesson_notes')
      .upsert(
        { profile_id: profile.id, lesson_id: lessonId, content, updated_at: new Date().toISOString() },
        { onConflict: 'profile_id,lesson_id' }
      )
    setNoteSaveStatus('saved')
  }, [profile?.id, lessonId])

  // Handle note change with debounce
  const handleNoteChange = (value: string) => {
    setNoteContent(value)
    setNoteSaveStatus('idle')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveNote(value)
    }, 1500)
  }

  // Registrar última lección visitada al cargar
  useEffect(() => {
    if (!enrollment?.id || !lessonId) return
    supabase
      .from('enrollments')
      .update({ last_lesson_id: lessonId, last_accessed_at: new Date().toISOString() })
      .eq('id', enrollment.id)
      .then(() => {/* fire-and-forget */})
  }, [enrollment?.id, lessonId])

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!enrollment?.id || !lessonId) throw new Error('Sin enrollment')
      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          enrollment_id: enrollment.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'enrollment_id,lesson_id' })
      if (error) throw error
    },
    onSuccess: async () => {
      fireLesson()
      await supabase.rpc('award_points', { p_action: 'complete_lesson' })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      queryClient.invalidateQueries({ queryKey: ['course-progress'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      toast.success('Lección completada ✅ +10 pts')
      // Check if course is now 100% complete → issue certificate
      if (enrollment?.id) {
        const { data: cp } = await supabase
          .from('course_progress')
          .select('progress_percent')
          .eq('enrollment_id', enrollment.id)
          .single()
        if (cp && Number(cp.progress_percent) >= 100) {
          fireCourse()
          const { data: certId } = await supabase.rpc('issue_certificate', { p_enrollment_id: enrollment.id })
          if (certId) {
            const { data: cert } = await supabase
              .from('certificates')
              .select('verification_code, issued_at')
              .eq('id', certId)
              .single()
            if (cert) {
              setCertificateData({ code: cert.verification_code, issuedAt: cert.issued_at })
              toast.success('¡Curso completado! 🎓 Certificado disponible')
            }
          }
        }
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Navegación anterior/siguiente
  const allLessons = course?.modules
    ?.sort((a, b) => a.order_index - b.order_index)
    .flatMap(m => [...(m.lessons ?? [])].sort((a, b) => a.order_index - b.order_index)) ?? []
  const currentIndex = allLessons.findIndex(l => l.id === lessonId)
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null
  const isCompleted = progressData?.completedIds.has(lessonId ?? '')

  const modules = (course?.modules ?? []).map(m => ({
    ...m,
    lessons: m.lessons ?? [],
  }))

  if (courseError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-gray-900 font-medium">No se pudo cargar la lección</p>
          <p className="text-gray-500 text-sm">Verificá tu conexión o intentá de nuevo.</p>
          <Link to="/" className="text-primary text-sm hover:underline">Volver al inicio</Link>
        </div>
      </div>
    )
  }

  if (courseLoading || !course || !currentLesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando lección...</span>
        </div>
      </div>
    )
  }

  // Wait for enrollment check when logged in before deciding access
  if (profile && enrollmentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando lección...</span>
        </div>
      </div>
    )
  }

  // Access guard: if not enrolled, only allow access if lesson is free preview
  if (!enrollment && !currentLesson.is_free_preview) {
    navigate(`/courses/${courseSlug}`, { replace: true })
    return null
  }

  const isFreePreview = !enrollment && !!currentLesson.is_free_preview

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 z-40 shrink-0">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link to={`/courses/${courseSlug}`} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:block">{course.title}</span>
          </Link>
          <span className="text-gray-300 hidden sm:block">/</span>
          <span className="text-sm text-gray-500 truncate">{currentLesson.title}</span>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-400 hidden sm:block">
              {currentIndex + 1} / {allLessons.length}
            </span>
            <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenant?.name ?? 'NATO University'} className="h-5 w-auto object-contain" />
            {/* Mobile: toggle sidebar */}
            <button
              className="lg:hidden ml-1 p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Ver lecciones"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 container mx-auto px-4 py-6">
        <div className="flex gap-6 h-full">
          {/* Left: video + actions */}
          <div className="flex-1 min-w-0 space-y-5">
            {currentLesson.video_url && currentLesson.video_provider ? (
              <VideoEmbed videoUrl={currentLesson.video_url} videoProvider={currentLesson.video_provider} />
            ) : (
              <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
                <p className="text-gray-400">Esta lección no tiene video.</p>
              </div>
            )}

            {/* Free preview banner */}
            {isFreePreview && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-amber-800">
                  Este es un contenido de vista previa gratuita.
                </p>
                <Link
                  to={`/courses/${courseSlug}`}
                  className="text-sm font-semibold text-amber-700 hover:text-amber-900 hover:underline shrink-0 flex items-center gap-1"
                >
                  Inscribite para acceder al curso completo →
                </Link>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <h1 className="font-heading text-xl font-semibold text-gray-900">{currentLesson.title}</h1>
              {isCompleted ? (
                <span className="flex items-center gap-1.5 text-sm text-green-600 shrink-0">
                  <CheckCircle className="w-4 h-4" />
                  Completada
                </span>
              ) : !enrollment ? (
                <span className="text-xs text-gray-400 shrink-0">Inscribite al curso para marcar lecciones</span>
              ) : (
                <Button
                  variant="hero"
                  size="sm"
                  onClick={() => completeMutation.mutate()}
                  disabled={completeMutation.isPending}
                  className="shrink-0"
                >
                  <CheckCircle className="w-4 h-4" />
                  Marcar completada
                </Button>
              )}
            </div>

            {/* Recursos */}
            {resources && resources.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Recursos</h3>
                <div className="flex flex-wrap gap-2">
                  {resources.map(r => (
                    <a
                      key={r.id}
                      href={r.file_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 hover:bg-primary/5 hover:text-primary border border-gray-200 rounded-lg px-3 py-2 transition-colors"
                    >
                      <FileDown className="w-4 h-4 shrink-0" />
                      {r.title}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Notas del estudiante */}
            {profile && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-900">Mis notas</h3>
                  </div>
                  {noteSaveStatus === 'saving' && (
                    <span className="text-xs text-gray-400">Guardando...</span>
                  )}
                  {noteSaveStatus === 'saved' && (
                    <span className="text-xs text-green-600">Guardado ✓</span>
                  )}
                </div>
                <textarea
                  value={noteContent}
                  onChange={e => handleNoteChange(e.target.value)}
                  placeholder="Escribí tus apuntes sobre esta lección..."
                  rows={5}
                  className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
                />
              </div>
            )}

            {/* Foro del curso */}
            {enrollment && course && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Foro del curso</p>
                    <p className="text-xs text-gray-500">Preguntá, compartí o conectá con otros estudiantes</p>
                  </div>
                </div>
                <Link
                  to={`/community?course=${course.id}`}
                  className="text-sm font-semibold text-primary hover:text-primary/80 shrink-0 flex items-center gap-1 transition-colors"
                >
                  Ver foro →
                </Link>
              </div>
            )}

            {/* Comentarios */}
            {enrollment && tenant && profile && (
              <LessonComments
                lessonId={lessonId!}
                tenantId={tenant.id}
                profileId={profile.id}
                profileRole={profile.role}
              />
            )}

            {/* Navegación anterior/siguiente */}
            <div className="flex justify-between gap-3 pt-2">
              <Button
                variant="hero-outline"
                size="sm"
                disabled={!prevLesson}
                onClick={() => prevLesson && navigate(`/learn/${courseSlug}/${prevLesson.id}`)}
              >
                <ArrowLeft className="w-4 h-4" />
                Anterior
              </Button>
              <Button
                variant="hero"
                size="sm"
                disabled={!nextLesson}
                onClick={() => nextLesson && navigate(`/learn/${courseSlug}/${nextLesson.id}`)}
              >
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Right: sidebar (desktop) */}
          <div className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-20" style={{ maxHeight: 'calc(100vh - 5rem)' }}>
              <LessonSidebar
                courseId={course.id}
                courseTitle={course.title}
                courseSlug={courseSlug!}
                modules={modules}
                currentLessonId={lessonId!}
                completedLessonIds={progressData?.completedIds ?? new Set()}
                progressPercent={Number(progressData?.percent ?? 0)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Certificate Modal */}
      {certificateData && course && profile && (
        <CertificateModal
          open={!!certificateData}
          onClose={() => setCertificateData(null)}
          studentName={profile.full_name}
          courseTitle={course.title}
          tenantName={tenant?.name ?? 'NATO University'}
          verificationCode={certificateData.code}
          issuedAt={certificateData.issuedAt}
        />
      )}

      {/* Mobile sidebar drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[90vw] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 shrink-0">
              <span className="font-heading font-semibold text-gray-900 text-sm">Contenido del curso</span>
              <button
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <LessonSidebar
                courseId={course.id}
                courseTitle={course.title}
                courseSlug={courseSlug!}
                modules={modules}
                currentLessonId={lessonId!}
                completedLessonIds={progressData?.completedIds ?? new Set()}
                progressPercent={Number(progressData?.percent ?? 0)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
