import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Check } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const TRUST_POINTS = ['Sin tarjeta de crédito', 'Listo en 2 minutos', 'Primer curso publicado hoy']

export default function HeroSection() {
  const { tenant, user } = useAuth()

  const tenantName = tenant?.name ?? 'NATO University'
  const isMainPlatform = !tenant || tenantName === 'NATO University'

  return (
    <section className="relative isolate overflow-hidden bg-mesh-purple">
      {/* Grid sutil overlay */}
      <div className="absolute inset-0 bg-grid-light opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)] pointer-events-none" />

      {/* Glow blobs sutiles */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-primary/[0.05] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-accent/[0.04] rounded-full blur-3xl pointer-events-none" />

      <div className="container relative z-10 pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="max-w-4xl mx-auto text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/15 bg-primary/[0.06] text-primary text-xs font-medium mb-8 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" aria-hidden />
            {isMainPlatform ? 'La plataforma para creadores argentinos' : `Bienvenido a ${tenantName}`}
          </div>

          {/* Headline */}
          {isMainPlatform ? (
            <h1 className="font-heading text-display-lg sm:text-display-xl lg:text-display-2xl text-foreground mb-6 animate-slide-up">
              Tu conocimiento ya vale.
              <br />
              <span className="text-gradient-primary">Nosotros le damos plataforma.</span>
            </h1>
          ) : (
            <h1 className="font-heading text-display-lg sm:text-display-xl lg:text-display-2xl text-foreground mb-6 animate-slide-up">
              Aprendé con<br />
              <span className="text-gradient-primary">{tenantName}</span>
            </h1>
          )}

          {/* Subheadline */}
          <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '60ms' }}>
            {isMainPlatform
              ? 'Creá tu escuela online, vendé tus cursos y cobrá con Mercado Pago. Sin servidores, sin código, sin vueltas.'
              : 'Formación práctica con resultados reales. Empezá hoy y obtené tu certificado verificable.'
            }
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5 animate-slide-up" style={{ animationDelay: '120ms' }}>
            {isMainPlatform ? (
              <>
                {!user && (
                  <Button variant="hero" size="xl" asChild>
                    <Link to="/create-school">
                      Crear mi escuela gratis
                      <ArrowRight />
                    </Link>
                  </Button>
                )}
                <Button variant="outline" size="xl" asChild>
                  <a href="#courses">Ver cursos disponibles</a>
                </Button>
              </>
            ) : (
              <>
                <Button variant="hero" size="xl" asChild>
                  <a href="#courses">
                    Ver cursos
                    <ArrowRight />
                  </a>
                </Button>
                {!user && (
                  <Button variant="outline" size="xl" asChild>
                    <Link to="/signup">Crear cuenta gratis</Link>
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Trust microcopy */}
          {isMainPlatform && !user && (
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-14 text-body-xs text-muted-foreground animate-fade-in" style={{ animationDelay: '180ms' }}>
              {TRUST_POINTS.map(point => (
                <span key={point} className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-accent" aria-hidden />
                  {point}
                </span>
              ))}
            </div>
          )}

        </div>
      </div>
    </section>
  )
}
