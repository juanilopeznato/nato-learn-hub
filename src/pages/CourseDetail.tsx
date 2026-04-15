import { Helmet } from 'react-helmet-async'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCourseTracking } from '@/hooks/useCourseTracking'
import {
  BookOpen, Clock, ArrowRight, Lock, ChevronDown, CheckCircle,
  Play, Users, Star, Shield, Award, ChevronUp, ExternalLink, Tag, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discount_type: string; discount_value: number } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewHover, setReviewHover] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

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

  const { data: reviews, refetch: refetchReviews } = useQuery({
    queryKey: ['course-reviews', course?.id],
    enabled: !!course?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('course_reviews')
        .select('*, reviewer:profiles(full_name, avatar_url)')
        .eq('course_id', course!.id)
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const { data: myEnrollmentId } = useQuery({
    queryKey: ['my-enrollment-id', course?.id, profile?.id],
    enabled: !!course?.id && !!profile?.id && !!enrollment,
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', course!.id)
        .eq('student_id', profile!.id)
        .in('mp_status', ['free', 'approved'])
        .maybeSingle()
      return data?.id ?? null
    },
  })

  const myReview = reviews?.find((r: any) => r.user_id === profile?.id)
  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length
    : null

  async function submitReview() {
    if (!reviewRating || !myEnrollmentId || !profile || !course) return
    setReviewSubmitting(true)
    const { error } = await supabase.from('course_reviews').upsert({
      course_id: course.id,
      user_id: profile.id,
      enrollment_id: myEnrollmentId,
      rating: reviewRating,
      comment: reviewComment.trim() || null,
    }, { onConflict: 'enrollment_id' })
    setReviewSubmitting(false)
    if (error) { toast.error(error.message); return }
    toast.success('¡Gracias por tu opinión!')
    refetchReviews()
    setReviewRating(0)
    setReviewComment('')
  }

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !course) throw new Error('No hay sesión')
      const { data: newEnrollment, error } = await supabase.from('enrollments').insert({
        course_id: course.id,
        student_id: profile.id,
        mp_status: 'free',
        amount_paid: 0,
      }).select('id').single()
      if (error) throw error
      return newEnrollment?.id
    },
    onSuccess: async (enrollmentId) => {
      trackEnrollment()
      fbTrack('Purchase', { content_name: course?.title, value: 0, currency: 'ARS' })
      queryClient.invalidateQueries({ queryKey: ['enrollment'] })
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      toast.success('¡Inscripción exitosa! Empezá a aprender.')
      // Fire-and-forget welcome email
      if (enrollmentId) {
        const { data: { session } } = await supabase.auth.getSession()
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ enrollment_id: enrollmentId }),
        }).catch(() => {/* ignore */})
      }
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
          body: JSON.stringify({ course_id: course.id, coupon_code: appliedCoupon?.code ?? undefined }),
        }
      )
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Error al procesar el pago')
      return data.init_point as string
    },
    onSuccess: (initPoint) => { trackCheckoutStart(); fbTrack('InitiateCheckout', { content_name: course?.title, value: discountedPrice, currency: 'ARS' }); window.location.href = initPoint },
    onError: (e: Error) => toast.error(e.message),
  })

  async function handleApplyCoupon() {
    if (!couponInput.trim() || !course) return
    setCouponLoading(true)
    setCouponError('')
    const code = couponInput.trim().toUpperCase()
    const { data } = await supabase
      .from('coupons')
      .select('id, code, discount_type, discount_value, max_uses, uses_count, expires_at, course_id, is_active')
      .eq('tenant_id', (course as any).tenant_id)
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle()
    setCouponLoading(false)

    if (!data) { setCouponError('Cupón inválido o no disponible'); return }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { setCouponError('Este cupón ya venció'); return }
    if (data.max_uses !== null && data.uses_count >= data.max_uses) { setCouponError('Este cupón ya alcanzó su límite de usos'); return }
    if (data.course_id !== null && data.course_id !== course.id) { setCouponError('Este cupón no aplica a este curso'); return }

    setAppliedCoupon({ id: data.id, code: data.code, discount_type: data.discount_type, discount_value: Number(data.discount_value) })
    setCouponInput('')
  }

  function removeCoupon() {
    setAppliedCoupon(null)
    setCouponError('')
  }

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
  const discountedPrice = appliedCoupon && course && !course.is_free
    ? appliedCoupon.discount_type === 'percent'
      ? Math.max(0, Number(course.price) * (1 - appliedCoupon.discount_value / 100))
      : Math.max(0, Number(course.price) - appliedCoupon.discount_value)
    : Number(course?.price ?? 0)

  function handleCTA() {
    if (!user) { navigate(`/login?redirect=/courses/${slug}`); return }
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
    : (buyMutation.isPending ? 'Redirigiendo...' : `Comprar — ARS ${discountedPrice.toLocaleString('es-AR')}`)

  // SEO — construido antes del return para que Helmet lo procese siempre
  const seoTitle = course ? `${course.title} — ${tenant?.name ?? 'NATO University'}` : 'NATO University'
  const seoDescription = course?.description?.slice(0, 160) ?? 'Curso online con certificado verificable.'
  const seoImage = course?.thumbnail_url ?? 'https://nato-learn-hub.vercel.app/nato-logo.png'
  const seoUrl = typeof window !== 'undefined' ? window.location.href : ''
  const schemaOrg = course ? JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: seoDescription,
    url: seoUrl,
    image: seoImage,
    provider: {
      '@type': 'Organization',
      name: tenant?.name ?? 'NATO University',
      url: typeof window !== 'undefined' ? window.location.origin : '',
    },
    offers: {
      '@type': 'Offer',
      price: course.is_free ? '0' : String(course.price ?? 0),
      priceCurrency: 'ARS',
      availability: 'https://schema.org/InStock',
      url: seoUrl,
    },
    numberOfCredits: totalLessons,
    educationalLevel: 'Beginner',
  }) : null

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
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={seoUrl} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={seoImage} />
        <meta property="og:url" content={seoUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={seoImage} />
        {schemaOrg && (
          <script type="application/ld+json">{schemaOrg}</script>
        )}
      </Helmet>
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

                  {/* Cupón de descuento (solo cursos pagos no inscriptos) */}
                  {!enrollment && !course.is_free && (
                    <div className="space-y-2">
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 text-green-700 text-sm">
                            <Tag className="w-4 h-4" />
                            <span className="font-medium">{appliedCoupon.code}</span>
                            <span className="text-green-600">
                              {appliedCoupon.discount_type === 'percent'
                                ? `−${appliedCoupon.discount_value}%`
                                : `−ARS ${appliedCoupon.discount_value.toLocaleString('es-AR')}`}
                            </span>
                          </div>
                          <button onClick={removeCoupon} className="text-green-500 hover:text-green-700">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            placeholder="¿Tenés un cupón?"
                            value={couponInput}
                            onChange={e => { setCouponInput(e.target.value); setCouponError('') }}
                            onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                            className="text-sm h-9"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleApplyCoupon}
                            disabled={couponLoading || !couponInput.trim()}
                            className="shrink-0 h-9"
                          >
                            {couponLoading ? '...' : 'Aplicar'}
                          </Button>
                        </div>
                      )}
                      {couponError && <p className="text-xs text-red-500">{couponError}</p>}
                    </div>
                  )}

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

            {/* Reviews */}
            {((reviews && reviews.length > 0) || (enrollment && myEnrollmentId && !myReview)) && (
              <section>
                <div className="flex items-baseline gap-3 mb-6">
                  <h2 className="font-heading text-2xl font-bold text-gray-900">Opiniones</h2>
                  {avgRating !== null && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{avgRating.toFixed(1)}</span>
                      <span className="text-sm text-gray-400">({reviews?.length ?? 0} {(reviews?.length ?? 0) === 1 ? 'opinión' : 'opiniones'})</span>
                    </div>
                  )}
                </div>

                {/* Form: dejar review */}
                {enrollment && myEnrollmentId && !myReview && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
                    <p className="text-sm font-semibold text-gray-700">¿Qué te pareció el curso?</p>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(s => (
                        <button
                          key={s}
                          onMouseEnter={() => setReviewHover(s)}
                          onMouseLeave={() => setReviewHover(0)}
                          onClick={() => setReviewRating(s)}
                        >
                          <Star className={`w-7 h-7 transition-colors ${s <= (reviewHover || reviewRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                        </button>
                      ))}
                    </div>
                    {reviewRating > 0 && (
                      <>
                        <textarea
                          placeholder="Contanos tu experiencia (opcional)"
                          value={reviewComment}
                          onChange={e => setReviewComment(e.target.value)}
                          rows={3}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <Button size="sm" onClick={submitReview} disabled={reviewSubmitting}>
                          {reviewSubmitting ? 'Enviando...' : 'Enviar opinión'}
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {/* Lista de reviews */}
                <div className="space-y-4">
                  {(reviews ?? []).map((r: any) => (
                    <div key={r.id} className="flex gap-4">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {r.reviewer?.avatar_url
                          ? <img src={r.reviewer.avatar_url} alt={r.reviewer.full_name} className="w-full h-full object-cover" />
                          : <span className="text-xs font-bold text-primary">{(r.reviewer?.full_name ?? '?')[0].toUpperCase()}</span>
                        }
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{r.reviewer?.full_name ?? 'Estudiante'}</span>
                          <div className="flex">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                            ))}
                          </div>
                          <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('es-AR')}</span>
                        </div>
                        {r.comment && <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>}
                      </div>
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
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-heading text-3xl font-bold text-gray-900">
                          ARS {discountedPrice.toLocaleString('es-AR')}
                        </span>
                        {(appliedCoupon || originalPrice > 0) && (
                          <span className="text-gray-400 text-lg line-through">
                            ARS {Number(course.price).toLocaleString('es-AR')}
                          </span>
                        )}
                        {appliedCoupon && (
                          <Badge className="bg-green-50 text-green-700 border-green-100 text-xs">
                            {appliedCoupon.discount_type === 'percent' ? `${appliedCoupon.discount_value}% OFF` : 'DESCUENTO'}
                          </Badge>
                        )}
                      </div>
                      {originalPrice > 0 && !appliedCoupon && (
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

                {/* Cupón de descuento sidebar */}
                {!enrollment && !course.is_free && (
                  <div className="space-y-2">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 text-green-700 text-sm">
                          <Tag className="w-4 h-4" />
                          <span className="font-medium">{appliedCoupon.code}</span>
                          <span className="text-green-600">
                            {appliedCoupon.discount_type === 'percent'
                              ? `−${appliedCoupon.discount_value}%`
                              : `−ARS ${appliedCoupon.discount_value.toLocaleString('es-AR')}`}
                          </span>
                        </div>
                        <button onClick={removeCoupon} className="text-green-500 hover:text-green-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Código de cupón"
                          value={couponInput}
                          onChange={e => { setCouponInput(e.target.value); setCouponError('') }}
                          onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                          className="text-sm h-9"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                          className="shrink-0 h-9"
                        >
                          {couponLoading ? '...' : 'Aplicar'}
                        </Button>
                      </div>
                    )}
                    {couponError && <p className="text-xs text-red-500">{couponError}</p>}
                  </div>
                )}

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
