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
        setCreatedProfileId((rpcData as any)?.profile_id ?? null)
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
        setCreatedProfileId((rpcData as any)?.profile_id ?? null)
      }
      setStep(3)
    } catch (e: any) {
      toast.error(e.message ?? 'Error al crear la escuela')
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
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Helmet>
        <title>Crear mi escuela online gratis — NATO University</title>
        <meta name="description" content="Lanzá tu escuela online en minutos. Vendé cursos, gestioná tus alumnos y cobrá con Mercado Pago. Gratis para empezar." />
        <link rel="canonical" href="https://nato-learn-hub.vercel.app/create-school" />
        <meta property="og:title" content="Crear mi escuela online gratis — NATO University" />
        <meta property="og:description" content="Lanzá tu escuela online en minutos. Vendé cursos y cobrá con Mercado Pago. Gratis para empezar." />
        <meta property="og:url" content="https://nato-learn-hub.vercel.app/create-school" />
      </Helmet>
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/nato-logo.png" alt="NATO University" className="h-7 w-auto" />
            <span className="font-heading text-sm font-bold text-white hidden sm:block">NATO University</span>
          </Link>
          <p className="text-sm text-gray-400">
            ¿Ya tenés escuela?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">Iniciar sesión</Link>
          </p>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3 max-w-sm mx-auto">
            {[
              { n: 1, label: 'Tu cuenta', icon: User },
              { n: 2, label: 'Tu escuela', icon: School },
              { n: 3, label: 'Listo', icon: CheckCircle2 },
            ].map(({ n, label, icon: Icon }, i) => (
              <div key={n} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center gap-1.5 ${step >= n ? 'text-primary' : 'text-gray-600'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                    step > n ? 'bg-primary border-primary text-white' :
                    step === n ? 'border-primary text-primary' :
                    'border-gray-700 text-gray-600'
                  }`}>
                    {step > n ? '✓' : n}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{label}</span>
                </div>
                {i < 2 && (
                  <div className={`flex-1 h-px mx-2 ${step > n ? 'bg-primary' : 'bg-gray-700'}`} />
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
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <h1 className="font-heading text-2xl font-bold text-white">Creá tu cuenta</h1>
                <p className="text-gray-400 text-sm">Con esto accedés a tu panel de instructor</p>
              </div>

              <form onSubmit={accountForm.handleSubmit(d => { setAccountData(d); setStep(2) })} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-300">Tu nombre completo</Label>
                  <Input
                    placeholder="Juan López"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary"
                    {...accountForm.register('fullName')}
                  />
                  {accountForm.formState.errors.fullName && (
                    <p className="text-xs text-red-400">{accountForm.formState.errors.fullName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-gray-300">Email</Label>
                  <Input
                    type="email"
                    placeholder="vos@tuescuela.com"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary"
                    {...accountForm.register('email')}
                  />
                  {accountForm.formState.errors.email && (
                    <p className="text-xs text-red-400">{accountForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-gray-300">Contraseña</Label>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary"
                    {...accountForm.register('password')}
                  />
                  {accountForm.formState.errors.password && (
                    <p className="text-xs text-red-400">{accountForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-gray-300">Repetir contraseña</Label>
                  <Input
                    type="password"
                    placeholder="Repetí la contraseña"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary"
                    {...accountForm.register('confirmPassword')}
                  />
                  {accountForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-red-400">{accountForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button type="submit" variant="hero" className="w-full gap-2 mt-2">
                  Continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              <p className="text-center text-xs text-gray-600">
                Al continuar aceptás los términos de uso de NATO University
              </p>
            </div>
          )}

          {/* Step 2 — Tu escuela */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <School className="w-6 h-6 text-primary" />
                </div>
                <h1 className="font-heading text-2xl font-bold text-white">Nombrá tu escuela</h1>
                <p className="text-gray-400 text-sm">Este será el nombre que ven tus estudiantes</p>
              </div>

              <form onSubmit={schoolForm.handleSubmit(handleCreateSchool)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-300">Nombre de la escuela</Label>
                  <Input
                    placeholder="Ej: Academia de Marketing Digital"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary"
                    value={schoolName}
                    onChange={e => {
                      handleSchoolNameChange(e.target.value)
                      schoolForm.setValue('schoolName', e.target.value, { shouldValidate: true })
                    }}
                  />
                  {schoolForm.formState.errors.schoolName && (
                    <p className="text-xs text-red-400">{schoolForm.formState.errors.schoolName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-gray-300">
                    URL de tu escuela
                    <span className="text-gray-500 font-normal ml-2">(editable)</span>
                  </Label>
                  <div className="flex items-center bg-gray-800 border border-gray-700 rounded-md overflow-hidden focus-within:border-primary transition-colors">
                    <span className="px-3 text-gray-500 text-sm border-r border-gray-700 bg-gray-900 h-10 flex items-center shrink-0">
                      tu-escuela.com/
                    </span>
                    <input
                      className="flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500"
                      placeholder="mi-escuela"
                      {...schoolForm.register('schoolSlug')}
                    />
                  </div>
                  {schoolForm.formState.errors.schoolSlug && (
                    <p className="text-xs text-red-400">{schoolForm.formState.errors.schoolSlug.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Podés conectar tu propio dominio después desde Configuración
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 text-gray-400"
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
                  <h1 className="font-heading text-2xl font-bold text-white">
                    ¡{schoolName || 'Tu escuela'} está lista!
                  </h1>
                  <p className="text-gray-400 text-sm mt-1">
                    Estás a minutos de tu primera venta.
                  </p>
                </div>
              </div>

              {/* What happens next — outcomes, not tasks */}
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 text-left space-y-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Tu camino al primer cobro</p>
                {[
                  { step: '1', action: 'Subís 3 lecciones', outcome: 'Tu curso ya puede recibir inscriptos' },
                  { step: '2', action: 'Configurás el precio', outcome: 'Mercado Pago activo en minutos' },
                  { step: '3', action: 'Compartís el link', outcome: 'Tu primer alumno puede pagar hoy' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <div>
                      <span className="text-white text-sm font-medium">{item.action}</span>
                      <span className="text-gray-400 text-sm"> → {item.outcome}</span>
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

              <p className="text-xs text-gray-600">
                Si necesitás confirmar tu email primero, revisá tu bandeja de entrada
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
