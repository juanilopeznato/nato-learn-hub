import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight, GraduationCap } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function HeroSection() {
  const { tenant, user } = useAuth()

  const tenantName = tenant?.name ?? 'NATO University'

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
            Plataforma de aprendizaje
          </div>

          {/* Headline */}
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-white">
            Aprendé con{' '}
            <span className="text-gradient-hero">{tenantName}</span>
          </h1>

          <p className="text-lg text-white/70 max-w-xl mx-auto leading-relaxed">
            Formación práctica, cursos con resultados reales y certificados verificables.
          </p>

          {/* CTAs — Estudiantes */}
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

          {/* Separador + CTA Creadores */}
          {!user && (
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
