import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { events } from '@/lib/analytics'
import { logger } from '@/lib/logger'

const schema = z.object({
  fullName: z.string().min(2, 'Ingresá tu nombre'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  acceptTerms: z.boolean().refine(v => v === true, 'Tenés que aceptar los Términos y la Política de Privacidad para continuar'),
  // Honeypot — los bots rellenan todos los campos; humanos no lo ven
  website: z.string().max(0, 'Bot detectado').optional(),
})
type FormData = z.infer<typeof schema>

// Cooldown mínimo entre cargar el form y enviar — los bots envían instantáneo
const MIN_TIME_TO_SUBMIT_MS = 2000

const benefits = [
  'Acceso a todos los cursos gratuitos',
  'Certificados verificables',
  'Recursos y plantillas de NATO',
]

export default function Signup() {
  const { signUp, tenant } = useAuth()
  const tenantName = tenant?.name ?? 'NATO University'
  const navigate = useNavigate()
  const location = useLocation()
  const redirect = new URLSearchParams(location.search).get('redirect') ?? '/dashboard'
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmEmailSent, setConfirmEmailSent] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
  })

  const formLoadedAt = useRef<number>(0)
  useEffect(() => { formLoadedAt.current = Date.now() }, [])

  async function onSubmit(data: FormData) {
    setServerError(null)
    // Honeypot trigger — si el campo "website" tiene valor, es bot
    if (data.website && data.website.length > 0) {
      logger.warn('signup blocked: honeypot triggered', { ip: 'unknown' })
      // Damos un error genérico pero falso (que parezca real para el bot)
      setServerError('Algo salió mal. Probá de nuevo.')
      return
    }
    // Cooldown: si llenaron el form en <2s, casi seguro bot
    const elapsed = Date.now() - formLoadedAt.current
    if (elapsed < MIN_TIME_TO_SUBMIT_MS) {
      logger.warn('signup blocked: too fast', { elapsedMs: elapsed })
      setServerError('Esperá un momento antes de enviar.')
      return
    }
    // Rate limit server-side: 3 signups / 1h por email (anti spam)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: allowed } = await supabase.rpc('check_rate_limit', {
        p_action: 'signup',
        p_identifier: data.email,
        p_max: 3,
        p_window_seconds: 60 * 60,
      })
      if (allowed === false) {
        logger.warn('signup blocked by server rate limit', { email: data.email })
        setServerError('Ya hubo varios intentos con este email. Probá en 1h.')
        return
      }
    } catch { /* RPC unavailable → no bloquear */ }

    events.signupStarted({ tenant: tenant?.slug })
    const { error, needsConfirmation } = await signUp(data.email, data.password, data.fullName)
    if (error) { setServerError(error); return }
    events.signupCompleted({ tenant: tenant?.slug })
    // Si Supabase exige confirmar email, NO hay sesión → navegar a una ruta protegida
    // dejaría al usuario en limbo (rebote a /login). Mostramos instrucción clara.
    if (needsConfirmation) { setConfirmEmailSent(true); return }
    navigate(redirect, { replace: true })
  }

  // Pantalla "revisá tu mail" cuando Supabase exige confirmar email
  if (confirmEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card border border-border/60 rounded-2xl p-8 text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-9 h-9 text-primary" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-heading text-display-sm text-foreground tracking-tight">Revisá tu email</h1>
            <p className="text-body-sm text-muted-foreground">
              Te enviamos un link de confirmación. Hacé clic ahí para activar tu cuenta y empezar.
            </p>
          </div>
          <p className="text-xs text-muted-foreground/70">
            ¿No te llegó? Revisá spam o promociones. El correo puede tardar 1-2 minutos.
          </p>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/login">Ya confirmé — ir a iniciar sesión</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left: branding refinado */}
      <div className="hidden lg:flex lg:w-1/2 bg-mesh-dark flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)] pointer-events-none" />

        <Link to="/" className="relative z-10 flex items-center gap-2.5 group w-fit">
          <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenantName} className="h-8 w-auto object-contain brightness-0 invert transition-transform group-hover:scale-105" loading="lazy" decoding="async" />
          <span className="font-heading text-base font-semibold text-white tracking-tight">{tenantName}</span>
        </Link>

        <div className="relative z-10 space-y-8 max-w-md">
          <h2 className="font-heading text-display-lg text-white leading-tight tracking-tight">
            Tu próximo nivel
            <br />
            <span className="text-white/60">empieza acá.</span>
          </h2>
          <ul className="space-y-3.5">
            {benefits.map(b => (
              <li key={b} className="flex items-center gap-3 text-white/85 text-sm">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent/20">
                  <CheckCircle className="w-3 h-3 text-accent" aria-hidden />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-white/40 text-xs">© {new Date().getFullYear()} {tenantName}</p>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenantName} className="h-7 w-auto object-contain" loading="lazy" decoding="async" />
            <span className="font-heading text-base font-semibold text-foreground tracking-tight">{tenantName}</span>
          </Link>

          <div>
            <h1 className="font-heading text-display-sm md:text-display-md text-foreground tracking-tight">Creá tu cuenta</h1>
            <p className="text-muted-foreground text-sm mt-2">Empezá a aprender gratis hoy</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Honeypot: campo invisible para humanos pero que los bots completan.
                Posición off-screen, tabIndex -1, autocomplete off, aria-hidden. */}
            <div
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
            >
              <label htmlFor="website">No completar este campo</label>
              <input
                id="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                {...register('website')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-foreground text-sm font-medium">Nombre completo</Label>
              <Input
                id="fullName"
                autoComplete="name"
                autoCapitalize="words"
                placeholder="Juan López"
                {...register('fullName')}
              />
              {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-foreground text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="tu@email.com"
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-foreground text-sm font-medium">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                {...register('password')}
              />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>

            {/* Aceptación TyC + Privacidad — required para compliance */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="acceptTerms"
                type="checkbox"
                {...register('acceptTerms')}
                className="mt-0.5 w-4 h-4 rounded border-border accent-primary cursor-pointer shrink-0"
              />
              <Label htmlFor="acceptTerms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                Acepto los <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Términos y Condiciones</Link> y la <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Política de Privacidad</Link>
              </Label>
            </div>
            {errors.acceptTerms && <p className="text-xs text-destructive">{errors.acceptTerms.message}</p>}

            {serverError && (
              <div className="text-sm text-destructive bg-destructive/[0.06] border border-destructive/20 rounded-md px-3 py-2.5 animate-fade-in">
                {serverError}
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta gratis'}
              {!isSubmitting && <ArrowRight />}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium underline-offset-4">
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
