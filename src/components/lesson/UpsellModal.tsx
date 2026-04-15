import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface Props {
  open: boolean
  onClose: () => void
  tenantId: string
  completedCourseId: string
}

export function UpsellModal({ open, onClose, tenantId, completedCourseId }: Props) {
  const { data: courses = [] } = useQuery({
    queryKey: ['upsell-courses', tenantId, completedCourseId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, title, slug, description, thumbnail_url, price, is_free')
        .eq('tenant_id', tenantId)
        .eq('is_published', true)
        .neq('id', completedCourseId)
        .order('is_featured', { ascending: false })
        .limit(3)
      return data ?? []
    },
  })

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-3xl mb-2">🎓</div>
          <h2 className="font-heading text-xl font-bold">¡Felicitaciones!</h2>
          <p className="text-white/80 text-sm mt-1">
            Completaste el curso. ¿Qué aprendés ahora?
          </p>
        </div>

        {/* Cursos sugeridos */}
        <div className="p-5 space-y-3">
          {courses.length > 0 ? (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Cursos que te pueden interesar
              </p>
              <div className="space-y-2">
                {courses.map(course => (
                  <Link
                    key={course.id}
                    to={`/courses/${course.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                  >
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-14 h-10 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                        {course.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {course.is_free ? 'Gratis' : `ARS ${Number(course.price).toLocaleString('es-AR')}`}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              Explorá todos los cursos disponibles
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="hero" className="flex-1" asChild onClick={onClose}>
              <Link to="/courses">
                Ver todos los cursos
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button variant="outline" onClick={onClose} className="shrink-0">
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
