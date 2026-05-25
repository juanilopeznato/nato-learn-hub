import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

// Actualizá estos números con datos reales de la plataforma
const SOCIAL_PROOF = [
  { value: '50+', label: 'escuelas activas' },
  { value: '3.200+', label: 'alumnos' },
  { value: 'ARS 14M', label: 'facturados' },
]

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
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16 animate-slide-up" style={{ animationDelay: '120ms' }}>
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

          {/* Social proof solo en plataforma principal */}
          {isMainPlatform && (
            <div className="pt-10 border-t border-border/50 animate-fade-in" style={{ animationDelay: '240ms' }}>
              <p className="text-eyebrow text-muted-foreground uppercase mb-6">
                Usado por instructores en toda Argentina
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-16">
                {SOCIAL_PROOF.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="font-heading text-display-md text-foreground tracking-tight">
                      {stat.value}
                    </div>
                    <div className="text-body-xs uppercase tracking-wider text-muted-foreground mt-1">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA Creadores — solo escuelas de terceros */}
          {!isMainPlatform && !user && (
            <div className="flex flex-col items-center gap-4 pt-4">
              <div className="flex items-center gap-3 w-full max-w-xs">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground shrink-0">¿Querés vender tus cursos?</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <Button variant="soft" asChild>
                <Link to="/create-school">
                  Creá tu escuela en NATO University
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
