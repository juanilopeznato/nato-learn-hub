import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Clock, ArrowRight, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { CertificateModal } from '@/components/CertificateModal'

interface Props {
  enrollmentId: string
  courseId: string
  courseTitle: string
  courseSlug: string
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
  progressPercent,
  completedLessons,
  totalLessons,
  studentName,
  tenantName,
}: Props) {
  const navigate = useNavigate()
  const [showCert, setShowCert] = useState(false)

  const { data: certificate } = useQuery({
    queryKey: ['certificate', enrollmentId],
    enabled: progressPercent === 100,
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
    <div className="bg-white rounded-xl p-5 border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all duration-200 group flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
          progressPercent === 100
            ? 'bg-green-50 text-green-600'
            : 'bg-primary/5 text-primary'
        }`}>
          {progressPercent === 100 ? '✓ Completado' : 'En progreso'}
        </span>
      </div>

      <div>
        <h3 className="font-heading font-semibold text-gray-900 leading-snug">{courseTitle}</h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>{completedLessons}/{totalLessons} lecciones</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Progreso</span>
          <span className="font-medium text-gray-600">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      <div className="flex gap-2 mt-auto">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 justify-between text-primary hover:text-primary hover:bg-primary/5"
          onClick={() => nextLesson && navigate(`/learn/${courseSlug}/${nextLesson.id}`)}
        >
          {progressPercent === 100 ? 'Revisar' : 'Continuar'}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
        {progressPercent === 100 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 px-2"
            onClick={() => setShowCert(true)}
            title="Ver certificado"
          >
            <Award className="w-4 h-4" />
          </Button>
        )}
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
