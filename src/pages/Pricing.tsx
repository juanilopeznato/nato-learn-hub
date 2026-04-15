import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/landing/Navbar'

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
          <div className="text-center mb-14">
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4">
              Elegí tu plan
            </h1>
            <p className="text-gray-400 text-lg">
              Empezá gratis. Escalá cuando estés listo.
            </p>
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
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-white">
                            ARS {plan.price_ars.toLocaleString('es-AR')}
                          </span>
                          <span className="text-gray-400 text-sm">/mes</span>
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
                        <Link to={`/create-school?plan=${plan.name}`}>Crear mi escuela</Link>
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Footer note */}
          <p className="text-center text-gray-500 text-sm mt-10">
            Sin contratos. Cancelá cuando quieras. Precios en ARS.
          </p>
        </div>
      </div>
    </div>
  )
}
