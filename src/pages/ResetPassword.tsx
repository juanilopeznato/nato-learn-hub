import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const schema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string().min(8, 'Mínimo 8 caracteres'),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

export default function ResetPassword() {
  const { tenant } = useAuth()
  const tenantName = tenant?.name ?? 'NATO University'
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) { setServerError(error.message); return }
    toast.success('Contraseña actualizada correctamente')
    navigate('/dashboard')
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
            Tu nueva contraseña.
            <br />
            <span className="text-white/60">Bien fuerte esta vez.</span>
          </h2>
          <p className="text-white/70 text-sm">
            Elegí una contraseña segura — mínimo 6 caracteres.
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

          <div>
            <h1 className="font-heading text-display-sm md:text-display-md text-foreground tracking-tight">Nueva contraseña</h1>
            <p className="text-muted-foreground text-sm mt-2">Ingresá y confirmá tu nueva contraseña</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-foreground text-sm font-medium">Nueva contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                {...register('password')}
              />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-foreground text-sm font-medium">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Repetí la contraseña"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>}
            </div>

            {serverError && (
              <div className="text-sm text-destructive bg-destructive/[0.06] border border-destructive/20 rounded-md px-3 py-2.5 animate-fade-in">
                {serverError}
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar nueva contraseña'}
              {!isSubmitting && <ArrowRight />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
