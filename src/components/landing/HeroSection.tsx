import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import heroImage from "@/assets/hero-illustration.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center bg-gradient-dark overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/15 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="container mx-auto px-4 pt-24 pb-16 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-sm text-primary">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Plataforma de aprendizaje NATO
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-primary-foreground">
              Domina el marketing digital con{" "}
              <span className="text-gradient-hero">NATO University</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              Learning Paths estructurados, recursos premium y certificaciones 
              que impulsan tu carrera. De principiante a experto, a tu ritmo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="xl">
                Comenzar Gratis
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button variant="hero-outline" size="xl">
                <Play className="w-5 h-5" />
                Ver Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-4">
              {[
                { value: "50+", label: "Cursos" },
                { value: "2K+", label: "Estudiantes" },
                { value: "95%", label: "Satisfacción" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-heading text-2xl font-bold text-primary-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Image */}
          <div className="relative animate-float hidden lg:block">
            <div className="absolute inset-0 bg-gradient-hero rounded-2xl opacity-20 blur-2xl" />
            <img
              src={heroImage}
              alt="NATO University - Plataforma de aprendizaje digital"
              width={1280}
              height={720}
              className="relative rounded-2xl shadow-2xl border border-primary/20"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
