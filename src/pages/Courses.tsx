import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Search, LogIn, Star } from 'lucide-react'
import { SmartImage } from '@/components/SmartImage'
import { canonicalUrl, absoluteUrl } from '@/lib/seo'

type Course = {
  id: string
  title: string
  slug: string
  description: string | null
  price: number | null
  is_free: boolean
  billing_type: 'free' | 'one_time' | 'monthly' | 'annual' | null
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

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, slug, description, price, is_free, billing_type, thumbnail_url, category, is_featured')
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

  const { data: reviewStats = [] } = useQuery({
    queryKey: ['courses-review-stats'],
    enabled: courses.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('course_reviews')
        .select('course_id, rating')
        .in('course_id', courses.map(c => c.id))
      const map: Record<string, { sum: number; count: number }> = {}
      data?.forEach(r => {
        if (!map[r.course_id]) map[r.course_id] = { sum: 0, count: 0 }
        map[r.course_id].sum += r.rating
        map[r.course_id].count += 1
      })
      return Object.entries(map).map(([course_id, s]) => ({
        course_id,
        avg: s.sum / s.count,
        count: s.count,
      }))
    },
  })

  const reviewMap = Object.fromEntries(reviewStats.map(r => [r.course_id, r]))

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

  const tenantName = tenant?.name ?? 'NATO University'

  return (
    <div className="min-h-screen bg-secondary/30">
      <Helmet>
        <title>Cursos — {tenantName}</title>
        <meta name="description" content={`Explorá todos los cursos disponibles en ${tenantName}. Aprendé marketing digital, negocios, contenido y más.`} />
        <link rel="canonical" href={canonicalUrl('/courses')} />
        <meta property="og:title" content={`Cursos — ${tenantName}`} />
        <meta property="og:description" content={`Explorá todos los cursos disponibles en ${tenantName}.`} />
        <meta property="og:url" content={canonicalUrl('/courses')} />
        <meta property="og:image" content={absoluteUrl('/nato-logo.png')} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={tenantName} />
        <meta property="og:locale" content="es_AR" />
      </Helmet>
      {/* Header — glass al scrollear */}
      <header className="glass-light sticky top-0 z-40">
        <div className="container h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenant?.name ?? 'NATO University'} className="h-7 w-auto object-contain transition-transform duration-200 ease-apple group-hover:scale-105" loading="lazy" decoding="async" />
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
                  <Link to="/login"><LogIn aria-hidden />Ingresar</Link>
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
      <div className="sticky top-16 z-30 glass-light">
        <div className="container py-3 space-y-3">
          {/* Search + price */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cursos..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-1.5 p-1 bg-secondary rounded-full border border-border/60">
              {(['all', 'free', 'paid'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriceFilter(p)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ease-apple ${
                    priceFilter === p
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p === 'all' ? 'Todos' : p === 'free' ? 'Gratis' : 'De pago'}
                </button>
              ))}
            </div>
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-6 px-6">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`shrink-0 h-7 px-3 rounded-full text-xs font-medium transition-all duration-200 ease-apple ${
                  category === cat.value
                    ? 'bg-foreground text-background'
                    : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container py-12 space-y-8 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-display-md text-foreground">
              {category ? CATEGORIES.find(c => c.value === category)?.label : 'Todos los cursos'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
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
          <div className="rounded-2xl bg-card border border-border/60 p-16 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <BookOpen className="w-7 h-7 text-primary" aria-hidden />
            </div>
            <div>
              <h3 className="font-heading text-display-sm text-foreground">Sin resultados</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1.5">
                No encontramos cursos{search ? ` para "${search}"` : ' con esos filtros'}.
              </p>
            </div>
            <Button variant="hero" size="sm" onClick={() => { setSearch(''); setCategory(''); setPriceFilter('all') }}>
              Ver todos los cursos
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(course => {
              const totalLessons = lessonCountMap[course.id] ?? 0
              const review = reviewMap[course.id]
              return (
                <Link
                  key={course.id}
                  to={`/courses/${course.slug}`}
                  className="group rounded-2xl bg-card border border-border/60 overflow-hidden flex flex-col transition-all duration-200 ease-apple hover:shadow-lg hover:-translate-y-1 hover:border-border"
                >
                  {/* Thumbnail */}
                  <div className="relative overflow-hidden">
                    {course.thumbnail_url ? (
                      <SmartImage src={course.thumbnail_url} alt={course.title} size="sm" className="h-44 w-full object-cover transition-transform duration-500 ease-apple group-hover:scale-[1.04]" />
                    ) : (
                      <CourseInitialGradient title={course.title} />
                    )}
                    {course.is_featured && (
                      <Badge variant="default" size="sm" className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 gap-1 shadow-sm">
                        <Star className="w-3 h-3 fill-yellow-900" aria-hidden />
                        Destacado
                      </Badge>
                    )}
                    {course.category && (
                      <Badge size="sm" className="absolute top-3 right-3 bg-background/90 text-foreground backdrop-blur-sm capitalize border border-border/40">
                        {course.category}
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1 space-y-3">
                    <h2 className="font-heading text-base font-semibold text-foreground leading-snug group-hover:text-primary transition-colors duration-150">
                      {course.title}
                    </h2>
                    {review && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" aria-hidden />
                        <span className="font-semibold text-foreground">{review.avg.toFixed(1)}</span>
                        <span>({review.count} {review.count === 1 ? 'opinión' : 'opiniones'})</span>
                      </div>
                    )}
                    {course.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 flex-1 leading-relaxed">{course.description}</p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <div className="flex items-center gap-2 flex-wrap">
                        {(() => {
                          const bt = course.billing_type ?? (course.is_free ? 'free' : 'one_time')
                          if (bt === 'free' || !course.price) return (
                            <Badge variant="success" size="sm">Gratis</Badge>
                          )
                          const suffix = bt === 'monthly' ? '/mes' : bt === 'annual' ? '/año' : ''
                          return (
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-bold text-foreground tabular-nums">
                                ARS {Number(course.price).toLocaleString('es-AR')}
                              </span>
                              {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
                            </div>
                          )
                        })()}
                        {totalLessons > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <BookOpen className="w-3 h-3" aria-hidden />
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
