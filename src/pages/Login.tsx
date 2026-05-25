import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { events } from '@/lib/analytics'
import { logger } from '@/lib/logger'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  // Honeypot — invisible para humanos, bots lo completan
  website: z.string().max(0, 'Bot detectado').optional(),
})
type FormData = z.infer<typeof schema>

const MIN_TIME_TO_SUBMIT_MS = 1500
// Client-side cooldown anti brute-force entre intentos fallidos
const FAILED_ATTEMPTS_KEY = 'nato_login_attempts'
const COOLDOWN_AFTER_ATTEMPTS = 5
const COOLDOWN_SECONDS = 30

interface AttemptsState { count: number; until: number }
function getAttempts(): AttemptsState {
  try {
    const raw = sessionStorage.getItem(FAILED_ATTEMPTS_KEY)
    return raw ? JSON.parse(raw) : { count: 0, until: 0 }
  } catch { return { count: 0, until: 0 } }
}
function setAttempts(s: AttemptsState) {
  try { sessionStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify(s)) } catch { /* */ }
}

export default function Login() {
  const { signIn, tenant } = useAuth()
  const tenantName = tenant?.name ?? 'NATO University'
  const navigate = useNavigate()
  const location = useLocation()
  const queryRedirect = new URLSearchParams(location.search).get('redirect')
  const from = queryRedirect ?? (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur', // valida al perder foco en cada campo (no solo en submit)
  })

  const formLoadedAt = useRef<number>(0)
  useEffect(() => { formLoadedAt.current = Date.now() }, [])

  async function onSubmit(data: FormData) {
    setServerError(null)

    // Honeypot
    if (data.website && data.website.length > 0) {
      logger.warn('login blocked: honeypot triggered')
      setServerError('Email o contraseña incorrectos')
      return
    }

    // Cooldown: muy rápido = bot
    const elapsed = Date.now() - formLoadedAt.current
    if (elapsed < MIN_TIME_TO_SUBMIT_MS) {
      logger.warn('login blocked: too fast', { elapsedMs: elapsed })
      setServerError('Esperá un momento antes de enviar.')
      return
    }

    // Cooldown post-intentos fallidos (client-side, sessionStorage)
    const att = getAttempts()
    if (att.until > Date.now()) {
      const secs = Math.ceil((att.until - Date.now()) / 1000)
      setServerError(`Demasiados intentos. Probá de nuevo en ${secs}s.`)
      return
    }

    // Rate limit server-side: 10 intentos / 15 min por email (defense in depth)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: allowed } = await supabase.rpc('check_rate_limit', {
        p_action: 'login_attempt',
        p_identifier: data.email,
        p_max: 10,
        p_window_seconds: 15 * 60,
      })
      if (allowed === false) {
        logger.warn('login blocked by server rate limit', { email: data.email })
        setServerError('Demasiados intentos desde este email. Esperá 15 min.')
        return
      }
    } catch { /* RPC unavailable → no bloquear */ }

    const { error } = await signIn(data.email, data.password)
    if (error) {
      const next = att.count + 1
      const until = next >= COOLDOWN_AFTER_ATTEMPTS ? Date.now() + COOLDOWN_SECONDS * 1000 : 0
      setAttempts({ count: next >= COOLDOWN_AFTER_ATTEMPTS ? 0 : next, until })
      setServerError(error)
      return
    }

    setAttempts({ count: 0, until: 0 })
    events.loginCompleted({ tenant: tenant?.slug })
    navigate(from, { replace: true })
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
            Aprendé de los mejores.
            <br />
            <span className="text-white/60">Tu próximo nivel arranca acá.</span>
          </h2>
          <div className="grid grid-cols-3 gap-6 pt-2 border-t border-white/10">
            {[{ v: '50+', l: 'Cursos' }, { v: '2K+', l: 'Alumnos' }, { v: '95%', l: 'Satisfacción' }].map(s => (
              <div key={s.l}>
                <div className="font-heading text-display-sm text-white tabular-nums tracking-tight">{s.v}</div>
                <div className="text-white/50 text-xs uppercase tracking-wider mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/40 text-xs">© {new Date().getFullYear()} {tenantName}</p>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenantName} className="h-7 w-auto object-contain" loading="lazy" decoding="async" />
            <span className="font-heading text-base font-semibold text-foreground tracking-tight">{tenantName}</span>
          </Link>

          <div>
            <h1 className="font-heading text-display-sm md:text-display-md text-foreground tracking-tight">Bienvenido de vuelta</h1>
            <p className="text-muted-foreground text-sm mt-2">Ingresá a tu cuenta para continuar</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Honeypot: invisible para humanos, los bots completan todos los campos */}
            <div
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
            >
              <label htmlFor="login_website">No completar</label>
              <input
                id="login_website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                {...register('website')}
              />
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground text-sm font-medium">Contraseña</Label>
                <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  ¿Olvidaste?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>

            {serverError && (
              <div className="text-sm text-destructive bg-destructive/[0.06] border border-destructive/20 rounded-md px-3 py-2.5 animate-fade-in">
                {serverError}
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Ingresando...' : 'Iniciar Sesión'}
              {!isSubmitting && <ArrowRight />}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿No tenés cuenta?{' '}
            <Link to="/signup" className="text-primary hover:underline font-medium underline-offset-4">
              Registrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
