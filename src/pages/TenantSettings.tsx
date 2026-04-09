import { useEffect, useState } from 'react'
import { Controller } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Settings, LogOut, CreditCard, Palette, Globe, Save, Puzzle, Receipt, Check } from 'lucide-react'
import { ImageUpload } from '@/components/ImageUpload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const brandSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().optional(),
  logo_url: z.string().url('URL inválida').optional().or(z.literal('')),
  primary_color: z.string().optional(),
  support_email: z.string().email('Email inválido').optional().or(z.literal('')),
  social_instagram: z.string().optional(),
  social_whatsapp: z.string().optional(),
})

const mpSchema = z.object({
  mp_access_token: z.string().min(10, 'Token inválido'),
  mp_public_key: z.string().min(10, 'Public key inválida'),
})

const integrationsSchema = z.object({
  meta_pixel_id: z.string().optional(),
  resend_api_key: z.string().optional(),
})

type BrandData = z.infer<typeof brandSchema>
type MpData = z.infer<typeof mpSchema>
type IntegrationsData = z.infer<typeof integrationsSchema>

interface Plan {
  id: string
  name: string
  display_name: string
  price_ars: number
  max_courses: number
  max_students: number
  commission_pct: number
  features: string[]
  mp_plan_id: string | null
  is_active: boolean
  sort_order: number
}

interface SubscriptionPayment {
  id: string
  plan_name: string
  mp_payment_id: string | null
  amount_ars: number
  status: string
  period_start: string | null
  period_end: string | null
  created_at: string
}

