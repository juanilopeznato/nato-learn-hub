import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Search, LogIn, Star } from 'lucide-react'

type Course = {
  id: string
  title: string
  slug: string
  description: string | null
  price: number | null
  is_free: boolean
  thumbnail_url: string | null
  category: string | null
  is_featured: boolean
}

const CATEGORIES = [
  { value: '', label: 'Todos' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'negocios', label: 'Negocios' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'diseño', label: 'Diseño' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'fotografia', label: 'Fotografía' },
  { value: 'musica', label: 'Música' },
  { value: 'productividad', label: 'Productividad' },
  { value: 'idiomas', label: 'Idiomas' },
  { value: 'otro', label: 'Otro' },
]

function CourseCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-6 bg-gray-200 rounded w-16" />
          <div className="h-9 bg-gray-200 rounded w-24" />
        </div>
      </div>
    </div>
  )
}

function CourseInitialGradient({ title }: { title: string }) {
  const gradients = [
    'from-yellow-400 to-orange-500',
    'from-primary to-yellow-300',
    'from-orange-400 to-rose-400',
    'from-amber-400 to-yellow-500',
    'from-violet-500 to-primary',
  ]
  const idx = title.charCodeAt(0) % gradients.length
  return (
    <div className={`h-44 bg-gradient-to-br ${gradients[idx]} flex items-center justify-center`}>
      <span className="text-white text-5xl font-heading font-bold select-none">
        {title.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

export default function Courses() {
  const { tenant, user, profile } = useAuth()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all')

  useEffect(() => {
    document.title = `Cursos — ${tenant?.name ?? 'NATO University'}`
    return () => { document.title = tenant?.name ?? 'NATO University' }
  }, [tenant])

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, slug, description, price, is_free, thumbnail_url, category, is_featured')
        .eq('is_published', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Course[]
    },
  })

  const { data: lessonCounts = [] } = useQuery({
    queryKey: ['courses-lesson-counts'],
    enabled: courses.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('lessons')
        .select('course_id')
        .in('course_id', courses.map(c => c.id))
      const map: Record<string, number> = {}
      data?.forEach(row => { map[row.course_id] = (map[row.course_id] ?? 0) + 1 })
      return Object.entries(map).map(([course_id, count]) => ({ course_id, count }))
    },
  })

  const lessonCountMap = Object.fromEntries(lessonCounts.map(lc => [lc.course_id, lc.count]))

  const filtered = courses.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.description ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCategory = !category || c.category === category
    const matchPrice = priceFilter === 'all' ||
      (priceFilter === 'free' && c.is_free) ||
      (priceFilter === 'paid' && !c.is_free)
    return matchSearch && matchCategory && matchPrice
  })

  const hasFilters = search || category || priceFilter !== 'all'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenant?.name ?? 'NATO University'} className="h-8 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Button variant="ghost" size="sm" asChild>
                <Link to={['instructor', 'admin', 'nato_owner'].includes(profile?.role ?? '') ? '/instructor' : '/dashboard'}>
                  Mi panel
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login"><LogIn className="w-4 h-4 mr-1" />Ingresar</Link>
                </Button>
                <Button variant="hero" size="sm" asChild>
                  <Link to="/signup">Comenzar gratis</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Sticky filter bar */}
      <div className="sticky top-16 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 py-3 space-y-3">
          {/* Search + price */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar cursos..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'free', 'paid'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPriceFilter(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    priceFilter === p
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p === 'all' ? 'Todos' : p === 'free' ? 'Gratis' : 'De pago'}
                </button>
              ))}
            </div>
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  category === cat.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-gray-900">
              {category ? CATEGORIES.find(c => c.value === category)?.label : 'Todos los cursos'}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {filtered.length} {filtered.length === 1 ? 'curso' : 'cursos'} encontrado{filtered.length === 1 ? '' : 's'}
            </p>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setCategory(''); setPriceFilter('all') }}>
              Limpiar filtros
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <CourseCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-14 text-center space-y-4 border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-heading text-xl font-semibold text-gray-900">Sin resultados</h3>
            <p className="text-gray-500 max-w-xs mx-auto">
              No encontramos cursos con esos criterios.
            </p>
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setCategory(''); setPriceFilter('all') }}>
              Ver todos los cursos
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(course => {
              const totalLessons = lessonCountMap[course.id] ?? 0
              return (
                <Link
                  key={course.id}
                  to={`/courses/${course.slug}`}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group"
                >
                  {/* Thumbnail */}
                  <div className="relative">
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt={course.title} className="h-44 w-full object-cover" />
                    ) : (
                      <CourseInitialGradient title={course.title} />
                    )}
                    {course.is_featured && (
                      <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-900" />
                        Destacado
                      </div>
                    )}
                    {course.category && (
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full capitalize">
                        {course.category}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1 space-y-3">
                    <h2 className="font-heading text-base font-semibold text-gray-900 leading-snug group-hover:text-primary transition-colors">
                      {course.title}
                    </h2>
                    {course.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 flex-1">{course.description}</p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        {course.is_free || !course.price ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-xs font-semibold">
                            Gratis
                          </Badge>
                        ) : (
                          <span className="text-sm font-bold text-gray-900">
                            ARS {Number(course.price).toLocaleString('es-AR')}
                          </span>
                        )}
                        {totalLessons > 0 && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {totalLessons} {totalLessons === 1 ? 'clase' : 'clases'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-primary group-hover:underline">Ver curso →</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
