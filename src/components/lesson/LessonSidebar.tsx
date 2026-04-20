import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
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

  const totalLessons = sorted.reduce((acc, m) => acc + m.lessons.length, 0)
  const completedCount = completedLessonIds.size

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-full flex flex-col shadow-sm">
      {/* Header con progress ring */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {/* Anillo de progreso SVG */}
          <div className="relative shrink-0 w-11 h-11">
            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="18" fill="none" stroke="#f3f4f6" strokeWidth="4" />
              <circle
                cx="22" cy="22" r="18"
                fill="none"
                stroke={progressPercent === 100 ? '#22c55e' : '#5B21F5'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 18}`}
                strokeDashoffset={`${2 * Math.PI * 18 * (1 - progressPercent / 100)}`}
                className="transition-all duration-700"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{courseTitle}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{completedCount}/{totalLessons} lecciones</p>
          </div>
        </div>
      </div>

      {/* Mapa visual del curso */}
      <div className="overflow-y-auto flex-1 py-4 px-4 flex flex-col gap-5">
        {sorted.map((module, moduleIdx) => {
          const sortedLessons = [...module.lessons].sort((a, b) => a.order_index - b.order_index)

          return (
            <div key={module.id}>
              {/* Módulo header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-gray-500">{moduleIdx + 1}</span>
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">
                  {module.title}
                </span>
              </div>

              {/* Lecciones como nodos en línea vertical */}
              <div className="ml-2.5 flex flex-col">
                {sortedLessons.map((lesson, lessonIdx) => {
                  const isCompleted = completedLessonIds.has(lesson.id)
                  const isCurrent = lesson.id === currentLessonId
                  const isLast = lessonIdx === sortedLessons.length - 1

                  return (
                    <div key={lesson.id} className="flex gap-3">
                      {/* Línea + nodo */}
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => navigate(`/learn/${courseSlug}/${lesson.id}`)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 z-10 ${
                            isCompleted
                              ? 'bg-green-500 shadow-sm shadow-green-200'
                              : isCurrent
                              ? 'bg-primary ring-4 ring-primary/20 shadow-md shadow-primary/20'
                              : 'bg-white border-2 border-gray-200 hover:border-primary/50'
                          }`}
                          title={lesson.title}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-3.5 h-3.5 text-white" />
                          ) : isCurrent ? (
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-gray-300" />
                          )}
                        </button>
                        {/* Línea conectora */}
                        {!isLast && (
                          <div className={`w-0.5 flex-1 min-h-[20px] my-0.5 ${
                            isCompleted ? 'bg-green-300' : 'bg-gray-200'
                          }`} />
                        )}
                      </div>

                      {/* Título de la lección */}
                      <button
                        onClick={() => navigate(`/learn/${courseSlug}/${lesson.id}`)}
                        className={`text-left pb-3 flex-1 min-w-0 transition-colors ${
                          isCurrent
                            ? 'text-primary font-semibold'
                            : isCompleted
                            ? 'text-green-700 text-xs hover:text-green-800'
                            : 'text-gray-600 hover:text-gray-900'
                        } text-xs leading-snug`}
                      >
                        {lesson.title}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        <div className="mt-2">
          <CourseCalendar courseId={courseId} compact />
        </div>
      </div>
    </div>
  )
}
