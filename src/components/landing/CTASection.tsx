import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function CTASection() {
  const { user, tenant } = useAuth()

  if (user) return null

  return (
    <section className="py-24 bg-gradient-dark relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10 text-center space-y-6">
        <h2 className="font-heading text-3xl sm:text-5xl font-bold text-white">
          ¿Listo para{' '}
          <span className="text-gradient-hero">empezar?</span>
        </h2>
        <p className="text-lg text-white/60 max-w-md mx-auto">
          Creá tu cuenta gratis y accedé a todos los cursos de {tenant?.name ?? 'NATO University'}.
        </p>
        <Button variant="hero" size="xl" asChild>
          <Link to="/signup">
            Crear cuenta gratis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
