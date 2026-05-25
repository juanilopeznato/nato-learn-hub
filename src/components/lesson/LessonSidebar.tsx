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
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden h-full flex flex-col shadow-sm">
      {/* Header con progress ring */}
      <div className="p-4 border-b border-border/40 bg-gradient-to-b from-secondary/30 to-transparent">
        <div className="flex items-center gap-3">
          {/* Anillo de progreso SVG */}
          <div className="relative shrink-0 w-11 h-11">
            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="18" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
              <circle
                cx="22" cy="22" r="18"
                fill="none"
                stroke={progressPercent === 100 ? 'hsl(var(--accent))' : 'hsl(var(--primary))'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 18}`}
                strokeDashoffset={`${2 * Math.PI * 18 * (1 - progressPercent / 100)}`}
                className="transition-all duration-700 ease-apple"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-foreground tabular-nums">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-semibold text-foreground text-sm leading-snug line-clamp-2 tracking-tight">{courseTitle}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{completedCount}/{totalLessons} lecciones</p>
          </div>
        </div>
      </div>

      {/* Mapa visual del curso */}
      <div className="overflow-y-auto flex-1 py-4 px-4 flex flex-col gap-5">
        {sorted.map((module, moduleIdx) => {
          const sortedLessons = [...module.lessons].sort((a, b) => a.order_index - b.order_index)
          const moduleCompleted = sortedLessons.every(l => completedLessonIds.has(l.id))

          return (
            <div key={module.id}>
              {/* Módulo header */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  moduleCompleted ? 'bg-accent/15 text-accent' : 'bg-secondary text-muted-foreground'
                }`}>
                  <span className="text-[10px] font-bold">{moduleIdx + 1}</span>
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
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
                    <div key={lesson.id} className="flex gap-3 group/lesson">
                      {/* Línea + nodo */}
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => navigate(`/learn/${courseSlug}/${lesson.id}`)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ease-apple z-10 ${
                            isCompleted
                              ? 'bg-accent shadow-sm shadow-accent/30 hover:scale-110'
                              : isCurrent
                              ? 'bg-primary ring-4 ring-primary/20 shadow-md shadow-primary/25'
                              : 'bg-card border-2 border-border hover:border-primary/60 hover:scale-110'
                          }`}
                          title={lesson.title}
                          aria-current={isCurrent ? 'true' : undefined}
                          aria-label={`${lesson.title}${isCompleted ? ' (completada)' : ''}`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-3.5 h-3.5 text-accent-foreground" />
                          ) : isCurrent ? (
                            <span className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 group-hover/lesson:bg-primary/60 transition-colors" />
                          )}
                        </button>
                        {/* Línea conectora */}
                        {!isLast && (
                          <div className={`w-0.5 flex-1 min-h-[20px] my-0.5 transition-colors ${
                            isCompleted ? 'bg-accent/50' : 'bg-border'
                          }`} />
                        )}
                      </div>

                      {/* Título de la lección */}
                      <button
                        onClick={() => navigate(`/learn/${courseSlug}/${lesson.id}`)}
                        className={`text-left pb-3 flex-1 min-w-0 transition-colors text-xs leading-snug ${
                          isCurrent
                            ? 'text-primary font-semibold'
                            : isCompleted
                            ? 'text-muted-foreground hover:text-foreground line-through decoration-muted-foreground/40'
                            : 'text-foreground/75 hover:text-foreground'
                        }`}
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
