import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Check, Zap, Shield, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/landing/Navbar'

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
    <div className="min-h-screen bg-gray-900 text-white">
      <Helmet>
        <title>Planes y precios — NATO University</title>
        <meta name="description" content="Elegí el plan que mejor se adapta a tu escuela online. Empezá gratis y escalá cuando estés listo. Planes para creadores en Argentina." />
        <link rel="canonical" href="https://nato-learn-hub.vercel.app/pricing" />
        <meta property="og:title" content="Planes y precios — NATO University" />
        <meta property="og:description" content="Empezá gratis. Escalá cuando estés listo. Planes para creadores en Argentina." />
        <meta property="og:url" content="https://nato-learn-hub.vercel.app/pricing" />
      </Helmet>
      <Navbar />

      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4">
              Elegí tu plan
            </h1>
            <p className="text-gray-400 text-lg mb-4">
              Empezá gratis. Escalá cuando estés listo.
            </p>
            <div className="inline-flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-4 py-2">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              Precio early adopter garantizado hasta el 31 de mayo
            </div>
          </div>

            {/* Toggle mensual/anual */}
            <div className="inline-flex items-center gap-3 bg-gray-800 rounded-full p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  !annual ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                  annual ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Anual
                <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-semibold">
                  −17%
                </span>
              </button>
            </div>
            {annual && (
              <p className="text-sm text-green-400 mt-2">2 meses gratis incluidos</p>
            )}
          </div>

          {/* Banner 14 días */}
          <div className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-2xl p-4 mb-8 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">14 días gratis en Creator o Pro</p>
              <p className="text-gray-400 text-xs mt-0.5">Sin tarjeta de crédito. Cancelá cuando quieras.</p>
            </div>
            <Button variant="hero" size="sm" asChild className="shrink-0">
              <Link to="/create-school">Empezar gratis</Link>
            </Button>
          </div>

          {/* Plan cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-gray-800 rounded-2xl p-6 h-96 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    className={`relative bg-gray-800 rounded-2xl p-7 flex flex-col border ${
                      isPopular
                        ? 'border-primary shadow-lg shadow-primary/10'
                        : 'border-gray-700'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs font-semibold shadow">
                          Más popular
                        </Badge>
                      </div>
                    )}

                    {/* Plan name */}
                    <h2 className="font-heading text-2xl font-bold text-white mb-2">
                      {plan.display_name}
                    </h2>

                    {/* Price */}
                    <div className="mb-6">
                      {isFree ? (
                        <span className="text-4xl font-bold text-white">Gratis</span>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-white">
                              ARS {displayPrice.toLocaleString('es-AR')}
                            </span>
                            <span className="text-gray-400 text-sm">/mes</span>
                          </div>
                          {annual && (
                            <p className="text-xs text-green-400">
                              Ahorrás ARS {annualSaving.toLocaleString('es-AR')}/año
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 flex-1 mb-8">
                      {features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                          <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    {isFree ? (
                      <Button
                        variant={isPopular ? 'hero' : 'hero-outline'}
                        className="w-full"
                        asChild
                      >
                        <Link to="/create-school">Crear mi escuela gratis</Link>
                      </Button>
                    ) : (
                      <Button
                        variant={isPopular ? 'hero' : 'hero-outline'}
                        className="w-full"
                        asChild
                      >
                        <Link to={`/create-school?plan=${plan.name}&billing=${annual ? 'annual' : 'monthly'}`}>Crear mi escuela</Link>
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Garantía */}
          <div className="mt-10 bg-green-500/10 border border-green-500/20 rounded-2xl p-7 text-center">
            <Shield className="w-9 h-9 text-green-400 mx-auto mb-3" />
            <h3 className="font-heading text-xl font-bold text-white mb-2">Garantía de 30 días</h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Si en los primeros 30 días no vendés tu primer curso, te devolvemos el dinero. Sin preguntas, sin burocracia.
            </p>
          </div>

          {/* Value stack — cuánto costaría hacerlo solo */}
          <div className="mt-8 bg-gray-800 border border-gray-700 rounded-2xl p-7">
            <h3 className="font-heading text-lg font-bold text-white mb-1">¿Cuánto costaría armar esto vos solo?</h3>
            <p className="text-gray-400 text-sm mb-6">Todo lo que incluye NATO University, desglosado.</p>
            <div className="space-y-3">
              {COST_COMPARISON.map((row, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <X className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    {row.item}
                  </div>
                  <span className="text-red-400 font-semibold shrink-0 ml-4">{row.price}/mes</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-700 mt-5 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Si lo armás por tu cuenta</span>
                <span className="text-red-400 font-bold">ARS 90,000+/mes</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-200 font-semibold">Con NATO University Creator</span>
                <span className="text-green-400 font-bold">Desde ARS 15,000/mes</span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-gray-500 text-sm mt-8">
            Sin contratos. Cancelá cuando quieras. Precios en ARS.
          </p>
        </div>
      </div>
    </div>
  )
}
