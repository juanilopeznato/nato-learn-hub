import { Button } from "@/components/ui/button";
import { Clock, BookOpen, ArrowRight } from "lucide-react";

const paths = [
  {
    title: "Onboarding Agency",
    description: "Domina las herramientas y procesos del servicio de agencia NATO desde el día uno.",
    lessons: 12,
    duration: "4 horas",
    level: "Principiante",
    color: "from-primary to-nato-purple-glow",
  },
  {
    title: "Creative Studio Mastery",
    description: "Aprende a crear contenido de alto impacto con el creative studio de NATO.",
    lessons: 18,
    duration: "6 horas",
    level: "Intermedio",
    color: "from-accent to-nato-green-glow",
  },
  {
    title: "Ads Performance Pro",
    description: "Optimiza campañas publicitarias y maximiza el ROI de tus clientes.",
    lessons: 15,
    duration: "5 horas",
    level: "Avanzado",
    color: "from-primary via-accent to-nato-green-glow",
  },
];

const PathsSection = () => {
  return (
    <section id="paths" className="py-24 bg-gray-50 relative overflow-hidden">

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Learning Paths{" "}
            <span className="text-gradient-hero">diseñados para ti</span>
          </h2>
          <p className="text-gray-500 text-lg">
            Recorridos estructurados que te llevan de 0 a experto, con quizzes 
            y certificación al completar.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {paths.map((path) => (
            <div
              key={path.title}
              className="group relative rounded-xl overflow-hidden bg-white border border-gray-200 hover:border-primary/40 hover:shadow-lg transition-all duration-300"
            >
              {/* Top gradient bar */}
              <div className={`h-1.5 bg-gradient-to-r ${path.color}`} />
              
              <div className="p-6 space-y-4">
                <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                  {path.level}
                </span>
                <h3 className="font-heading text-xl font-semibold text-gray-900">
                  {path.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {path.description}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {path.lessons} lecciones
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {path.duration}
                  </span>
                </div>

                <Button variant="ghost" className="w-full justify-between text-primary hover:text-primary group-hover:bg-primary/10">
                  Explorar Path
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button variant="hero" size="lg">
            Ver todos los paths
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PathsSection;
