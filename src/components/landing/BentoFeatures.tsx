/**
 * Bento grid section — estilo Vercel/Linear/Apple.
 *
 * Grid asimétrico con 5 features destacados. Cards de tamaños distintos
 * para crear ritmo visual. Cada card con micro-decoración propia.
 */
import { CreditCard, Smartphone, Sparkles, Users, BarChart3, Globe } from 'lucide-react'
import { FadeUpOnView } from '@/components/FadeUpOnView'

export default function BentoFeatures() {
  return (
    <section className="py-24 lg:py-32 bg-secondary/30 border-b border-border/40">
      <div className="container max-w-6xl">
        <FadeUpOnView className="text-center max-w-2xl mx-auto mb-14">
          <span className="font-serif italic text-xl text-primary block mb-2">
            Todo lo que necesitás
          </span>
          <h2 className="font-heading text-display-md md:text-display-lg text-foreground mb-4">
            Lanzá una escuela completa,
            <br />
            <span className="text-gradient-primary">no sólo un sitio.</span>
          </h2>
          <p className="text-body-md text-muted-foreground">
            Plataforma de video, pagos en pesos, comunidad, certificados — todo incluído.
          </p>
        </FadeUpOnView>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
          {/* Big card: Mercado Pago — span 2 cols */}
          <FadeUpOnView delay={0} className="md:col-span-2">
            <div className="relative h-full rounded-2xl bg-card border border-border/60 p-7 lg:p-9 overflow-hidden group hover-lift">
              {/* Decoración: mockup card flotante */}
              <div className="absolute top-6 right-6 hidden md:block">
                <div className="relative rotate-6 group-hover:rotate-3 transition-transform duration-500 ease-apple">
                  <div className="w-44 h-28 rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-xl p-4 flex flex-col justify-between">
                    <CreditCard className="w-6 h-6 text-white/80" aria-hidden />
                    <div>
                      <p className="text-[10px] text-white/70 uppercase tracking-wider">Pago recibido</p>
                      <p className="text-white text-lg font-semibold tabular-nums">ARS 280.000</p>
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-44 h-28 rounded-xl bg-accent/80 -z-10 shadow-lg" />
                </div>
              </div>
              <div className="relative z-10 max-w-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <CreditCard className="w-5 h-5" aria-hidden />
                </div>
                <h3 className="font-heading text-display-sm text-foreground mb-2">
                  Cobrás en tu cuenta de Mercado Pago
                </h3>
                <p className="text-body-sm text-muted-foreground leading-relaxed">
                  La plata va directo a tu cuenta. Hasta 12 cuotas con tarjeta. NATO retiene 5% solo de las ventas que se hacen.
                </p>
              </div>
            </div>
          </FadeUpOnView>

          {/* Small: Mobile */}
          <FadeUpOnView delay={80}>
            <div className="relative h-full rounded-2xl bg-mesh-purple border border-primary/15 p-7 overflow-hidden group hover-lift">
              <div className="absolute -bottom-8 -right-8 opacity-40 group-hover:opacity-60 transition-opacity">
                <Smartphone className="w-44 h-44 text-primary/30" aria-hidden />
              </div>
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl bg-background border border-border/60 text-primary flex items-center justify-center mb-4">
                  <Smartphone className="w-5 h-5" aria-hidden />
                </div>
                <h3 className="font-heading text-display-sm text-foreground mb-2">
                  Mobile-first
                </h3>
                <p className="text-body-sm text-muted-foreground leading-relaxed">
                  La mayoría de los alumnos ven cursos desde el celu. La app responde a eso.
                </p>
              </div>
            </div>
          </FadeUpOnView>

          {/* Small: Comunidad */}
          <FadeUpOnView delay={160}>
            <div className="relative h-full rounded-2xl bg-card border border-border/60 p-7 group hover-lift">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Users className="w-5 h-5" aria-hidden />
              </div>
              <h3 className="font-heading text-display-sm text-foreground mb-2">
                Comunidad integrada
              </h3>
              <p className="text-body-sm text-muted-foreground leading-relaxed mb-4">
                Foro privado por curso. Tus alumnos preguntan, comparten wins.
              </p>
              {/* Mini-avatares decorativos */}
              <div className="flex -space-x-2">
                {['#5B21F5', '#3EC9A7', '#F59E0B', '#EC4899'].map((c) => (
                  <div key={c} className="w-7 h-7 rounded-full border-2 border-card" style={{ background: c }} />
                ))}
                <div className="w-7 h-7 rounded-full border-2 border-card bg-secondary text-foreground/70 text-xs font-medium flex items-center justify-center">
                  +12
                </div>
              </div>
            </div>
          </FadeUpOnView>

          {/* Big: Analytics — span 2 cols */}
          <FadeUpOnView delay={240} className="md:col-span-2">
            <div className="relative h-full rounded-2xl bg-card border border-border/60 p-7 lg:p-9 group hover-lift overflow-hidden">
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <BarChart3 className="w-5 h-5" aria-hidden />
                  </div>
                  <h3 className="font-heading text-display-sm text-foreground mb-2">
                    Analytics que importan
                  </h3>
                  <p className="text-body-sm text-muted-foreground leading-relaxed">
                    Tasa de completado por lección, alumnos inactivos, revenue mensual. Sabés exactamente qué funciona.
                  </p>
                </div>
                {/* Chart bars decorativos */}
                <div className="hidden md:flex items-end justify-end gap-2 h-32">
                  {[40, 55, 38, 72, 60, 88, 95].map((h, i) => (
                    <div
                      key={i}
                      className="w-7 rounded-t-md bg-gradient-to-t from-primary/20 to-primary/60 transition-all duration-500 ease-apple group-hover:from-primary/40 group-hover:to-primary"
                      style={{ height: `${h}%`, transitionDelay: `${i * 40}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </FadeUpOnView>

          {/* Small: Certificados */}
          <FadeUpOnView delay={320}>
            <div className="relative h-full rounded-2xl bg-card border border-border/60 p-7 group hover-lift overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5" aria-hidden />
              </div>
              <h3 className="font-heading text-display-sm text-foreground mb-2">
                Certificados verificables
              </h3>
              <p className="text-body-sm text-muted-foreground leading-relaxed">
                Tus alumnos comparten el certificado en LinkedIn con QR de verificación pública.
              </p>
            </div>
          </FadeUpOnView>

          {/* Small: Dominio */}
          <FadeUpOnView delay={400}>
            <div className="relative h-full rounded-2xl bg-card border border-border/60 p-7 group hover-lift overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Globe className="w-5 h-5" aria-hidden />
              </div>
              <h3 className="font-heading text-display-sm text-foreground mb-2">
                Dominio propio
              </h3>
              <p className="text-body-sm text-muted-foreground leading-relaxed mb-3">
                Subimos tu propia URL al hosting. Tu marca, tu URL.
              </p>
              <code className="text-xs font-mono text-primary bg-primary/8 rounded-md px-2 py-1 inline-block">
                tu-escuela.com
              </code>
            </div>
          </FadeUpOnView>
        </div>
      </div>
    </section>
  )
}
