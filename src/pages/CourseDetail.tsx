import { Helmet } from 'react-helmet-async'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useCourseTracking } from '@/hooks/useCourseTracking'
import {
  BookOpen, Clock, ArrowRight, Lock, ChevronDown, CheckCircle,
  Play, Users, Star, Shield, Award, ChevronUp, ExternalLink, Tag, X, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { SmartImage, SmartAvatar } from '@/components/SmartImage'
import { CourseDetailSkeleton } from '@/components/skeletons'
import { MarkdownLight } from '@/components/MarkdownLight'
import { toast } from 'sonner'
import { useState, useEffect, useRef } from 'react'
import { MetaPixel, fbTrack } from '@/components/MetaPixel'
import { events } from '@/lib/analytics'

/** Forma usada del curso. Los tipos generados de Supabase no se consumen. */
interface CourseDetailRow {
  id: string
  tenant_id: string
  slug: string | null
  title: string | null
  description: string | null
  thumbnail_url: string | null
  intro_video_url: string | null
  price: number | null
  original_price: number | null
  is_free: boolean | null
  is_published: boolean | null
  billing_type: 'free' | 'one_time' | 'monthly' | 'annual' | null
  learning_outcomes: string[] | null
  faq: { q: string; a: string }[] | null
  instructor_bio: string | null
  instructor_avatar_url: string | null
  for_who: string | null
  meta_pixel_id: string | null
  category: string | null
  modules: { id: string; title: string; order_index: number; lessons: { id: string; title: string; order_index: number; duration_seconds: number | null; is_free_preview: boolean | null }[] }[] | null
}

interface ReviewRow {
  id: string
  user_id: string
  rating: number
  body: string | null
  created_at: string
  reviewer: { full_name: string | null; avatar_url: string | null } | null
}

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { user, profile, tenant } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [expandedFaq, setExpandedFaq] = useState<Set<number>>(new Set())
  const [stickyVisible, setStickyVisible] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  // Mantenemos installments=1 como default — no ofrecemos "cuotas sin interés" en la app
  // por la comisión MP de 25-30%. El cliente puede pagar en cuotas con interés del banco
  // directamente en el checkout de MP sin costo extra para el vendedor.
  const installments = 1
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discount_type: string; discount_value: number } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')
  // Guest checkout — comprar sin crear cuenta (clave para el QR del evento)
  const [guestOpen, setGuestOpen] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewHover, setReviewHover] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [showIntro, setShowIntro] = useState(false)

  // Cerrar el modal de intro con Escape
  useEffect(() => {
    if (!showIntro) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowIntro(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showIntro])

  // Pago rechazado al volver de MP → avisar y limpiar el query param
  useEffect(() => {
    if (searchParams.get('payment') === 'failure') {
      toast.error('El pago no se pudo completar. Podés intentar de nuevo cuando quieras.')
      const next = new URLSearchParams(searchParams)
      next.delete('payment')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Show sticky CTA after hero scrolls out
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 }
    )
    if (heroRef.current) observer.observe(heroRef.current)
    return () => observer.disconnect()
  }, [])

  const { data: course, isLoading } = useQuery<CourseDetailRow | null>({
    queryKey: ['course', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`*, modules(id, title, order_index, lessons(id, title, order_index, duration_seconds, is_free_preview))`)
        .eq('slug', slug!)
        .eq('is_published', true)
        .single()
      if (error) throw error
      return (data ?? null) as unknown as CourseDetailRow | null
    },
  })

  const { trackCtaClick, trackCheckoutStart, trackEnrollment } = useCourseTracking({
    courseId: course?.id ?? '',
    tenantId: course?.tenant_id ?? '',
    profileId: profile?.id,
  })

  const [searchParams, setSearchParams] = useSearchParams()
  const paymentReturn = searchParams.get('payment') // success | pending | failure (back_url de MP)

  const { data: enrollment } = useQuery({
    queryKey: ['enrollment', course?.id, profile?.id],
    enabled: !!course?.id && !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('id, mp_status')
        .eq('course_id', course!.id)
        .eq('student_id', profile!.id)
        .maybeSingle()
      return data
    },
    // Cuando el usuario vuelve de MP con ?payment=success/pending, el enrollment
    // todavía está 'pending' hasta que el webhook async lo confirme. Hacemos polling
    // cada 2.5s para detectar el cambio a approved y mostrar el acceso al instante.
    refetchInterval: (query) => {
      if (paymentReturn !== 'success' && paymentReturn !== 'pending') return false
      const st = (query.state.data as { mp_status?: string } | null)?.mp_status
      return (st === 'approved' || st === 'free') ? false : 2500
    },
  })

  const isPaidAccess = enrollment?.mp_status === 'approved' || enrollment?.mp_status === 'free'

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

  const { data: reviews, refetch: refetchReviews } = useQuery<ReviewRow[]>({
    queryKey: ['course-reviews', course?.id],
    enabled: !!course?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('course_reviews')
        .select('*, reviewer:profiles(full_name, avatar_url)')
        .eq('course_id', course!.id)
        .order('created_at', { ascending: false })
      return (data ?? []) as unknown as ReviewRow[]
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

  const myReview = reviews?.find(r => r.user_id === profile?.id)
  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
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
          // installments=1 → MP igualmente le ofrece al cliente "cuotas con interés del banco"
          // en su propio checkout, sin que el vendedor pague costos extra de financiación.
          body: JSON.stringify({ course_id: course.id, coupon_code: appliedCoupon?.code ?? undefined, installments: 1 }),
        }
      )
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Error al procesar el pago')
      return data.init_point as string
    },
    onSuccess: (initPoint) => { trackCheckoutStart(); fbTrack('InitiateCheckout', { content_name: course?.title, value: discountedPrice, currency: 'ARS' }); events.checkoutStarted({ course: course?.slug, value: discountedPrice }); window.location.href = initPoint },
    onError: (e: Error) => toast.error(e.message),
  })

  // Guest checkout: paga sin sesión. La edge function crea/encuentra el usuario+profile,
  // arma el enrollment pendiente y devuelve el init_point de MP. Tras pagar, el webhook
  // le manda un mail de bienvenida con magic link de acceso passwordless.
  const guestMutation = useMutation({
    mutationFn: async () => {
      if (!course) throw new Error('Curso no disponible')
      const email = guestEmail.trim().toLowerCase()
      const full_name = guestName.trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Ingresá un email válido')
      if (full_name.length < 2) throw new Error('Ingresá tu nombre')
      const { data, error } = await supabase.functions.invoke('create-guest-preference', {
        body: { course_id: course.id, email, full_name, coupon_code: appliedCoupon?.code ?? undefined, installments: 1 },
      })
      if (error) {
        // El cuerpo de error de invoke viene en error.context cuando el status no es 2xx
        let code = ''
        try { code = (await (error as { context?: Response }).context?.json())?.error ?? '' } catch { /* noop */ }
        if (code === 'already_enrolled') throw new Error('Ya tenés este curso con ese email. Iniciá sesión para verlo.')
        throw new Error('No pudimos iniciar el pago. Probá de nuevo en un momento.')
      }
      if (data?.error) {
        if (data.error === 'already_enrolled') throw new Error('Ya tenés este curso con ese email. Iniciá sesión para verlo.')
        throw new Error('No pudimos iniciar el pago. Probá de nuevo.')
      }
      if (!data?.init_point) throw new Error('No pudimos iniciar el pago. Probá de nuevo.')
      return data.init_point as string
    },
    onSuccess: (initPoint) => {
      trackCheckoutStart()
      fbTrack('InitiateCheckout', { content_name: course?.title, value: discountedPrice, currency: 'ARS' })
      events.checkoutStarted({ course: course?.slug, value: discountedPrice })
      window.location.href = initPoint
    },
    onError: (e: Error) => toast.error(e.message),
  })

  async function applyCouponCode(rawCode: string, { silent = false } = {}) {
    if (!rawCode.trim() || !course) return
    setCouponLoading(true)
    setCouponError('')
    const code = rawCode.trim().toUpperCase()
    const { data } = await supabase
      .from('coupons')
      .select('id, code, discount_type, discount_value, max_uses, uses_count, expires_at, course_id, is_active')
      .eq('tenant_id', course.tenant_id)
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle()
    setCouponLoading(false)

    // silent = vino por URL (?cupon=X): no mostramos error si es inválido, solo lo ignoramos
    if (!data) { if (!silent) setCouponError('Cupón inválido o no disponible'); return }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { if (!silent) setCouponError('Este cupón ya venció'); return }
    if (data.max_uses !== null && data.uses_count >= data.max_uses) { if (!silent) setCouponError('Este cupón ya alcanzó su límite de usos'); return }
    if (data.course_id !== null && data.course_id !== course.id) { if (!silent) setCouponError('Este cupón no aplica a este curso'); return }

    setAppliedCoupon({ id: data.id, code: data.code, discount_type: data.discount_type, discount_value: Number(data.discount_value) })
    setCouponInput('')
    if (silent) toast.success(`Cupón ${data.code} aplicado 🎉`)
  }

  function handleApplyCoupon() {
    void applyCouponCode(couponInput)
  }

  // Auto-aplicar cupón desde la URL (?cupon=NATA) → campañas de IG/email con descuento embebido
  const urlCoupon = searchParams.get('cupon') ?? searchParams.get('cupón')
  useEffect(() => {
    if (urlCoupon && course && !appliedCoupon) {
      void applyCouponCode(urlCoupon, { silent: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCoupon, course?.id])

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
  const firstLessonId = sortedModules[0]?.lessons?.slice().sort((a, b) => a.order_index - b.order_index)[0]?.id
  const outcomes: string[] = course?.learning_outcomes ?? []
  const faqItems: { q: string; a: string }[] = course?.faq ?? []
  const instructorBio: string = course?.instructor_bio ?? ''
  const instructorAvatar: string = course?.instructor_avatar_url ?? ''
  const forWho: string = course?.for_who ?? ''
  const thumbnailUrl: string = course?.thumbnail_url ?? ''
  const introVideo: string = course?.intro_video_url ?? ''
  // Convierte el URL del intro (YouTube/Vimeo) a su URL de embed para el modal de preview
  const introEmbedUrl: string = (() => {
    if (!introVideo) return ''
    const yt = introVideo.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1&autoplay=1`
    const vm = introVideo.match(/vimeo\.com\/(?:video\/)?(\d+)/)
    if (vm) return `https://player.vimeo.com/video/${vm[1]}?title=0&byline=0&portrait=0&autoplay=1`
    return ''
  })()
  const originalPrice: number = Number(course?.original_price ?? 0)
  const tenantPixel = (tenant as (typeof tenant & { meta_pixel_id?: string | null }) | null)?.meta_pixel_id
  const pixelId: string = course?.meta_pixel_id || tenantPixel || ''
  const discountedPrice = appliedCoupon && course && !course.is_free
    ? appliedCoupon.discount_type === 'percent'
      ? Math.max(0, Number(course.price) * (1 - appliedCoupon.discount_value / 100))
      : Math.max(0, Number(course.price) - appliedCoupon.discount_value)
    : Number(course?.price ?? 0)

  const billingType: 'free' | 'one_time' | 'monthly' | 'annual' = course?.billing_type ?? (course?.is_free ? 'free' : 'one_time')
  const billingLabel = billingType === 'monthly' ? '/mes' : billingType === 'annual' ? '/año' : ''

  function handleCTA() {
    // Guard contra double-click — si una mutation ya está en curso, no disparar otra
    if (enrollMutation.isPending || buyMutation.isPending || guestMutation.isPending) return
    if (!user) {
      // Curso pago + visitante sin sesión → guest checkout (sin crear cuenta).
      // Curso gratis → necesita cuenta sí o sí, lo mandamos a login.
      if (billingType !== 'free') {
        trackCtaClick()
        fbTrack('AddToCart', { content_name: course?.title, value: Number(course?.price ?? 0), currency: 'ARS' })
        setGuestOpen(true)
      } else {
        navigate(`/login?redirect=/courses/${slug}`)
      }
      return
    }
    if (enrollment) {
      const first = sortedModules[0]?.lessons?.sort((a, b) => a.order_index - b.order_index)[0]
      if (first) navigate(`/learn/${slug}/${first.id}`)
      return
    }
    trackCtaClick()
    fbTrack('AddToCart', { content_name: course?.title, value: Number(course?.price ?? 0), currency: 'ARS' })
    if (billingType === 'free') enrollMutation.mutate()
    else buyMutation.mutate()
  }

  const ctaLabel = enrollment
    ? 'Ir al curso'
    : billingType === 'free'
    ? (enrollMutation.isPending ? 'Inscribiendo...' : 'Inscribirse gratis')
    : billingType === 'monthly'
    ? (buyMutation.isPending ? 'Redirigiendo...' : `Suscribirse — ARS ${discountedPrice.toLocaleString('es-AR')}/mes`)
    : billingType === 'annual'
    ? (buyMutation.isPending ? 'Redirigiendo...' : `Suscribirse — ARS ${discountedPrice.toLocaleString('es-AR')}/año`)
    : (buyMutation.isPending ? 'Redirigiendo...' : `Comprar — ARS ${discountedPrice.toLocaleString('es-AR')}`)

  // Contenido del botón de compra con spinner inline cuando está procesando
  const ctaPending = enrollMutation.isPending || buyMutation.isPending || guestMutation.isPending
  const ctaContent = <>{ctaPending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}{ctaLabel}</>

  // SEO — construido antes del return para que Helmet lo procese siempre.
  // OG image debe ser URL ABSOLUTA o WhatsApp/Telegram/iOS no la cargan.
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://natouniversity.lovable.app'
  const seoTitle = course ? `${course.title} — ${tenant?.name ?? 'NATO University'}` : 'NATO University'
  const seoDescription = course?.description?.slice(0, 160) ?? 'Curso online con certificado verificable.'
  // Si hay thumbnail del curso, optimizado a 1200x630 (standard OG). Si no, logo.
  const rawImage = course?.thumbnail_url ?? `${origin}/nato-logo.png`
  // Asegurar URL absoluta
  const seoImage = rawImage.startsWith('http') ? rawImage : `${origin}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`
  const seoUrl = typeof window !== 'undefined' ? window.location.href : ''
  // Schema.org Course enriquecido — Google rich snippets: rating, opiniones,
  // instructor, modo de entrega, duración. Validable en https://search.google.com/test/rich-results
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
      sameAs: typeof window !== 'undefined' ? window.location.origin : '',
    },
    offers: {
      '@type': 'Offer',
      price: course.is_free ? '0' : String(course.price ?? 0),
      priceCurrency: 'ARS',
      availability: 'https://schema.org/InStock',
      url: seoUrl,
      category: course.category ?? 'Education',
    },
    ...(avgRating !== null && reviews && reviews.length > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: avgRating.toFixed(1),
        reviewCount: reviews.length,
        bestRating: '5',
        worstRating: '1',
      },
      review: reviews.slice(0, 5).map(r => ({
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: r.rating,
          bestRating: '5',
        },
        author: {
          '@type': 'Person',
          name: r.reviewer?.full_name ?? 'Estudiante',
        },
        reviewBody: r.body ?? undefined,
        datePublished: r.created_at,
      })),
    } : {}),
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: `PT${Math.max(1, Math.round(totalLessons * 0.25))}H`,
      inLanguage: 'es-AR',
    },
    educationalLevel: 'Beginner',
    inLanguage: 'es-AR',
    isAccessibleForFree: course.is_free ?? false,
  }) : null

  if (isLoading) return <CourseDetailSkeleton />

  if (!course) return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-card rounded-2xl border border-border/60 p-8 text-center space-y-4">
        <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto" aria-hidden>
          <BookOpen className="w-6 h-6 text-muted-foreground/80" />
        </div>
        <div className="space-y-1">
          <h1 className="font-heading text-lg font-semibold text-foreground">No encontramos este curso</h1>
          <p className="text-sm text-muted-foreground">El link puede estar mal o el curso ya no está disponible.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="hero" className="flex-1">
            <Link to="/courses">Ver cursos</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/">Ir al inicio</Link>
          </Button>
        </div>
      </div>
    </div>
  )

  const dismissPaymentReturn = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('payment')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="min-h-screen bg-card pb-24 lg:pb-0">
      {/* Retorno post-pago de Mercado Pago — evita que el comprador caiga en la
          landing de venta mientras el webhook confirma async (fuente de pánico/chargebacks). */}
      {(paymentReturn === 'success' || paymentReturn === 'pending') && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/70 backdrop-blur-sm p-4 animate-fade-in" role="dialog" aria-modal="true">
          <div className="bg-card rounded-2xl shadow-2xl border border-border/60 max-w-md w-full p-8 text-center space-y-5">
            {isPaidAccess ? (
              <>
                <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-9 h-9 text-accent" aria-hidden />
                </div>
                <div className="space-y-1.5">
                  <h2 className="font-heading text-display-sm text-foreground tracking-tight">¡Listo! Ya tenés acceso 🎉</h2>
                  <p className="text-body-sm text-muted-foreground">Tu pago se confirmó. <strong className="text-foreground">{course.title}</strong> ya está disponible.</p>
                </div>
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={() => firstLessonId ? navigate(`/learn/${slug}/${firstLessonId}`) : navigate('/dashboard')}
                >
                  Empezar ahora
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" aria-hidden />
                </div>
                <div className="space-y-1.5">
                  <h2 className="font-heading text-display-sm text-foreground tracking-tight">Estamos confirmando tu pago…</h2>
                  <p className="text-body-sm text-muted-foreground">Esto puede tardar unos segundos. No cierres esta ventana — tu acceso se activa solo apenas se acredite.</p>
                </div>
                <button onClick={dismissPaymentReturn} className="text-xs text-muted-foreground/70 hover:text-foreground underline underline-offset-2">
                  Si ya pagaste y tarda, te mandamos un email con el acceso. Cerrar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={seoUrl} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={seoImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={seoTitle} />
        <meta property="og:url" content={seoUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={tenant?.name ?? 'NATO University'} />
        <meta property="og:locale" content="es_AR" />
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
      <div className={`fixed top-0 left-0 right-0 z-50 glass-light shadow-sm transition-all duration-300 ease-apple ${stickyVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="container h-14 flex items-center justify-between gap-4">
          <span className="font-heading font-semibold text-foreground truncate text-sm">{course.title}</span>
          <Button variant="hero" size="sm" onClick={handleCTA} disabled={enrollMutation.isPending || buyMutation.isPending} className="shrink-0">
            {ctaContent}
            <ArrowRight />
          </Button>
        </div>
      </div>

      {/* HERO — light con mesh sutil */}
      <div ref={heroRef} className="relative isolate bg-mesh-purple border-b border-border/40">
        <div className="absolute inset-0 bg-grid-light opacity-30 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)] pointer-events-none" />
        <div className="container relative z-10 py-6">
          {/* Breadcrumb + acceso a la cuenta */}
          <div className="flex items-center justify-between gap-3 mb-8">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
              <Link to="/" className="hover:text-foreground transition-colors shrink-0">
                <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenant?.name ?? 'NATO'} className="h-5 w-auto object-contain opacity-80" loading="lazy" decoding="async" />
              </Link>
              <span aria-hidden className="shrink-0">/</span>
              <Link to="/courses" className="hover:text-foreground transition-colors shrink-0">Cursos</Link>
              <span aria-hidden className="shrink-0">/</span>
              <span className="text-foreground/60 truncate">{course.title}</span>
            </nav>
            {user ? (
              <Link to="/dashboard" className="text-xs font-semibold text-primary hover:underline shrink-0">Mi panel</Link>
            ) : (
              <Link to={`/login?redirect=/courses/${slug}`} className="text-xs font-semibold text-primary hover:underline shrink-0">Ingresar</Link>
            )}
          </div>

          <div className="grid lg:grid-cols-5 gap-10 lg:gap-12 pb-16">
            {/* Left: text content */}
            <div className="lg:col-span-3 space-y-6">
              <div className="space-y-5">
                <Badge variant={course.is_free ? 'success' : 'soft'} size="default">
                  {course.is_free ? 'Gratis' : 'Premium'}
                </Badge>
                <h1 className="font-heading text-display-lg md:text-display-xl text-foreground tracking-tight leading-tight">
                  {course.title}
                </h1>
                {course.description && (
                  <p className="text-body-lg text-muted-foreground leading-relaxed max-w-2xl">{course.description}</p>
                )}
              </div>

              {/* Stats inline */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm pt-2">
                {(enrollmentCount ?? 0) > 0 && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="w-4 h-4 text-primary" aria-hidden />
                    <span className="text-foreground font-medium">{enrollmentCount}</span> estudiantes
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <BookOpen className="w-4 h-4 text-primary" aria-hidden />
                  <span className="text-foreground font-medium">{totalLessons}</span> lecciones
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-4 h-4 text-primary" aria-hidden />
                  <span className="text-foreground font-medium">{sortedModules.length}</span> módulos
                </span>
                <span className="flex items-center gap-1.5 text-accent font-medium">
                  <Award className="w-4 h-4" aria-hidden />
                  Certificado incluido
                </span>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { icon: Shield, text: 'Acceso de por vida' },
                  { icon: Star, text: 'Contenido actualizado' },
                  { icon: Award, text: 'Certificado verificable' },
                ].map(b => (
                  <span key={b.text} className="flex items-center gap-1.5 text-xs text-foreground bg-background border border-border/60 rounded-full px-3 py-1.5">
                    <b.icon className="w-3.5 h-3.5 text-primary" aria-hidden />
                    {b.text}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: buy card (desktop) / thumbnail */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-2xl shadow-xl border border-border/40 overflow-hidden sticky top-24">
                {/* Thumbnail / preview */}
                {thumbnailUrl ? (
                  <div className="relative aspect-video bg-secondary overflow-hidden">
                    <SmartImage src={thumbnailUrl} alt={course.title} size="lg" eager className="w-full h-full object-cover" />
                    {introEmbedUrl && (
                      <button type="button" aria-label="Ver video de presentación" onClick={() => setShowIntro(true)} className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors duration-200 ease-apple group">
                        <div className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-200 ease-apple">
                          <Play className="w-7 h-7 text-foreground ml-1" aria-hidden />
                        </div>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video bg-mesh-purple flex items-center justify-center">
                    <span className="font-heading text-display-2xl text-primary/20 tracking-tight">
                      {course.title[0]}
                    </span>
                  </div>
                )}

                {/* Price + CTA */}
                <div className="p-6 space-y-5">
                  <div className="space-y-1.5">
                    {billingType === 'free' ? (
                      <span className="font-heading text-display-md text-foreground tracking-tight">Gratis</span>
                    ) : (
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-heading text-display-md text-foreground tracking-tight tabular-nums">
                          ARS {Number(course.price).toLocaleString('es-AR')}
                        </span>
                        {billingLabel && (
                          <span className="text-muted-foreground text-base font-medium">{billingLabel}</span>
                        )}
                        {originalPrice > 0 && (
                          <>
                            <span className="text-muted-foreground text-lg line-through tabular-nums">
                              ARS {originalPrice.toLocaleString('es-AR')}
                            </span>
                            <Badge variant="success" size="default">
                              {Math.round((1 - Number(course.price) / originalPrice) * 100)}% OFF
                            </Badge>
                          </>
                        )}
                      </div>
                    )}
                    {billingType === 'monthly' && (
                      <p className="text-xs text-muted-foreground">Renovación mensual · Cancelás cuando quieras</p>
                    )}
                    {billingType === 'annual' && (
                      <p className="text-xs text-muted-foreground">Pago anual · 12 meses de acceso</p>
                    )}
                    {/* Refuerzo de preventa — urgencia honesta: el precio actual es promo y sube */}
                    {billingType === 'one_time' && originalPrice > Number(course.price) && !enrollment && (
                      <p className="text-xs font-medium text-accent flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden />
                        Precio de preventa — luego sube a ARS {originalPrice.toLocaleString('es-AR')}
                      </p>
                    )}
                  </div>

                  {/* Pago — sin "cuotas sin interés" en la app (comisión MP 28% es asesina).
                       El cliente puede pagar en cuotas con interés del banco directo en el
                       checkout de Mercado Pago, sin que el vendedor pague costos extra. */}
                  {!enrollment && !course.is_free && (
                    <div className="rounded-md bg-secondary/40 border border-border/40 p-3 text-xs text-muted-foreground leading-relaxed">
                      <p>
                        <span className="font-semibold text-foreground">Pago único.</span> Si querés, podés pagar en cuotas con interés del banco al elegir tu tarjeta en el siguiente paso.
                      </p>
                    </div>
                  )}

                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full"
                    onClick={handleCTA}
                    disabled={enrollMutation.isPending || buyMutation.isPending}
                  >
                    {ctaContent}
                    {!(enrollMutation.isPending || buyMutation.isPending) && <ArrowRight />}
                  </Button>

                  {/* Urgencia social — contador de alumnos */}
                  {(enrollmentCount ?? 0) > 5 && (
                    <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      <span><strong className="text-foreground/85">{enrollmentCount}</strong> personas ya inscriptas</span>
                    </p>
                  )}

                  {/* Cupón de descuento (solo cursos pagos no inscriptos) */}
                  {!enrollment && !course.is_free && (
                    <div className="space-y-2">
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 text-accent text-sm">
                            <Tag className="w-4 h-4" />
                            <span className="font-medium">{appliedCoupon.code}</span>
                            <span className="text-accent">
                              {appliedCoupon.discount_type === 'percent'
                                ? `−${appliedCoupon.discount_value}%`
                                : `−ARS ${appliedCoupon.discount_value.toLocaleString('es-AR')}`}
                            </span>
                          </div>
                          <button onClick={removeCoupon} aria-label="Quitar cupón" className="text-accent hover:text-accent">
                            <X className="w-4 h-4" aria-hidden />
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
                      {couponError && <p className="text-xs text-destructive">{couponError}</p>}
                    </div>
                  )}

                  {!user && (
                    <p className="text-xs text-center text-muted-foreground">
                      {billingType === 'free'
                        ? <><Link to="/login" className="text-primary hover:underline">Iniciá sesión</Link> para inscribirte</>
                        : <>No hace falta crear cuenta. ¿Ya tenés una? <Link to={`/login?redirect=/courses/${slug}`} className="text-primary hover:underline">Iniciá sesión</Link></>}
                    </p>
                  )}

                  <div className="border-t border-border/40 pt-4 space-y-2">
                    {[
                      'Acceso inmediato al contenido',
                      'Certificado verificable al completar',
                      'Comunidad de estudiantes',
                      'Recursos descargables',
                      'Acceso desde celu o desktop',
                      // (Sin garantía promocional — el derecho de arrepentimiento de 10 días
                      //  de la Ley 24.240 aplica por defecto pero no se promueve como gancho)
                      ...(course.is_free ? [] : []),
                    ].map(item => (
                      <div key={item} className="flex items-center gap-2 text-xs text-foreground/70">
                        <CheckCircle className="w-3.5 h-3.5 text-accent shrink-0" />
                        {item}
                      </div>
                    ))}
                    {!course.is_free && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 mt-1 border-t border-border/30">
                        <Lock className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" aria-hidden />
                        Pago seguro con Mercado Pago
                      </div>
                    )}
                    {avgRating !== null && (
                      <a
                        href="#reviews"
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors pt-1"
                      >
                        <div className="flex">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`w-3 h-3 ${s <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-border'}`} />
                          ))}
                        </div>
                        <span className="font-semibold text-foreground/85">{avgRating.toFixed(1)}</span>
                        <span className="hover:underline">({reviews?.length ?? 0} {(reviews?.length ?? 0) === 1 ? 'opinión' : 'opiniones'})</span>
                      </a>
                    )}
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
                <h2 className="font-heading text-2xl font-bold text-foreground mb-6">¿Qué vas a aprender?</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {outcomes.filter(Boolean).map((outcome, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
                      <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground/85">{outcome}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Para quién es */}
            {forWho && (
              <section>
                <h2 className="font-heading text-2xl font-bold text-foreground mb-4">¿Para quién es este curso?</h2>
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-6">
                  <MarkdownLight className="text-foreground/85 leading-relaxed">{forWho}</MarkdownLight>
                </div>
              </section>
            )}

            {/* Contenido del curso */}
            <section>
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="font-heading text-2xl font-bold text-foreground">Contenido del curso</h2>
                <span className="text-sm text-muted-foreground">{sortedModules.length} módulos · {totalLessons} lecciones</span>
              </div>
              <div className="space-y-2">
                {sortedModules.map(module => (
                  <div key={module.id} className="border border-border/60 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      className="w-full min-h-[56px] flex items-center justify-between p-4 text-left hover:bg-secondary/30 active:bg-secondary transition-colors"
                      onClick={() => toggleModule(module.id)}
                      aria-expanded={expandedModules.has(module.id)}
                      aria-label={`${expandedModules.has(module.id) ? 'Cerrar' : 'Abrir'} módulo ${module.title}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-foreground">{module.title}</span>
                        <span className="text-xs text-muted-foreground/80 hidden sm:block">{module.lessons?.length ?? 0} lecciones</span>
                      </div>
                      {expandedModules.has(module.id)
                        ? <ChevronUp className="w-5 h-5 text-muted-foreground/80 shrink-0" aria-hidden />
                        : <ChevronDown className="w-5 h-5 text-muted-foreground/80 shrink-0" aria-hidden />
                      }
                    </button>
                    {expandedModules.has(module.id) && (
                      <div className="border-t border-border/40 divide-y divide-border/40">
                        {[...(module.lessons ?? [])].sort((a, b) => a.order_index - b.order_index).map(lesson => (
                          <div key={lesson.id} className="flex items-center justify-between px-4 py-3 bg-secondary/50">
                            <div className="flex items-center gap-3">
                              {lesson.is_free_preview
                                ? <Play className="w-3.5 h-3.5 text-primary shrink-0" />
                                : enrollment
                                ? <Play className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                                : <Lock className="w-3.5 h-3.5 text-foreground/85 shrink-0" />
                              }
                              <span className="text-sm text-foreground/85">{lesson.title}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {lesson.is_free_preview && (
                                <span className="text-xs text-primary font-medium">Vista previa</span>
                              )}
                              {lesson.duration_seconds && (
                                <span className="text-xs text-muted-foreground/80">
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
                <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Tu instructor</h2>
                <div className="flex items-start gap-5">
                  {instructorAvatar ? (
                    <SmartAvatar src={instructorAvatar} alt="Instructor" size={80} className="shrink-0 border-2 border-primary/20" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-9 h-9 text-primary" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <MarkdownLight className="text-foreground/85 leading-relaxed">{instructorBio}</MarkdownLight>
                  </div>
                </div>
              </section>
            )}

            {/* FAQ */}
            {faqItems.filter(f => f.q).length > 0 && (
              <section>
                <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Preguntas frecuentes</h2>
                <div className="space-y-2">
                  {faqItems.filter(f => f.q).map((item, i) => (
                    <div key={i} className="border border-border/60 rounded-xl overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors"
                        onClick={() => toggleFaq(i)}
                      >
                        <span className="font-medium text-foreground">{item.q}</span>
                        {expandedFaq.has(i) ? <ChevronUp className="w-4 h-4 text-muted-foreground/80 shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/80 shrink-0" />}
                      </button>
                      {expandedFaq.has(i) && (
                        <div className="border-t border-border/40 px-4 py-4 bg-secondary/50">
                          <p className="text-sm text-foreground/70 leading-relaxed">{item.a}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            {((reviews && reviews.length > 0) || (enrollment && myEnrollmentId && !myReview)) && (
              <section id="reviews">
                <div className="flex items-baseline gap-3 mb-6">
                  <h2 className="font-heading text-2xl font-bold text-foreground">Opiniones</h2>
                  {avgRating !== null && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-border'}`} />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-foreground/85">{avgRating.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground/80">({reviews?.length ?? 0} {(reviews?.length ?? 0) === 1 ? 'opinión' : 'opiniones'})</span>
                    </div>
                  )}
                </div>

                {/* Form: dejar review */}
                {enrollment && myEnrollmentId && !myReview && (
                  <div className="bg-secondary/30 border border-border/60 rounded-xl p-5 mb-6 space-y-3">
                    <p className="text-sm font-semibold text-foreground/85">¿Qué te pareció el curso?</p>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(s => (
                        <button
                          key={s}
                          onMouseEnter={() => setReviewHover(s)}
                          onMouseLeave={() => setReviewHover(0)}
                          onClick={() => setReviewRating(s)}
                        >
                          <Star className={`w-7 h-7 transition-colors ${s <= (reviewHover || reviewRating) ? 'fill-yellow-400 text-yellow-400' : 'text-border'}`} />
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
                          className="w-full rounded-lg border border-border/60 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                  {(reviews ?? []).map(r => (
                    <div key={r.id} className="flex gap-4">
                      <SmartAvatar
                        src={r.reviewer?.avatar_url ?? null}
                        alt={r.reviewer?.full_name ?? ''}
                        size={36}
                        fallbackInitials={(r.reviewer?.full_name ?? '?')[0].toUpperCase()}
                        className="shrink-0 bg-primary/10 text-primary"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{r.reviewer?.full_name ?? 'Estudiante'}</span>
                          <div className="flex">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-border'}`} />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground/80">{new Date(r.created_at).toLocaleDateString('es-AR')}</span>
                        </div>
                        {r.comment && <p className="text-sm text-foreground/70 leading-relaxed">{r.comment}</p>}
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
              <div className="bg-card border border-border/60 rounded-2xl shadow-lg p-6 space-y-4">
                <div>
                  {course.is_free ? (
                    <span className="font-heading text-3xl font-bold text-foreground">Gratis</span>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-heading text-3xl font-bold text-foreground">
                          ARS {discountedPrice.toLocaleString('es-AR')}
                        </span>
                        {appliedCoupon ? (
                          // Hay cupón aplicado → tachado el precio de lista (course.price)
                          <span className="text-muted-foreground/80 text-lg line-through tabular-nums">
                            ARS {Number(course.price).toLocaleString('es-AR')}
                          </span>
                        ) : originalPrice > 0 ? (
                          // Sin cupón pero con precio regular → tachado el regular (originalPrice)
                          <span className="text-muted-foreground/80 text-lg line-through tabular-nums">
                            ARS {originalPrice.toLocaleString('es-AR')}
                          </span>
                        ) : null}
                        {appliedCoupon && (
                          <Badge className="bg-accent/10 text-accent border-accent/20 text-xs">
                            {appliedCoupon.discount_type === 'percent' ? `${appliedCoupon.discount_value}% OFF` : 'DESCUENTO'}
                          </Badge>
                        )}
                        {!appliedCoupon && originalPrice > 0 && (
                          <Badge className="bg-accent/10 text-accent border-accent/20 text-xs">
                            {Math.round((1 - Number(course.price) / originalPrice) * 100)}% OFF
                          </Badge>
                        )}
                      </div>
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
                  {ctaContent}
                  <ArrowRight className="w-4 h-4" />
                </Button>

                {/* Cupón de descuento sidebar */}
                {!enrollment && !course.is_free && (
                  <div className="space-y-2">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 text-accent text-sm">
                          <Tag className="w-4 h-4" />
                          <span className="font-medium">{appliedCoupon.code}</span>
                          <span className="text-accent">
                            {appliedCoupon.discount_type === 'percent'
                              ? `−${appliedCoupon.discount_value}%`
                              : `−ARS ${appliedCoupon.discount_value.toLocaleString('es-AR')}`}
                          </span>
                        </div>
                        <button onClick={removeCoupon} aria-label="Quitar cupón" className="text-accent hover:text-accent">
                          <X className="w-4 h-4" aria-hidden />
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
                    {couponError && <p className="text-xs text-destructive">{couponError}</p>}
                  </div>
                )}

                <div className="space-y-2 border-t pt-4">
                  {['Acceso inmediato', 'Certificado al completar', 'Comunidad incluida', 'Recursos descargables'].map(item => (
                    <div key={item} className="flex items-center gap-2 text-xs text-foreground/70">
                      <CheckCircle className="w-3.5 h-3.5 text-accent shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Share */}
              <div className="text-center">
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copiado') }}
                  className="text-xs text-muted-foreground/80 hover:text-primary transition-colors flex items-center gap-1 mx-auto"
                >
                  <ExternalLink className="w-3 h-3" />
                  Compartir este curso
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA — safe-area para iPhone notch */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg">
        <Button
          variant="hero"
          size="lg"
          className="w-full"
          onClick={handleCTA}
          disabled={enrollMutation.isPending || buyMutation.isPending}
        >
          {ctaContent}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Modal de video de presentación */}
      {showIntro && introEmbedUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowIntro(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Video de presentación del curso"
        >
          <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowIntro(false)}
              aria-label="Cerrar video"
              className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
            >
              Cerrar <X className="w-5 h-5" aria-hidden />
            </button>
            <div className="aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
              <iframe
                src={introEmbedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                title="Video de presentación"
              />
            </div>
          </div>
        </div>
      )}

      {/* Guest checkout — comprar sin crear cuenta (QR del evento) */}
      <Dialog open={guestOpen} onOpenChange={(o) => { if (!guestMutation.isPending) setGuestOpen(o) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Comprar — ARS {discountedPrice.toLocaleString('es-AR')}</DialogTitle>
            <DialogDescription>
              Dejanos tu nombre y email. No hace falta crear cuenta: después de pagar te
              llega un mail con el acceso directo al curso.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); guestMutation.mutate() }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="guest-name">Nombre y apellido</Label>
              <Input
                id="guest-name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
                disabled={guestMutation.isPending}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guest-email">Email</Label>
              <Input
                id="guest-email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                inputMode="email"
                disabled={guestMutation.isPending}
                required
              />
              <p className="text-xs text-muted-foreground">A este mail te mandamos el acceso. Revisá que esté bien escrito.</p>
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={guestMutation.isPending}>
              {guestMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
              {guestMutation.isPending ? 'Redirigiendo...' : 'Ir a pagar'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Pago seguro con Mercado Pago. Podés pagar en cuotas con tu tarjeta.
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