export default function TenantSettings() {
  const { profile, tenant, signOut } = useAuth()
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null)

  const { control: brandControl, ...brandFormRest } = useForm<BrandData>({ resolver: zodResolver(brandSchema) })
  const brandForm = { control: brandControl, ...brandFormRest }
  const mpForm = useForm<MpData>({ resolver: zodResolver(mpSchema) })
  const integrationsForm = useForm<IntegrationsData>({ resolver: zodResolver(integrationsSchema) })

  const { data: fullTenant } = useQuery({
    queryKey: ['tenant-full', tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenant!.id)
        .single()
      return data
    },
  })

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ['plans-billing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data ?? []
    },
  })

  const { data: payments } = useQuery<SubscriptionPayment[]>({
    queryKey: ['subscription-payments', tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  useEffect(() => {
    if (!fullTenant) return
    brandForm.reset({
      name: fullTenant.name ?? '',
      tagline: (fullTenant as any).tagline ?? '',
      logo_url: fullTenant.logo_url ?? '',
      primary_color: fullTenant.primary_color ?? '',
      support_email: (fullTenant as any).support_email ?? '',
      social_instagram: (fullTenant as any).social_instagram ?? '',
      social_whatsapp: (fullTenant as any).social_whatsapp ?? '',
    })
    integrationsForm.reset({
      meta_pixel_id: (fullTenant as any).meta_pixel_id ?? '',
      resend_api_key: (fullTenant as any).resend_api_key ?? '',
    })
  }, [fullTenant])

  const saveBrand = useMutation({
    mutationFn: async (data: BrandData) => {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: data.name,
          tagline: data.tagline || null,
          logo_url: data.logo_url || null,
          primary_color: data.primary_color || undefined,
          support_email: data.support_email || null,
          social_instagram: data.social_instagram || null,
          social_whatsapp: data.social_whatsapp || null,
        } as any)
        .eq('id', tenant!.id)
      if (error) throw error
    },
    onSuccess: () => toast.success('Configuración guardada'),
    onError: (e: Error) => toast.error(e.message),
  })

  const saveMp = useMutation({
    mutationFn: async (data: MpData) => {
      const { error } = await supabase
        .from('tenants')
        .update({ mp_access_token: data.mp_access_token, mp_public_key: data.mp_public_key } as any)
        .eq('id', tenant!.id)
      if (error) throw error
    },
    onSuccess: () => toast.success('Credenciales de Mercado Pago guardadas'),
    onError: (e: Error) => toast.error(e.message),
  })

  const saveIntegrations = useMutation({
    mutationFn: async (data: IntegrationsData) => {
      const { error } = await supabase
        .from('tenants')
        .update({
          meta_pixel_id: data.meta_pixel_id || null,
          resend_api_key: data.resend_api_key || null,
        } as any)
        .eq('id', tenant!.id)
      if (error) throw error
    },
    onSuccess: () => toast.success('Integraciones guardadas'),
    onError: (e: Error) => toast.error(e.message),
  })

  async function handleUpgrade(plan_name: string) {
    setUpgradingPlan(plan_name)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-subscription`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ plan_name }),
        }
      )
      const data = await res.json()
      if (data.init_point) window.location.href = data.init_point
      else toast.error(data.error ?? 'Error al procesar')
    } catch (e: any) {
      toast.error(e.message ?? 'Error al procesar')
    } finally {
      setUpgradingPlan(null)
    }
  }

  const currentPlanName = (tenant as any)?.plan_name ?? 'gratis'
  const planExpiresAt = (tenant as any)?.plan_expires_at as string | null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenant?.name} className="h-8 w-auto object-contain" />
            <Badge variant="secondary" className="text-xs">Configuración</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/instructor">Panel Instructor</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-400">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-3xl space-y-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Configuración de la escuela</h1>
          <p className="text-gray-500 mt-1">Personalizá tu plataforma y conectá tus herramientas de venta</p>
        </div>

        <Tabs defaultValue="brand">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="brand" className="gap-1.5">
              <Palette className="w-4 h-4" />
              Marca
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5">
              <CreditCard className="w-4 h-4" />
              Pagos
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-1.5">
              <Puzzle className="w-4 h-4" />
              Integraciones
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5">
              <Receipt className="w-4 h-4" />
              Facturación
            </TabsTrigger>
            <TabsTrigger value="domain" className="gap-1.5">
              <Globe className="w-4 h-4" />
              Dominio
            </TabsTrigger>
          </TabsList>

          {/* Branding */}
          <TabsContent value="brand" className="mt-6">
            <form onSubmit={brandForm.handleSubmit(d => saveBrand.mutate(d))} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <h2 className="font-heading font-semibold text-gray-900">Identidad de tu escuela</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nombre de la escuela</Label>
                  <Input placeholder="NATO University" {...brandForm.register('name')} />
                  {brandForm.formState.errors.name && <p className="text-xs text-red-500">{brandForm.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Tagline</Label>
                  <Input placeholder="Aprendé de los mejores" {...brandForm.register('tagline')} />
                </div>
              </div>

              <Controller
                control={brandForm.control}
                name="logo_url"
                render={({ field }) => (
                  <ImageUpload
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    bucket="avatars"
                    label="Logo de la escuela"
                    hint="PNG con fondo transparente · Máx 2MB · Recomendado 200×80px"
                    aspectRatio="video"
                  />
                )}
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Email de soporte</Label>
                  <Input type="email" placeholder="hola@tuescuela.com" {...brandForm.register('support_email')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Color principal (hex)</Label>
                  <Input placeholder="#F59E0B" {...brandForm.register('primary_color')} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Instagram</Label>
                  <Input placeholder="@tuescuela" {...brandForm.register('social_instagram')} />
                </div>
                <div className="space-y-1.5">
                  <Label>WhatsApp</Label>
                  <Input placeholder="+54911..." {...brandForm.register('social_whatsapp')} />
                </div>
              </div>

              <Button type="submit" variant="hero" disabled={saveBrand.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {saveBrand.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </form>
          </TabsContent>

          {/* Payments */}
          <TabsContent value="payments" className="mt-6 space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
              <p className="font-medium mb-1">¿Cómo funciona?</p>
              <p>Cada estudiante que compra un curso de tu escuela paga directamente a tu cuenta de Mercado Pago. NATO University no cobra comisión por pagos — solo la comisión estándar de MP.</p>
            </div>

            <form onSubmit={mpForm.handleSubmit(d => saveMp.mutate(d))} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <h2 className="font-heading font-semibold text-gray-900">Credenciales de Mercado Pago</h2>
              <p className="text-sm text-gray-500">
                Encontrá tus credenciales en{' '}
                <span className="text-primary">mercadopago.com/developers → Mis credenciales</span>.
                Usá las credenciales de <strong>Producción</strong> cuando estés listo para cobrar.
              </p>

              <div className="space-y-1.5">
                <Label>Access Token</Label>
                <Input
                  type="password"
                  placeholder="APP_USR-..."
                  {...mpForm.register('mp_access_token')}
                />
                {mpForm.formState.errors.mp_access_token && <p className="text-xs text-red-500">{mpForm.formState.errors.mp_access_token.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Public Key</Label>
                <Input
                  placeholder="APP_USR-..."
                  {...mpForm.register('mp_public_key')}
                />
                {mpForm.formState.errors.mp_public_key && <p className="text-xs text-red-500">{mpForm.formState.errors.mp_public_key.message}</p>}
              </div>

              <Button type="submit" variant="hero" disabled={saveMp.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {saveMp.isPending ? 'Guardando...' : 'Guardar credenciales'}
              </Button>
            </form>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations" className="mt-6">
            <form onSubmit={integrationsForm.handleSubmit(d => saveIntegrations.mutate(d))} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <h2 className="font-heading font-semibold text-gray-900">Integraciones</h2>

              <div className="space-y-1.5">
                <Label>Meta Pixel ID (escuela)</Label>
                <Input
                  placeholder="123456789012345"
                  {...integrationsForm.register('meta_pixel_id')}
                />
                <p className="text-xs text-gray-500">Se activa en todas las landings. Podés sobreescribir por curso.</p>
              </div>

              <div className="space-y-1.5">
                <Label>Resend API Key</Label>
                <Input
                  type="password"
                  placeholder="re_..."
                  {...integrationsForm.register('resend_api_key')}
                />
                <p className="text-xs text-gray-500">
                  Necesario para el email marketing. Conseguilo en{' '}
                  <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com</a>
                </p>
              </div>

              <Button type="submit" variant="hero" disabled={saveIntegrations.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {saveIntegrations.isPending ? 'Guardando...' : 'Guardar integraciones'}
              </Button>
            </form>
          </TabsContent>

          {/* Billing */}
          <TabsContent value="billing" className="mt-6 space-y-6">
            {/* Current plan */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-semibold text-gray-900">Tu plan actual</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {planExpiresAt
                      ? `Activo hasta ${new Date(planExpiresAt).toLocaleDateString('es-AR')}`
                      : currentPlanName === 'gratis' ? 'Plan gratuito sin vencimiento' : 'Activo'}
                  </p>
                </div>
                <Badge className="capitalize text-sm px-3 py-1" variant={currentPlanName === 'gratis' ? 'secondary' : 'default'}>
                  {currentPlanName}
                </Badge>
              </div>
            </div>

            {/* Plans comparison */}
            <div className="grid sm:grid-cols-3 gap-4">
              {(plans ?? []).map(plan => {
                const isCurrent = plan.name === currentPlanName
                return (
                  <div
                    key={plan.id}
                    className={`bg-white rounded-xl border-2 p-5 space-y-4 ${isCurrent ? 'border-primary' : 'border-gray-200'}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-heading font-bold text-gray-900">{plan.display_name}</span>
                        {isCurrent && <Badge className="text-xs">Actual</Badge>}
                        {plan.name === 'creador' && !isCurrent && (
                          <Badge variant="outline" className="text-xs text-primary border-primary/30">Popular</Badge>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {plan.price_ars === 0 ? 'Gratis' : `ARS ${Number(plan.price_ars).toLocaleString('es-AR')}`}
                        {plan.price_ars > 0 && <span className="text-sm font-normal text-gray-400">/mes</span>}
                      </p>
                    </div>
                    <ul className="space-y-1.5">
                      {(plan.features as string[]).map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                          <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {!isCurrent && plan.name !== 'gratis' && (
                      <Button
                        variant="hero"
                        size="sm"
                        className="w-full"
                        disabled={upgradingPlan === plan.name}
                        onClick={() => handleUpgrade(plan.name)}
                      >
                        {upgradingPlan === plan.name ? 'Procesando...' : `Mejorar a ${plan.display_name}`}
                      </Button>
                    )}
                    {isCurrent && plan.name !== 'gratis' && (
                      <Button variant="ghost" size="sm" className="w-full text-gray-400" disabled>
                        Plan actual
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Payment history */}
            {payments && payments.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <h2 className="font-heading font-semibold text-gray-900">Historial de pagos</h2>
                <div className="divide-y divide-gray-100">
                  {payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <span className="font-medium capitalize text-gray-900">{p.plan_name}</span>
                        <span className="text-gray-400 ml-2">
                          {new Date(p.created_at).toLocaleDateString('es-AR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">
                          ARS {Number(p.amount_ars).toLocaleString('es-AR')}
                        </span>
                        <Badge variant={p.status === 'approved' ? 'default' : p.status === 'pending' ? 'secondary' : 'destructive'} className="text-xs">
                          {p.status === 'approved' ? 'Pagado' : p.status === 'pending' ? 'Pendiente' : p.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Domain */}
          <TabsContent value="domain" className="mt-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-heading font-semibold text-gray-900">Dominio personalizado</h2>
              <p className="text-sm text-gray-500">
                Conectá tu propio dominio para que tus estudiantes accedan a tu escuela en <code className="bg-gray-100 px-1 rounded">tuescuela.com</code>.
              </p>
              <div className="space-y-1.5">
                <Label>Dominio actual</Label>
                <div className="flex items-center gap-2">
                  <Input value={fullTenant?.custom_domain ?? `${tenant?.slug}.nato-university.com`} readOnly className="bg-gray-50 text-gray-500" />
                  <Badge variant="secondary">{fullTenant?.custom_domain ? 'Configurado' : 'Default'}</Badge>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600 space-y-2">
                <p className="font-medium">Para configurar tu dominio:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Agregá un registro CNAME en tu DNS apuntando a <code className="bg-gray-100 px-1 rounded">app.nato-university.com</code></li>
                  <li>Contactanos por WhatsApp para activar el dominio en el servidor</li>
                </ol>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
