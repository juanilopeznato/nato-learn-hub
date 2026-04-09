import { Link } from 'react-router-dom'
import { BookOpen, Clock, ArrowRight, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export default function CoursesSection() {
  const { tenant } = useAuth()

  const { data: courses, isLoading } = useQuery({
    queryKey: ['public-courses', tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select(`
          id, title, slug, description, price, currency, is_free, thumbnail_url,
          modules (
            lessons (id)
          )
        `)
        .eq('tenant_id', tenant!.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  if (isLoading) {
    return (
      <section id="courses" className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl h-64 animate-pulse border border-gray-100" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!courses?.length) {
    return (
      <section id="courses" className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">Próximamente nuevos cursos.</p>
        </div>
      </section>
    )
  }

  return (
    <section id="courses" className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Nuestros <span className="text-gradient-hero">cursos</span>
          </h2>
          <p className="text-gray-500 text-lg">
            Formación práctica para resultados reales.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => {
            const totalLessons = course.modules?.reduce(
              (acc: number, m: { lessons: unknown[] }) => acc + (m.lessons?.length ?? 0), 0
            ) ?? 0

            return (
              <Link
                key={course.id}
                to={`/courses/${course.slug}`}
                className="group bg-white rounded-xl border border-gray-200 hover:border-primary/40 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col"
              >
                {/* Thumbnail o placeholder */}
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-gradient-hero flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-white/60" />
                  </div>
                )}

                <div className="p-5 flex flex-col flex-1 gap-3">
                  {/* Badge precio */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      course.is_free
                        ? 'bg-green-50 text-green-600'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {course.is_free ? 'Gratis' : `ARS ${Number(course.price).toLocaleString('es-AR')}`}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <BookOpen className="w-3 h-3" />
                      {totalLessons} lecciones
                    </span>
                  </div>

                  <h3 className="font-heading font-semibold text-gray-900 leading-snug group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>

                  {course.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed flex-1">
                      {course.description}
                    </p>
                  )}

                  <div className="flex items-center gap-1 text-sm text-primary font-medium mt-auto pt-2 border-t border-gray-100">
                    Ver curso
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
