import { BookOpen, Play, Award } from 'lucide-react'

const STEPS = [
  {
    icon: BookOpen,
    title: 'Elegí tu curso',
    description: 'Catálogo de cursos prácticos en marketing, negocios, contenido y más.',
  },
  {
    icon: Play,
    title: 'Aplicá desde el día uno',
    description: 'Contenido 100% práctico. Avanzá a tu ritmo y aplicá lo aprendido en tu negocio.',
  },
  {
    icon: Award,
    title: 'Demostrá tus resultados',
    description: 'Al terminar recibís un certificado verificable para compartir en LinkedIn o WhatsApp.',
  },
]

export default function HowItWorks() {
  return (
    <section className="py-24 lg:py-32 bg-background border-b border-border/40">
      <div className="container max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-semibold tracking-wide text-primary block mb-3">
            Simple desde el día uno
          </span>
          <h2 className="font-heading text-display-md md:text-display-lg text-foreground mb-4">
            Así funciona
          </h2>
          <p className="text-body-md text-muted-foreground">
            Tres pasos para que tu próximo cambio profesional arranque hoy.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="group relative rounded-2xl border border-border/60 bg-card p-8 hover-lift"
            >
              {/* Step number */}
              <div className="absolute -top-3 left-8 inline-flex items-center justify-center h-6 px-2.5 rounded-full bg-foreground text-background text-xs font-mono font-semibold">
                {String(i + 1).padStart(2, '0')}
              </div>

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/[0.08] text-primary flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors duration-200">
                <step.icon className="w-5 h-5" aria-hidden />
              </div>

              <h3 className="font-heading text-display-sm text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-body-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
