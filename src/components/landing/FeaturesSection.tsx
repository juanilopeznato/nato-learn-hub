import { BookOpen, Trophy, Video, BarChart3, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Learning Paths Estructurados",
    description: "Cursos modulares con prerrequisitos inteligentes. Avanza paso a paso sin perderte.",
  },
  {
    icon: Video,
    title: "Smart Video Player",
    description: "Retoma donde lo dejaste. Transcripciones, recursos y foros integrados en cada lección.",
  },
  {
    icon: Trophy,
    title: "Certificaciones & Badges",
    description: "Obtén certificados verificables y compártelos directamente en LinkedIn.",
  },
  {
    icon: BarChart3,
    title: "Analytics en Tiempo Real",
    description: "Métricas de progreso, watch-time y rendimiento en quizzes para instructores.",
  },
  {
    icon: Shield,
    title: "Contenido Protegido",
    description: "Watermarking automático en PDFs y acceso seguro con SSO integrado.",
  },
  {
    icon: Zap,
    title: "Automatización CRM",
    description: "Auto-inscripción al activar servicios NATO. Sin pasos manuales.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-background relative">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Todo lo que necesitas para{" "}
            <span className="text-primary">aprender y enseñar</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Una plataforma completa diseñada para maximizar el aprendizaje 
            y simplificar la gestión de contenido.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group p-6 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-gradient-card transition-all duration-300 hover:shadow-lg"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-card-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
