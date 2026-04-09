import { useNavigate } from 'react-router-dom'
import { CheckCircle, PlayCircle, Circle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { CourseCalendar } from '@/components/course/CourseCalendar'

interface Lesson {
  id: string
  title: string
  order_index: number
}

interface Module {
  id: string
  title: string
  order_index: number
  lessons: Lesson[]
}

interface Props {
  courseId: string
  courseTitle: string
  courseSlug: string
  modules: Module[]
  currentLessonId: string
  completedLessonIds: Set<string>
  progressPercent: number
}

export function LessonSidebar({ courseId, courseTitle, courseSlug, modules, currentLessonId, completedLessonIds, progressPercent }: Props) {
  const navigate = useNavigate()
  const sorted = [...modules].sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-full flex flex-col shadow-sm">
      <div className="p-4 border-b border-gray-100 space-y-2">
        <h3 className="font-heading font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{courseTitle}</h3>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Progreso</span>
            <span className="font-medium text-gray-600">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-1" />
        </div>
      </div>

      <div className="overflow-y-auto flex-1 py-2 flex flex-col">
        {sorted.map(module => (
          <div key={module.id}>
            <div className="px-4 py-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {module.title}
              </span>
            </div>
            {[...module.lessons].sort((a, b) => a.order_index - b.order_index).map(lesson => {
              const isCompleted = completedLessonIds.has(lesson.id)
              const isCurrent = lesson.id === currentLessonId

              return (
                <button
                  key={lesson.id}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors text-sm hover:bg-gray-50 ${
                    isCurrent ? 'bg-primary/5 text-primary font-medium' : 'text-gray-600'
                  }`}
                  onClick={() => navigate(`/learn/${courseSlug}/${lesson.id}`)}
                >
                  <span className="shrink-0">
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : isCurrent ? (
                      <PlayCircle className="w-4 h-4 text-primary" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-300" />
                    )}
                  </span>
                  <span className="line-clamp-2 leading-snug">{lesson.title}</span>
                </button>
              )
            })}
          </div>
        ))}
        <div className="mt-auto">
          <CourseCalendar courseId={courseId} compact />
        </div>
      </div>
    </div>
  )
}
