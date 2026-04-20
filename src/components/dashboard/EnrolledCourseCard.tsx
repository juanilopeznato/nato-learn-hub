import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Award, ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { CertificateModal } from '@/components/CertificateModal'

interface Props {
  enrollmentId: string
  courseId: string
  courseTitle: string
  courseSlug: string
  thumbnailUrl?: string | null
  progressPercent: number
  completedLessons: number
  totalLessons: number
  studentName: string
  tenantName: string
}

export function EnrolledCourseCard({
  enrollmentId,
  courseId,
  courseTitle,
  courseSlug,
  thumbnailUrl,
  progressPercent,
  completedLessons,
  totalLessons,
  studentName,
  tenantName,
}: Props) {
  const navigate = useNavigate()
  const [showCert, setShowCert] = useState(false)
  const isCompleted = progressPercent === 100

  const { data: certificate } = useQuery({
    queryKey: ['certificate', enrollmentId],
    enabled: isCompleted,
    queryFn: async () => {
      const { data } = await supabase
        .from('certificates')
        .select('verification_code, issued_at')
        .eq('enrollment_id', enrollmentId)
        .maybeSingle()
      return data
    },
  })

  const { data: nextLesson } = useQuery({
    queryKey: ['next-lesson', enrollmentId],
    queryFn: async () => {
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, title, module_id, order_index, modules!inner(course_id, order_index)')
        .eq('modules.course_id', courseId)
        .order('order_index')

      if (!lessons?.length) return null

      const { data: completed } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('enrollment_id', enrollmentId)
        .eq('completed', true)

      const completedIds = new Set(completed?.map(c => c.lesson_id) ?? [])
      return lessons.find(l => !completedIds.has(l.id)) ?? lessons[0]
    },
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all duration-200 group flex flex-col overflow-hidden">

      {/* Thumbnail */}
      {thumbnailUrl ? (
        <div className="relative h-36 overflow-hidden shrink-0">
          <img
            src={thumbnailUrl}
            alt={courseTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {isCompleted && (
            <div className="absolute inset-0 bg-green-900/40 flex items-center justify-center">
              <div className="flex items-center gap-1.5 bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                <CheckCircle className="w-3.5 h-3.5" />
                Completado
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={`h-36 flex items-center justify-center shrink-0 ${isCompleted ? 'bg-green-50' : 'bg-primary/5'}`}>
          {isCompleted
            ? <CheckCircle className="w-10 h-10 text-green-400" />
            : <BookOpen className="w-10 h-10 text-primary/30" />
          }
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-heading font-semibold text-gray-900 leading-snug text-sm">{courseTitle}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {completedLessons}/{totalLessons} lecciones completadas
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>{isCompleted ? 'Completado' : 'En progreso'}</span>
            <span className="font-medium text-gray-600">{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-primary'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-between text-primary hover:text-primary hover:bg-primary/5 text-xs"
            onClick={() => nextLesson && navigate(`/learn/${courseSlug}/${nextLesson.id}`)}
          >
            {isCompleted ? 'Repasar' : 'Continuar'}
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Button>
          {isCompleted && (
            <Button
              variant="ghost"
              size="sm"
              className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 px-2 shrink-0"
              onClick={() => setShowCert(true)}
              title="Ver certificado"
            >
              <Award className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {showCert && (
        <CertificateModal
          open={showCert}
          onClose={() => setShowCert(false)}
          studentName={studentName}
          courseTitle={courseTitle}
          tenantName={tenantName}
          verificationCode={certificate?.verification_code ?? '---'}
          issuedAt={certificate?.issued_at ?? new Date().toISOString()}
        />
      )}
    </div>
  )
}
