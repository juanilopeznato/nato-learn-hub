import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

// Actualizá estos números con datos reales de la plataforma
const SOCIAL_PROOF = [
  { value: '50+', label: 'escuelas activas' },
  { value: '3,200+', label: 'alumnos' },
  { value: 'ARS 14M', label: 'vendidos por instructores' },
]

export default function HeroSection() {
  const { tenant, user } = useAuth()

  const tenantName = tenant?.name ?? 'NATO University'
  const isMainPlatform = !tenant || tenantName === 'NATO University'

  return (
    <section className="relative min-h-[85vh] flex items-center bg-gradient-dark overflow-hidden">
      {/* Glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/15 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="container mx-auto px-4 pt-24 pb-16 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-sm text-primary">
            <img src="/nato-logo.png" alt="NATO" className="h-4 w-auto" />
            {isMainPlatform ? 'La plataforma para instructores argentinos' : 'Plataforma de aprendizaje'}
          </div>

          {/* Headline */}
          {isMainPlatform ? (
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-white">
              Tu conocimiento ya vale dinero.{' '}
              <span className="text-gradient-hero">Nosotros te damos la plataforma.</span>
            </h1>
          ) : (
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-white">
              Aprendé con{' '}
              <span className="text-gradient-hero">{tenantName}</span>
            </h1>
          )}

          {/* Subheadline */}
          <p className="text-lg text-white/70 max-w-xl mx-auto leading-relaxed">
            {isMainPlatform
              ? 'Creá tu escuela, vendé tus cursos y cobrá con Mercado Pago. Sin servidor, sin complicaciones técnicas.'
              : 'Formación práctica con resultados reales. Empezá hoy y obtené tu certificado verificable.'
            }
          </p>

          {/* CTAs */}
          {isMainPlatform ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!user && (
                <Button variant="hero" size="xl" asChild>
                  <Link to="/create-school">
                    Crear mi escuela gratis
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              )}
              <Button variant="hero-outline" size="xl" asChild>
                <a href="#courses">
                  Ver cursos disponibles
                </a>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl" asChild>
                <a href="#courses">
                  Ver cursos
                  <ArrowRight className="w-5 h-5" />
                </a>
              </Button>
              {!user && (
                <Button variant="hero-outline" size="xl" asChild>
                  <Link to="/signup">Crear cuenta gratis</Link>
                </Button>
              )}
            </div>
          )}

          {/* Social proof — solo plataforma principal */}
          {isMainPlatform && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-4 border-t border-white/10">
              {SOCIAL_PROOF.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-white/40">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* CTA Creadores — solo para escuelas de terceros */}
          {!isMainPlatform && !user && (
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="flex items-center gap-3 w-full max-w-xs">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/30 shrink-0">¿Querés vender tus cursos?</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <Button variant="hero-outline" size="lg" asChild className="border-white/20 hover:border-white/40 hover:bg-white/5">
                <Link to="/create-school">
                  Creá tu escuela gratis
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
