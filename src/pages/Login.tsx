import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function Login() {
  const { signIn, tenant } = useAuth()
  const tenantName = tenant?.name ?? 'NATO University'
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const { error } = await signIn(data.email, data.password)
    if (error) { setServerError(error); return }
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/4 translate-y-1/4" />
        <div className="absolute top-1/4 -left-12 w-64 h-64 bg-white/5 rounded-full" />

        <div className="relative z-10 flex items-center gap-3">
          <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenantName} className="h-10 w-auto object-contain brightness-0 invert" />
          <span className="font-heading text-xl font-bold text-white">{tenantName}</span>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="font-heading text-4xl font-bold text-white leading-tight">
            Aprendé de los mejores en marketing digital
          </h2>
          <p className="text-white/80 text-lg leading-relaxed">
            Accedé a cursos, recursos y certificaciones creados por el equipo de NATO.
          </p>
          <div className="flex gap-8">
            {[{ v: '50+', l: 'Cursos' }, { v: '2K+', l: 'Estudiantes' }, { v: '95%', l: 'Satisfacción' }].map(s => (
              <div key={s.l}>
                <div className="font-heading text-2xl font-bold text-white">{s.v}</div>
                <div className="text-white/60 text-sm">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/50 text-sm">© {new Date().getFullYear()} {tenantName}</p>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenantName} className="h-8 w-auto object-contain" />
            <span className="font-heading text-lg font-bold text-gray-900">{tenantName}</span>
          </div>

          <div>
            <h1 className="font-heading text-2xl font-bold text-gray-900">Bienvenido de vuelta</h1>
            <p className="text-gray-500 mt-1">Ingresá a tu cuenta para continuar</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                className="h-11 border-gray-200 focus:border-primary"
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-gray-700 font-medium">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="h-11 border-gray-200 focus:border-primary"
                {...register('password')}
              />
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {serverError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {serverError}
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full h-11" disabled={isSubmitting}>
              {isSubmitting ? 'Ingresando...' : 'Iniciar Sesión'}
              <ArrowRight className="w-4 h-4" />
            </Button>

            <p className="text-center text-sm text-gray-500">
              <Link to="/forgot-password" className="text-primary hover:text-primary/80 font-medium transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          </form>

          <p className="text-center text-sm text-gray-500">
            ¿No tenés cuenta?{' '}
            <Link to="/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Registrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
