import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { canonicalUrl, absoluteUrl } from '@/lib/seo'
import { ArrowRight, School, User, CheckCircle2, GraduationCap } from 'lucide-react'

const accountSchema = z.object({
  fullName: z.string().min(2, 'Ingresá tu nombre completo'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

const schoolSchema = z.object({
  schoolName: z.string().min(2, 'Ingresá el nombre de tu escuela'),
  schoolSlug: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
})

type AccountData = z.infer<typeof accountSchema>
type SchoolData = z.infer<typeof schoolSchema>

function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function CreateSchool() {
  const navigate = useNavigate()
  const { user, profile, switchSchool } = useAuth()
  // Si el usuario ya está logueado, saltear el paso 1 (cuenta)
  const [step, setStep] = useState<1 | 2 | 3>(user ? 2 : 1)
  const [accountData, setAccountData] = useState<AccountData | null>(null)
  const [schoolName, setSchoolName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdProfileId, setCreatedProfileId] = useState<string | null>(null)

  const accountForm = useForm<AccountData>({ resolver: zodResolver(accountSchema) })
  const schoolForm = useForm<SchoolData>({ resolver: zodResolver(schoolSchema) })

  function handleSchoolNameChange(value: string) {
    setSchoolName(value)
    const slug = toSlug(value)
    schoolForm.setValue('schoolSlug', slug, { shouldValidate: !!slug })
  }

  async function handleCreateSchool(schoolData: SchoolData) {
    setSubmitting(true)
    try {
      if (user) {
        // Usuario ya logueado → solo crear nueva escuela para su auth_id
        const { data: rpcData, error: rpcError } = await supabase.rpc('create_school', {
          p_auth_id: user.id,
          p_email: profile?.email ?? user.email ?? '',
          p_full_name: profile?.full_name ?? '',
          p_school_name: schoolData.schoolName,
          p_school_slug: schoolData.schoolSlug,
        })
        if (rpcError) throw rpcError
        const result = rpcData as { profile_id?: string } | null
        setCreatedProfileId(result?.profile_id ?? null)
      } else {
        // Usuario nuevo → registrar + crear escuela
        if (!accountData) return
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: accountData.email,
          password: accountData.password,
        })
        if (authError) throw authError
        if (!authData.user) throw new Error('No se pudo crear el usuario')

        const { data: rpcData, error: rpcError } = await supabase.rpc('create_school', {
          p_auth_id: authData.user.id,
          p_email: accountData.email,
          p_full_name: accountData.fullName,
          p_school_name: schoolData.schoolName,
          p_school_slug: schoolData.schoolSlug,
        })
        if (rpcError) throw rpcError
        const result = rpcData as { profile_id?: string } | null
        setCreatedProfileId(result?.profile_id ?? null)
      }
      setStep(3)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear la escuela'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoToPanel() {
    if (user && createdProfileId) {
      // Cambiar a la nueva escuela antes de ir al panel
      try {
        await switchSchool(createdProfileId)
      } catch {
        // si falla el switch, recargar igual
      }
    }
    navigate('/instructor')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Crear mi escuela online gratis — NATO University</title>
        <meta name="description" content="Lanzá tu escuela online en minutos. Vendé cursos, gestioná tus alumnos y cobrá con Mercado Pago. Gratis para empezar." />
        <link rel="canonical" href={canonicalUrl('/create-school')} />
        <meta property="og:title" content="Crear mi escuela online gratis — NATO University" />
        <meta property="og:description" content="Lanzá tu escuela online en minutos. Vendé cursos y cobrá con Mercado Pago. Gratis para empezar." />
        <meta property="og:url" content={canonicalUrl('/create-school')} />
        <meta property="og:image" content={absoluteUrl('/nato-logo.png')} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="NATO University" />
        <meta property="og:locale" content="es_AR" />
      </Helmet>
      {/* Header glass */}
      <header className="glass-light shrink-0">
        <div className="container h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/nato-logo.png" alt="NATO University" className="h-6 w-auto transition-transform group-hover:scale-105" />
            <span className="font-heading text-sm font-semibold text-foreground hidden sm:block tracking-tight">NATO University</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            ¿Ya tenés escuela?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium underline-offset-4">Iniciar sesión</Link>
          </p>
        </div>
      </header>

      {/* Progress bar */}
      <div className="border-b border-border/40 bg-secondary/30">
        <div className="container py-4">
          <div className="flex items-center gap-2 max-w-md mx-auto">
            {[
              { n: 1, label: 'Tu cuenta', icon: User },
              { n: 2, label: 'Tu escuela', icon: School },
              { n: 3, label: 'Listo', icon: CheckCircle2 },
            ].map(({ n, label }, i) => (
              <div key={n} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center gap-2 ${step >= n ? 'text-foreground' : 'text-muted-foreground'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ease-apple ${
                    step > n ? 'bg-primary text-primary-foreground shadow-primary-md' :
                    step === n ? 'bg-primary/10 text-primary border border-primary/30' :
                    'bg-background border border-border text-muted-foreground'
                  }`}>
                    {step > n ? '✓' : n}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${step === n ? 'text-foreground' : ''}`}>{label}</span>
                </div>
                {i < 2 && (
                  <div className={`flex-1 h-px mx-2 transition-colors ${step > n ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Step 1 — Tu cuenta */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <h1 className="font-heading text-2xl font-bold text-foreground">Creá tu cuenta</h1>
                <p className="text-muted-foreground/80 text-sm">Con esto accedés a tu panel de instructor</p>
              </div>

              <form onSubmit={accountForm.handleSubmit(d => { setAccountData(d); setStep(2) })} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-foreground/85">Tu nombre completo</Label>
                  <Input
                    placeholder="Juan López"
                    className="border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                    {...accountForm.register('fullName')}
                  />
                  {accountForm.formState.errors.fullName && (
                    <p className="text-xs text-destructive">{accountForm.formState.errors.fullName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-foreground/85">Email</Label>
                  <Input
                    type="email"
                    placeholder="vos@tuescuela.com"
                    className="border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                    {...accountForm.register('email')}
                  />
                  {accountForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{accountForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-foreground/85">Contraseña</Label>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    className="border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                    {...accountForm.register('password')}
                  />
                  {accountForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{accountForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-foreground/85">Repetir contraseña</Label>
                  <Input
                    type="password"
                    placeholder="Repetí la contraseña"
                    className="border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                    {...accountForm.register('confirmPassword')}
                  />
                  {accountForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">{accountForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button type="submit" variant="hero" className="w-full gap-2 mt-2">
                  Continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground">
                Al continuar aceptás los términos de uso de NATO University
              </p>
            </div>
          )}

          {/* Step 2 — Tu escuela */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <School className="w-6 h-6 text-primary" />
                </div>
                <h1 className="font-heading text-2xl font-bold text-foreground">Nombrá tu escuela</h1>
                <p className="text-muted-foreground/80 text-sm">Este será el nombre que ven tus estudiantes</p>
              </div>

              <form onSubmit={schoolForm.handleSubmit(handleCreateSchool)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-foreground/85">Nombre de la escuela</Label>
                  <Input
                    placeholder="Ej: Academia de Marketing Digital"
                    className="border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                    value={schoolName}
                    onChange={e => {
                      handleSchoolNameChange(e.target.value)
                      schoolForm.setValue('schoolName', e.target.value, { shouldValidate: true })
                    }}
                  />
                  {schoolForm.formState.errors.schoolName && (
                    <p className="text-xs text-destructive">{schoolForm.formState.errors.schoolName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-foreground/85">
                    URL de tu escuela
                    <span className="text-muted-foreground font-normal ml-2">(editable)</span>
                  </Label>
                  <div className="flex items-center border-border bg-background rounded-md overflow-hidden focus-within:border-primary transition-colors">
                    <span className="px-3 text-muted-foreground text-sm border-r border-border bg-secondary/40 h-10 flex items-center shrink-0">
                      tu-escuela.com/
                    </span>
                    <input
                      className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      placeholder="mi-escuela"
                      {...schoolForm.register('schoolSlug')}
                    />
                  </div>
                  {schoolForm.formState.errors.schoolSlug && (
                    <p className="text-xs text-destructive">{schoolForm.formState.errors.schoolSlug.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Podés conectar tu propio dominio después desde Configuración
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 text-muted-foreground/80"
                    onClick={() => setStep(1)}
                  >
                    Atrás
                  </Button>
                  <Button
                    type="submit"
                    variant="hero"
                    className="flex-1 gap-2"
                    disabled={submitting}
                  >
                    {submitting ? 'Creando...' : 'Crear mi escuela'}
                    {!submitting && <ArrowRight className="w-4 h-4" />}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Step 3 — Listo! */}
          {step === 3 && (
            <div className="text-center space-y-6">
              {/* Celebration */}
              <div className="space-y-3">
                <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <div>
                  <h1 className="font-heading text-2xl font-bold text-foreground">
                    ¡{schoolName || 'Tu escuela'} está lista!
                  </h1>
                  <p className="text-muted-foreground/80 text-sm mt-1">
                    Estás a minutos de tu primera venta.
                  </p>
                </div>
              </div>

              {/* What happens next — outcomes, not tasks */}
              <div className="bg-secondary/30 border border-border/60 rounded-xl p-5 text-left space-y-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Tu camino al primer cobro</p>
                {[
                  { step: '1', action: 'Subís 3 lecciones', outcome: 'Tu curso ya puede recibir inscriptos' },
                  { step: '2', action: 'Configurás el precio', outcome: 'Mercado Pago activo en minutos' },
                  { step: '3', action: 'Compartís el link', outcome: 'Tu primer alumno puede pagar hoy' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <div>
                      <span className="text-foreground text-sm font-medium">{item.action}</span>
                      <span className="text-muted-foreground/80 text-sm"> → {item.outcome}</span>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="hero"
                className="w-full gap-2"
                onClick={handleGoToPanel}
              >
                <GraduationCap className="w-4 h-4" />
                Ir a mi panel — crear mi primer curso
              </Button>

              <p className="text-xs text-muted-foreground">
                Si necesitás confirmar tu email primero, revisá tu bandeja de entrada
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
