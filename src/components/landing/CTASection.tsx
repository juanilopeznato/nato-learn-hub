import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 bg-gradient-dark relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10 text-center">
        <h2 className="font-heading text-3xl sm:text-5xl font-bold text-primary-foreground mb-6">
          ¿Listo para dominar el{" "}
          <span className="text-gradient-hero">marketing digital</span>?
        </h2>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-10">
          Únete a miles de profesionales que ya están creciendo con NATO University. 
          Comienza hoy, gratis.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="hero" size="xl">
            Crear cuenta gratis
            <ArrowRight className="w-5 h-5" />
          </Button>
          <Button variant="hero-outline" size="xl">
            Hablar con ventas
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
