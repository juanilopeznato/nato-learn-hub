import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCourseTracking } from '@/hooks/useCourseTracking'
import {
  BookOpen, Clock, ArrowRight, Lock, ChevronDown, CheckCircle,
  Play, Users, Star, Shield, Award, ChevronUp, ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useState, useEffect, useRef } from 'react'
import { MetaPixel, fbTrack } from '@/components/MetaPixel'

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { user, profile, tenant } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [expandedFaq, setExpandedFaq] = useState<Set<number>>(new Set())
  const [stickyVisible, setStickyVisible] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  // Show sticky CTA after hero scrolls out
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 }
    )
    if (heroRef.current) observer.observe(heroRef.current)
    return () => observer.disconnect()
  }, [])

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`*, modules(id, title, order_index, lessons(id, title, order_index, duration_seconds, is_free_preview))`)
        .eq('slug', slug!)
        .eq('is_published', true)
        .single()
      if (error) throw error
      return data
    },
  })

  const { trackCtaClick, trackCheckoutStart, trackEnrollment } = useCourseTracking({
    courseId: course?.id ?? '',
    tenantId: course?.tenant_id ?? '',
    profileId: profile?.id,
  })

  const { data: enrollment } = useQuery({
    queryKey: ['enrollment', course?.id, profile?.id],
    enabled: !!course?.id && !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', course!.id)
        .eq('student_id', profile!.id)
        .maybeSingle()
      return data
    },
  })

  const { data: enrollmentCount } = useQuery({
    queryKey: ['enrollment-count', course?.id],
    enabled: !!course?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', course!.id)
      return count ?? 0
    },
  })

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !course) throw new Error('No hay sesión')
      const { error } = await supabase.from('enrollments').insert({
        course_id: course.id,
        student_id: profile.id,
        mp_status: 'free',
        amount_paid: 0,
      })
      if (error) throw error
    },
    onSuccess: () => {
      trackEnrollment()
      fbTrack('Purchase', { content_name: course?.title, value: 0, currency: 'ARS' })
      queryClient.invalidateQueries({ queryKey: ['enrollment'] })
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      toast.success('¡Inscripción exitosa! Empezá a aprender.')
      const firstLesson = sortedModules[0]?.lessons?.sort((a, b) => a.order_index - b.order_index)[0]
      if (firstLesson?.id) navigate(`/learn/${slug}/${firstLesson.id}`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const buyMutation = useMutation({
    mutationFn: async () => {
      if (!user || !profile || !course) throw new Error('Sin sesión')
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mp-preference`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ course_id: course.id }),
        }
      )
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Error al procesar el pago')
      return data.init_point as string
    },
    onSuccess: (initPoint) => { trackCheckoutStart(); fbTrack('InitiateCheckout', { content_name: course?.title, value: Number(course?.price ?? 0), currency: 'ARS' }); window.location.href = initPoint },
    onError: (e: Error) => toast.error(e.message),
  })

  function toggleModule(id: string) {
    setExpandedModules(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleFaq(i: number) {
    setExpandedFaq(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
  }

  const sortedModules = [...(course?.modules ?? [])].sort((a, b) => a.order_index - b.order_index)
  const totalLessons = sortedModules.reduce((acc, m) => acc + (m.lessons?.length ?? 0), 0)
  const outcomes: string[] = (course as any)?.learning_outcomes ?? []
  const faqItems: { q: string; a: string }[] = (course as any)?.faq ?? []
  const instructorBio: string = (course as any)?.instructor_bio ?? ''
  const instructorAvatar: string = (course as any)?.instructor_avatar_url ?? ''
  const forWho: string = (course as any)?.for_who ?? ''
  const thumbnailUrl: string = course?.thumbnail_url ?? ''
  const introVideo: string = (course as any)?.intro_video_url ?? ''
  const originalPrice: number = Number((course as any)?.original_price ?? 0)
  const pixelId: string = (course as any)?.meta_pixel_id || (tenant as any)?.meta_pixel_id || ''

  function handleCTA() {
    if (!user) { navigate('/login'); return }
    if (enrollment) {
      const first = sortedModules[0]?.lessons?.sort((a, b) => a.order_index - b.order_index)[0]
      if (first) navigate(`/learn/${slug}/${first.id}`)
      return
    }
    trackCtaClick()
    fbTrack('AddToCart', { content_name: course?.title, value: Number(course?.price ?? 0), currency: 'ARS' })
    if (course?.is_free) enrollMutation.mutate()
    else buyMutation.mutate()
  }

  const ctaLabel = enrollment
    ? 'Ir al curso'
    : course?.is_free
    ? (enrollMutation.isPending ? 'Inscribiendo...' : 'Inscribirse gratis')
    : (buyMutation.isPending ? 'Redirigiendo...' : `Comprar — ARS ${Number(course?.price ?? 0).toLocaleString('es-AR')}`)

  // SEO meta tags
  useEffect(() => {
    if (!course) return
    document.title = `${course.title} — ${tenant?.name ?? 'NATO University'}`
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement
      if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el) }
      el.content = content
    }
    const setOg = (prop: string, content: string) => {
      let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el) }
      el.content = content
    }
    setMeta('description', course.description?.slice(0, 160) ?? course.title)
    setOg('og:title', course.title)
    setOg('og:description', course.description?.slice(0, 160) ?? course.title)
    setOg('og:image', course.thumbnail_url ?? '')
    setOg('og:url', window.location.href)
    setOg('og:type', 'website')
    return () => { document.title = tenant?.name ?? 'NATO University' }
  }, [course, tenant])

  if (isLoading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!course) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <p className="text-gray-900 font-medium">Curso no encontrado.</p>
        <Link to="/courses" className="text-primary text-sm hover:underline">Ver todos los cursos</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      {pixelId && <MetaPixel pixelId={pixelId} />}
      {/* Sticky CTA bar */}
      <div className={`fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-700 transition-all duration-300 ${stickyVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <span className="font-heading font-semibold text-white truncate text-sm">{course.title}</span>
          <Button variant="hero" size="sm" onClick={handleCTA} disabled={enrollMutation.isPending || buyMutation.isPending} className="shrink-0">
            {ctaLabel}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* HERO */}
      <div ref={heroRef} className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
            <Link to="/" className="hover:text-white transition-colors">
              <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenant?.name} className="h-6 w-auto object-contain brightness-0 invert opacity-70" />
            </Link>
            <span>/</span>
            <Link to="/courses" className="hover:text-white transition-colors">Cursos</Link>
            <span>/</span>
            <span className="text-gray-300">{course.title}</span>
          </div>

          <div className="grid lg:grid-cols-5 gap-10 pb-12">
            {/* Left: text content */}
            <div className="lg:col-span-3 space-y-6">
              <div className="space-y-4">
                {course.is_free ? (
                  <Badge className="bg-accent/20 text-accent border-accent/30 text-xs">Gratis</Badge>
                ) : (
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Premium</Badge>
                )}
                <h1 className="font-heading text-3xl md:text-4xl font-bold text-white leading-tight">
                  {course.title}
                </h1>
                {course.description && (
                  <p className="text-gray-300 text-lg leading-relaxed">{course.description}</p>
                )}
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {(enrollmentCount ?? 0) > 0 && (
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <Users className="w-4 h-4 text-primary" />
                    {enrollmentCount} estudiantes
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-gray-300">
                  <BookOpen className="w-4 h-4 text-primary" />
                  {totalLessons} lecciones
                </span>
                <span className="flex items-center gap-1.5 text-gray-300">
                  <Clock className="w-4 h-4 text-primary" />
                  {sortedModules.length} módulos
                </span>
                <span className="flex items-center gap-1.5 text-yellow-400">
                  <Award className="w-4 h-4" />
                  Certificado incluido
                </span>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: Shield, text: 'Acceso de por vida' },
                  { icon: Star, text: 'Contenido actualizado' },
                  { icon: Award, text: 'Certificado verificable' },
                ].map(b => (
                  <span key={b.text} className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 rounded-full px-3 py-1">
                    <b.icon className="w-3.5 h-3.5 text-primary" />
                    {b.text}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: buy card (desktop) / thumbnail */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Thumbnail / preview */}
                {thumbnailUrl ? (
                  <div className="relative aspect-video bg-gray-100 overflow-hidden">
                    <img src={thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                    {introVideo && (
                      <button className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors group">
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-7 h-7 text-gray-900 ml-1" />
                        </div>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <span className="font-heading text-6xl font-bold text-white/20">
                      {course.title[0]}
                    </span>
                  </div>
                )}

                {/* Price + CTA */}
                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    {course.is_free ? (
                      <span className="font-heading text-3xl font-bold text-gray-900">Gratis</span>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="font-heading text-3xl font-bold text-gray-900">
                          ARS {Number(course.price).toLocaleString('es-AR')}
                        </span>
                        {originalPrice > 0 && (
                          <span className="text-gray-400 text-lg line-through">
                            ARS {originalPrice.toLocaleString('es-AR')}
                          </span>
                        )}
                        {originalPrice > 0 && (
                          <Badge className="bg-green-50 text-green-700 border-green-100 text-xs">
                            {Math.round((1 - Number(course.price) / originalPrice) * 100)}% OFF
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full text-base h-12"
                    onClick={handleCTA}
                    disabled={enrollMutation.isPending || buyMutation.isPending}
                  >
                    {ctaLabel}
                    <ArrowRight className="w-5 h-5" />
                  </Button>

                  {!user && (
                    <p className="text-xs text-center text-gray-500">
                      <Link to="/login" className="text-primary hover:underline">Iniciá sesión</Link> para inscribirte
                    </p>
                  )}

                  <div className="border-t border-gray-100 pt-4 space-y-2">
                    {[
                      'Acceso inmediato al contenido',
                      'Certificado al completar',
                      'Comunidad de estudiantes',
                      'Recursos descargables',
                    ].map(item => (
                      <div key={item} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="container mx-auto px-4 py-14">
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-14">

            {/* Qué vas a aprender */}
            {outcomes.filter(Boolean).length > 0 && (
              <section>
                <h2 className="font-heading text-2xl font-bold text-gray-900 mb-6">¿Qué vas a aprender?</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {outcomes.filter(Boolean).map((outcome, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{outcome}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Para quién es */}
            {forWho && (
              <section>
                <h2 className="font-heading text-2xl font-bold text-gray-900 mb-4">¿Para quién es este curso?</h2>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                  <p className="text-gray-700 leading-relaxed">{forWho}</p>
                </div>
              </section>
            )}

            {/* Contenido del curso */}
            <section>
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="font-heading text-2xl font-bold text-gray-900">Contenido del curso</h2>
                <span className="text-sm text-gray-500">{sortedModules.length} módulos · {totalLessons} lecciones</span>
              </div>
              <div className="space-y-2">
                {sortedModules.map(module => (
                  <div key={module.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => toggleModule(module.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{module.title}</span>
                        <span className="text-xs text-gray-400 hidden sm:block">{module.lessons?.length ?? 0} lecciones</span>
                      </div>
                      {expandedModules.has(module.id)
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />
                      }
                    </button>
                    {expandedModules.has(module.id) && (
                      <div className="border-t border-gray-100 divide-y divide-gray-50">
                        {[...(module.lessons ?? [])].sort((a, b) => a.order_index - b.order_index).map(lesson => (
                          <div key={lesson.id} className="flex items-center justify-between px-4 py-3 bg-gray-50/50">
                            <div className="flex items-center gap-3">
                              {lesson.is_free_preview
                                ? <Play className="w-3.5 h-3.5 text-primary shrink-0" />
                                : enrollment
                                ? <Play className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                : <Lock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                              }
                              <span className="text-sm text-gray-700">{lesson.title}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {lesson.is_free_preview && (
                                <span className="text-xs text-primary font-medium">Vista previa</span>
                              )}
                              {lesson.duration_seconds && (
                                <span className="text-xs text-gray-400">
                                  {Math.floor(lesson.duration_seconds / 60)}min
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Instructor */}
            {instructorBio && (
              <section>
                <h2 className="font-heading text-2xl font-bold text-gray-900 mb-6">Tu instructor</h2>
                <div className="flex items-start gap-5">
                  {instructorAvatar ? (
                    <img src={instructorAvatar} alt="Instructor" className="w-20 h-20 rounded-full object-cover shrink-0 border-2 border-primary/20" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-9 h-9 text-primary" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-gray-700 leading-relaxed">{instructorBio}</p>
                  </div>
                </div>
              </section>
            )}

            {/* FAQ */}
            {faqItems.filter(f => f.q).length > 0 && (
              <section>
                <h2 className="font-heading text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes</h2>
                <div className="space-y-2">
                  {faqItems.filter(f => f.q).map((item, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                        onClick={() => toggleFaq(i)}
                      >
                        <span className="font-medium text-gray-900">{item.q}</span>
                        {expandedFaq.has(i) ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                      </button>
                      {expandedFaq.has(i) && (
                        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/50">
                          <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right sidebar (desktop) — sticky CTA */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 space-y-4">
                <div>
                  {course.is_free ? (
                    <span className="font-heading text-3xl font-bold text-gray-900">Gratis</span>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-heading text-3xl font-bold text-gray-900">
                          ARS {Number(course.price).toLocaleString('es-AR')}
                        </span>
                      </div>
                      {originalPrice > 0 && (
                        <p className="text-sm text-gray-400 line-through">
                          Antes ARS {originalPrice.toLocaleString('es-AR')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={handleCTA}
                  disabled={enrollMutation.isPending || buyMutation.isPending}
                >
                  {ctaLabel}
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <div className="space-y-2 border-t pt-4">
                  {['Acceso inmediato', 'Certificado al completar', 'Comunidad incluida', 'Recursos descargables'].map(item => (
                    <div key={item} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Share */}
              <div className="text-center">
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copiado') }}
                  className="text-xs text-gray-400 hover:text-primary transition-colors flex items-center gap-1 mx-auto"
                >
                  <ExternalLink className="w-3 h-3" />
                  Compartir este curso
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 p-3 shadow-lg">
        <Button
          variant="hero"
          size="lg"
          className="w-full"
          onClick={handleCTA}
          disabled={enrollMutation.isPending || buyMutation.isPending}
        >
          {ctaLabel}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
