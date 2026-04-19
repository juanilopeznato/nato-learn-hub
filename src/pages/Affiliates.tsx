import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowRight, DollarSign, Users, Share2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/landing/Navbar'

const STEPS = [
  {
    icon: Users,
    title: 'Registrá tu escuela gratis',
    desc: 'Creá tu cuenta en NATO University. Recibís un código de referido único.',
  },
  {
    icon: Share2,
    title: 'Compartí tu enlace',
    desc: 'Cada vez que alguien crea una escuela con tu código, queda vinculado a vos.',
  },
  {
    icon: DollarSign,
    title: 'Cobrás comisiones',
    desc: 'Ganás un % de cada venta que hagan tus referidos, todos los meses.',
  },
]

const BENEFITS = [
  'Comisiones recurrentes mientras el referido siga activo',
  'Dashboard de referidos en tiempo real',
  'Sin tope de referidos — escalá sin límites',
  'Pagos automáticos vía Mercado Pago',
  'Sin costo de entrada — empezá gratis',
]

export default function Affiliates() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Helmet>
        <title>Programa de afiliados — NATO University</title>
        <meta name="description" content="Ganá comisiones recurrentes recomendando NATO University. Sin límite de referidos. Pagos automáticos." />
      </Helmet>
      <Navbar />

      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-4xl space-y-20">

          {/* Hero */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-sm text-primary">
              <DollarSign className="w-4 h-4" />
              Programa de afiliados
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold leading-tight">
              Ganá recomendando{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                NATO University
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Compartí tu enlace único. Cada escuela que creen con tu código te genera comisiones automáticas, todos los meses.
            </p>
            <Button variant="hero" size="xl" asChild>
              <Link to="/create-school">
                Empezar a ganar
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>

          {/* Cómo funciona */}
          <div className="space-y-8">
            <h2 className="font-heading text-2xl font-bold text-center">Cómo funciona</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {STEPS.map((step, i) => (
                <div key={i} className="bg-gray-800 rounded-2xl p-6 space-y-3 border border-gray-700">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 w-6 h-6 rounded-full flex items-center justify-center">{i + 1}</span>
                    <h3 className="font-semibold text-white">{step.title}</h3>
                  </div>
                  <p className="text-gray-400 text-sm">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Beneficios */}
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 space-y-6">
            <h2 className="font-heading text-2xl font-bold">Por qué unirte</h2>
            <ul className="space-y-3">
              {BENEFITS.map((b, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA final */}
          <div className="text-center space-y-4">
            <h2 className="font-heading text-2xl font-bold">¿Listo para empezar?</h2>
            <p className="text-gray-400">Creá tu escuela gratis y encontrá tu enlace de afiliado en el panel de instructor.</p>
            <Button variant="hero" size="xl" asChild>
              <Link to="/create-school">
                Crear mi escuela gratis
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <p className="text-gray-500 text-sm">Ya tenés una cuenta? <Link to="/login" className="text-primary hover:underline">Iniciá sesión</Link></p>
          </div>

        </div>
      </div>
    </div>
  )
}
