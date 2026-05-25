import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

const schema = z.object({
  email: z.string().email('Email inválido'),
  website: z.string().max(0, 'Bot detectado').optional(),
})
type FormData = z.infer<typeof schema>

const MIN_TIME_TO_SUBMIT_MS = 2000
const COOLDOWN_KEY = 'nato_reset_cooldown'
const COOLDOWN_SECONDS = 60

export default function ForgotPassword() {
  const { tenant } = useAuth()
  const tenantName = tenant?.name ?? 'NATO University'
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const formLoadedAt = useRef<number>(0)
  useEffect(() => { formLoadedAt.current = Date.now() }, [])

  async function onSubmit(data: FormData) {
    setServerError(null)

    // Honeypot
    if (data.website && data.website.length > 0) {
      logger.warn('forgot-password blocked: honeypot triggered')
      setSuccess(true) // mismo UX que success real — no le decimos al bot que lo detectamos
      return
    }
    // Cooldown anti-bot por timing
    if (Date.now() - formLoadedAt.current < MIN_TIME_TO_SUBMIT_MS) {
      logger.warn('forgot-password blocked: too fast')
      setServerError('Esperá un momento antes de enviar.')
      return
    }
    // Cooldown post-request: solo permitir 1 reset cada 60s desde el mismo browser
    try {
      const cooldownUntil = Number(sessionStorage.getItem(COOLDOWN_KEY) ?? 0)
      if (cooldownUntil > Date.now()) {
        const secs = Math.ceil((cooldownUntil - Date.now()) / 1000)
        setServerError(`Ya enviamos un email. Probá de nuevo en ${secs}s.`)
        return
      }
    } catch { /* sessionStorage puede fallar */ }

    // Rate limit server-side (defense in depth) — 3 resets cada 1h por email
    try {
      const { data: allowed } = await supabase.rpc('check_rate_limit', {
        p_action: 'forgot_password',
        p_identifier: data.email,
        p_max: 3,
        p_window_seconds: 3600,
      })
      if (allowed === false) {
        // Mostramos success genérico para no revelar al atacante que el rate limit triggered
        // ni filtrar si el email existe o no
        logger.warn('forgot-password: rate limit hit', { email: data.email })
        setSuccess(true)
        return
      }
    } catch (e) {
      // Si la RPC no existe (SQL no aplicado en este env), seguimos sin bloquear
      logger.debug('rate-limit RPC unavailable, skipping', e)
    }

    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: window.location.origin + '/reset-password',
    })
    if (error) { setServerError(error.message); return }
    try { sessionStorage.setItem(COOLDOWN_KEY, String(Date.now() + COOLDOWN_SECONDS * 1000)) } catch { /* */ }
    setSuccess(true)
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left: branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-mesh-dark flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)] pointer-events-none" />

        <Link to="/" className="relative z-10 flex items-center gap-2.5 group w-fit">
          <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenantName} className="h-8 w-auto object-contain brightness-0 invert transition-transform group-hover:scale-105" loading="lazy" decoding="async" />
          <span className="font-heading text-base font-semibold text-white tracking-tight">{tenantName}</span>
        </Link>

        <div className="relative z-10 space-y-6 max-w-md">
          <h2 className="font-heading text-display-lg text-white tracking-tight leading-tight">
            Recuperá el acceso
            <br />
            <span className="text-white/60">en segundos.</span>
          </h2>
          <p className="text-white/70 text-sm">
            Te enviamos un link a tu email para crear una contraseña nueva.
          </p>
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

          {success ? (
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent/12 flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7 text-accent" aria-hidden />
              </div>
              <div className="space-y-1.5">
                <h1 className="font-heading text-display-sm text-foreground tracking-tight">Revisá tu email</h1>
                <p className="text-sm text-muted-foreground">
                  Te enviamos un link para recuperar tu contraseña.
                </p>
              </div>
              <Link to="/login" className="inline-block text-primary hover:underline font-medium underline-offset-4 text-sm">
                Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              <div>
                <h1 className="font-heading text-display-sm md:text-display-md text-foreground tracking-tight">¿Olvidaste tu contraseña?</h1>
                <p className="text-muted-foreground text-sm mt-2">Ingresá tu email y te enviamos un link para recuperarla</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Honeypot off-screen */}
                <div
                  aria-hidden="true"
                  style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
                >
                  <label htmlFor="fp_website">No completar</label>
                  <input id="fp_website" type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
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

                {serverError && (
                  <div className="text-sm text-destructive bg-destructive/[0.06] border border-destructive/20 rounded-md px-3 py-2.5 animate-fade-in">
                    {serverError}
                  </div>
                )}

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Enviar link de recuperación'}
                  {!isSubmitting && <ArrowRight />}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="text-primary hover:underline font-medium underline-offset-4">
                  Volver al inicio de sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
