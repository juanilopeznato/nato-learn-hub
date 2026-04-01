import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Freemium",
    price: "$0",
    period: "siempre",
    description: "Ideal para explorar la plataforma",
    features: [
      "3-5 paths gratuitos",
      "Resource Library pública",
      "Foros de comunidad",
      "Progreso básico",
    ],
    cta: "Comenzar Gratis",
    variant: "hero-outline" as const,
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mes",
    description: "Acceso completo para profesionales",
    features: [
      "Todos los Learning Paths",
      "Certificaciones verificables",
      "Recursos premium",
      "Soporte prioritario",
      "Analytics avanzado",
    ],
    cta: "Comenzar Pro",
    variant: "hero" as const,
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Para equipos y organizaciones",
    features: [
      "Todo en Pro",
      "SSO + integración CRM",
      "API access",
      "Reportes B2B personalizados",
      "Account manager dedicado",
    ],
    cta: "Contactar Ventas",
    variant: "hero-outline" as const,
    highlighted: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 bg-background relative">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Planes que se adaptan a{" "}
            <span className="text-primary">tu crecimiento</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Empieza gratis y escala cuando estés listo. Sin compromisos.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl p-6 border transition-all duration-300 ${
                plan.highlighted
                  ? "border-primary shadow-glow-purple bg-gradient-card scale-105"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-hero rounded-full text-xs font-semibold text-primary-foreground">
                  Más Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-heading text-xl font-semibold text-card-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                <div className="mt-4">
                  <span className="font-heading text-4xl font-bold text-card-foreground">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-card-foreground">
                    <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button variant={plan.variant} size="lg" className="w-full">
                {plan.cta}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
