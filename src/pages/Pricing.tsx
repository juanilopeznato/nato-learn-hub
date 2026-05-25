import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Check, Zap, Shield, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/landing/Navbar'
import { canonicalUrl, absoluteUrl } from '@/lib/seo'

const COST_COMPARISON = [
  { item: 'Plataforma de video (Vimeo Pro)', price: 'ARS 28,000' },
  { item: 'Pasarela de pagos (MP directo sin plataforma)', price: 'ARS 15,000' },
  { item: 'Email marketing (Mailchimp Essentials)', price: 'ARS 18,000' },
  { item: 'Certificados verificables', price: 'ARS 8,000' },
  { item: 'Comunidad integrada', price: 'ARS 12,000' },
  { item: 'Hosting + dominio', price: 'ARS 9,000' },
]

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

export default function Pricing() {
  const [annual, setAnnual] = useState(false)

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ['public-plans'],
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Planes y precios — NATO University</title>
        <meta name="description" content="Elegí el plan que mejor se adapta a tu escuela online. Empezá gratis y escalá cuando estés listo. Planes para creadores en Argentina." />
        <link rel="canonical" href={canonicalUrl('/pricing')} />
        <meta property="og:title" content="Planes y precios — NATO University" />
        <meta property="og:description" content="Empezá gratis. Escalá cuando estés listo. Planes para creadores en Argentina." />
        <meta property="og:url" content={canonicalUrl('/pricing')} />
        <meta property="og:image" content={absoluteUrl('/nato-logo.png')} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="NATO University" />
        <meta property="og:locale" content="es_AR" />
      </Helmet>
      <Navbar />

      {/* Hero pricing — fondo light con mesh sutil */}
      <div className="relative isolate bg-mesh-purple border-b border-border/40">
        <div className="absolute inset-0 bg-grid-light opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)] pointer-events-none" />
        <div className="container max-w-6xl relative z-10 pt-32 pb-12">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-eyebrow uppercase text-primary block mb-4">Planes y precios</span>
            <h1 className="font-heading text-display-lg md:text-display-xl text-foreground mb-4">
              Elegí tu plan
            </h1>
            <p className="text-body-lg text-muted-foreground mb-6">
              Empezá gratis. Escalá cuando estés listo.
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              Precio early adopter garantizado hasta el 31 de mayo
            </div>
          </div>

          {/* Toggle mensual/anual */}
          <div className="flex flex-col items-center gap-2 mb-10">
            <div role="group" aria-label="Período de facturación" className="inline-flex items-center gap-1 bg-secondary rounded-full p-1 border border-border/60">
              <button
                type="button"
                aria-pressed={!annual}
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ease-apple ${
                  !annual ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Mensual
              </button>
              <button
                type="button"
                aria-pressed={annual}
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ease-apple flex items-center gap-1.5 ${
                  annual ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Anual
                <span className="text-[10px] bg-accent/12 text-accent px-1.5 py-0.5 rounded-full font-semibold">
                  −17%
                </span>
              </button>
            </div>
            {annual && (
              <p className="text-xs text-accent font-medium">2 meses gratis incluidos</p>
            )}
          </div>
        </div>
      </div>

      <div className="container max-w-6xl pb-24 pt-12">
        {/* Banner 14 días */}
        <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4 mb-10 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-primary" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm">14 días gratis en Creator o Pro</p>
              <p className="text-muted-foreground/80 text-xs mt-0.5">Sin tarjeta de crédito. Cancelá cuando quieras.</p>
            </div>
            <Button variant="hero" size="sm" asChild className="shrink-0">
              <Link to="/create-school">Empezar gratis</Link>
            </Button>
          </div>

        {/* Plan cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-secondary rounded-2xl p-6 h-96 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-7">
            {plans?.map(plan => {
              const isPopular = plan.name === 'creador'
              const isFree = plan.name === 'gratis'
              const features = Array.isArray(plan.features) ? plan.features : []
              const monthlyPrice = plan.price_ars
              const annualMonthlyPrice = Math.round(monthlyPrice * 10 / 12)
              const displayPrice = annual ? annualMonthlyPrice : monthlyPrice
              const annualSaving = monthlyPrice * 12 - monthlyPrice * 10

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl flex flex-col bg-card transition-all duration-200 ease-apple ${
                    isPopular
                      ? 'border-2 border-primary shadow-primary-md p-8 -mt-2 md:-mb-2'
                      : 'border border-border/60 shadow-xs p-7 hover:shadow-md'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge size="lg" className="bg-primary text-primary-foreground shadow-primary-md">
                        Más popular
                      </Badge>
                    </div>
                  )}

                  {/* Plan name */}
                  <h2 className="font-heading text-display-sm text-foreground mb-1">
                    {plan.display_name}
                  </h2>
                  <p className="text-body-xs text-muted-foreground mb-6 min-h-[1.5em]">
                    {isFree ? 'Para empezar tu primera escuela' : isPopular ? 'Para creadores que ya facturan' : 'Para escalar a partir de cierto volumen'}
                  </p>

                  {/* Price */}
                  <div className="mb-6 pb-6 border-b border-border/40">
                    {isFree ? (
                      <span className="font-heading text-display-md text-foreground">Gratis</span>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-1">
                          <span className="font-heading text-display-md text-foreground tracking-tight">
                            ARS {displayPrice.toLocaleString('es-AR')}
                          </span>
                          <span className="text-muted-foreground text-sm">/mes</span>
                        </div>
                        {annual ? (
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">
                              Facturado ARS {(monthlyPrice * 10).toLocaleString('es-AR')} al año
                            </p>
                            <p className="text-xs text-accent font-medium">
                              Ahorrás ARS {annualSaving.toLocaleString('es-AR')}/año
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Facturado mensualmente
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 flex-1 mb-8">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                        <span className="mt-0.5 shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent/10">
                          <Check className="w-3 h-3 text-accent" aria-hidden />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    variant={isPopular ? 'hero' : 'outline'}
                    size="lg"
                    className="w-full"
                    asChild
                  >
                    <Link to={isFree ? '/create-school' : `/create-school?plan=${plan.name}&billing=${annual ? 'annual' : 'monthly'}`}>
                      {isFree ? 'Crear mi escuela gratis' : 'Crear mi escuela'}
                    </Link>
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {/* Garantía */}
        <div className="mt-12 rounded-2xl border border-accent/20 bg-accent/[0.04] p-7 text-center">
          <div className="w-12 h-12 rounded-xl bg-accent/10 mx-auto mb-3 flex items-center justify-center">
            <Shield className="w-6 h-6 text-accent" aria-hidden />
          </div>
          <h3 className="font-heading text-display-sm text-foreground mb-2">Garantía de 30 días</h3>
          <p className="text-body-sm text-muted-foreground max-w-md mx-auto">
            Si en los primeros 30 días no vendés tu primer curso, te devolvemos el dinero. Sin preguntas, sin burocracia.
          </p>
        </div>

        {/* Value stack — cuánto costaría hacerlo solo */}
        <div className="mt-8 rounded-2xl border border-border/60 bg-card p-7">
          <h3 className="font-heading text-display-sm text-foreground mb-1">¿Cuánto costaría armar esto vos solo?</h3>
          <p className="text-body-sm text-muted-foreground mb-6">Todo lo que incluye NATO University, desglosado.</p>
          <div className="space-y-3">
            {COST_COMPARISON.map((row, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-2.5 text-foreground/80">
                  <X className="w-3.5 h-3.5 text-destructive shrink-0" aria-hidden />
                  {row.item}
                </div>
                <span className="text-destructive font-semibold shrink-0 ml-4 tabular-nums">{row.price}/mes</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border/60 mt-5 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Si lo armás por tu cuenta</span>
              <span className="text-destructive font-bold tabular-nums">ARS 90.000+/mes</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground font-semibold">Con NATO University Creator</span>
              <span className="text-accent font-bold tabular-nums">Desde ARS 15.000/mes</span>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-muted-foreground text-sm mt-8">
          Sin contratos. Cancelá cuando quieras. Precios en ARS.
        </p>
      </div>
    </div>
  )
}
