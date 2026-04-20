import { BookOpen, Play, Award } from 'lucide-react'

const STEPS = [
  {
    icon: BookOpen,
    number: '01',
    title: 'Elegí tu curso',
    description: 'Accedé al catálogo y encontrá el conocimiento que te falta para dar el próximo salto.',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
  },
  {
    icon: Play,
    number: '02',
    title: 'Aplicá desde el día uno',
    description: 'Contenido 100% práctico. Avanzá cuando quieras y aplicá lo aprendido en tu negocio o carrera.',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/20',
  },
  {
    icon: Award,
    number: '03',
    title: 'Demostrá tus resultados',
    description: 'Al terminar obtenés un certificado verificable para compartir en LinkedIn, WhatsApp o tu portfolio.',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
]

export default function HowItWorks() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-3 block">
            Simple desde el día uno
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-gray-900">
            Así funciona
          </h2>
        </div>

        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Línea conectora entre pasos (solo desktop) */}
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px border-t-2 border-dashed border-gray-200 z-0" />

          {STEPS.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center text-center gap-4 z-10">
              {/* Número + ícono */}
              <div className={`w-20 h-20 rounded-2xl ${step.bg} border ${step.border} flex flex-col items-center justify-center gap-1 shadow-sm`}>
                <step.icon className={`w-7 h-7 ${step.color}`} />
              </div>

              {/* Badge de número */}
              <div className="absolute -top-2 -right-2 md:right-auto md:left-[calc(50%+2rem)] w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shadow">
                {i + 1}
              </div>

              <div className="space-y-1.5">
                <h3 className="font-heading text-lg font-bold text-gray-900">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-[220px] mx-auto">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
