import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import { useAuth } from '@/context/AuthContext'
import { canonicalUrl } from '@/lib/seo'

/**
 * Términos y Condiciones — adaptados al marco regulatorio argentino:
 * Código Civil y Comercial, Ley de Defensa del Consumidor (24.240),
 * Ley de Datos Personales (25.326).
 */
export default function TermsOfService() {
  const { tenant } = useAuth()
  const tenantName = tenant?.name ?? 'NATO University'
  const supportEmail = (tenant && 'support_email' in tenant ? (tenant as { support_email?: string | null }).support_email : null) ?? 'hola@natoglobal.com'

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Términos y Condiciones — {tenantName}</title>
        <meta name="description" content={`Términos y Condiciones de uso de ${tenantName}. Reglas del servicio, derechos y obligaciones.`} />
        <link rel="canonical" href={canonicalUrl('/terms')} />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <Navbar />

      <main className="container max-w-3xl py-24 lg:py-32">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Volver al inicio
        </Link>

        <header className="mb-12 pb-8 border-b border-border/40">
          <h1 className="font-heading text-display-lg text-foreground tracking-tight">Términos y Condiciones</h1>
          <p className="text-sm text-muted-foreground mt-3">
            Última actualización: 8 de junio de 2026 · Vigencia inmediata
          </p>
        </header>

        <article className="prose prose-lesson max-w-none space-y-8 text-foreground/85 leading-relaxed">

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">1. Aceptación de los términos</h2>
            <p>
              Al crear una cuenta, comprar un curso o usar de cualquier forma {tenantName} (en adelante, "la Plataforma"), aceptás estos Términos y Condiciones en su totalidad. Si no estás de acuerdo, no uses el servicio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">2. Descripción del servicio</h2>
            <p>
              La Plataforma ofrece cursos online en formato video, materiales descargables, foros de comunidad, y certificados verificables al completar los cursos. El acceso al contenido es individual y personal.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">3. Cuenta de usuario</h2>
            <ul className="list-disc list-outside ml-6 space-y-2">
              <li>Debés tener al menos 18 años para crear una cuenta. Menores requieren consentimiento expreso de sus padres o tutores.</li>
              <li>Sos responsable de mantener la confidencialidad de tu contraseña. La Plataforma no se hace responsable por accesos no autorizados derivados de la pérdida o filtración de tu contraseña.</li>
              <li>Una cuenta = una persona. Compartir cuenta para acceder al contenido es una causal de suspensión.</li>
              <li>Podés cancelar tu cuenta en cualquier momento desde tu panel de usuario.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">4. Compra de cursos</h2>
            <ul className="list-disc list-outside ml-6 space-y-2">
              <li><strong>Precio:</strong> el precio publicado al momento de la compra es el que se aplica. Todos los precios están expresados en Pesos Argentinos (ARS) e incluyen IVA si correspondiera.</li>
              <li><strong>Método de pago:</strong> los pagos se procesan a través de Mercado Pago. Aceptamos tarjetas de crédito (hasta 12 cuotas), débito y transferencia.</li>
              <li><strong>Factura:</strong> Mercado Pago genera el comprobante fiscal por cada transacción. Si necesitás factura A o B con CUIT, podés solicitarla escribiendo a {supportEmail} dentro de los 5 días hábiles posteriores a la compra.</li>
              <li><strong>Acceso:</strong> el acceso al curso se habilita automáticamente al confirmarse el pago (estado "aprobado" en Mercado Pago).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">5. Garantía de devolución (30 días)</h2>
            <p>
              Tenés <strong>30 días corridos desde la fecha de compra</strong> para solicitar devolución total del dinero. Sin preguntas ni burocracia. Solo escribinos a {supportEmail} con el email de tu cuenta y procesamos el reembolso en un plazo máximo de 10 días hábiles a través del mismo medio de pago.
            </p>
            <p className="text-sm text-muted-foreground">
              Esta garantía es ADICIONAL al derecho de arrepentimiento establecido por el art. 34 de la Ley 24.240 (10 días corridos), no lo reemplaza.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">6. Acceso al contenido</h2>
            <ul className="list-disc list-outside ml-6 space-y-2">
              <li>El acceso a los cursos comprados es <strong>permanente</strong> mientras la Plataforma esté operativa.</li>
              <li>El acceso es <strong>personal e intransferible</strong>. No podés compartir tu cuenta, prestar tu contraseña ni vender el acceso a terceros.</li>
              <li>El contenido (videos, PDFs, ejercicios) está protegido por derechos de autor. Su descarga, copia, redistribución o reventa <strong>está expresamente prohibida</strong>.</li>
              <li>La violación de estas reglas puede resultar en suspensión inmediata de la cuenta sin reembolso, además de las acciones legales que correspondan.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">7. Propiedad intelectual</h2>
            <p>
              Todo el contenido publicado en la Plataforma (cursos, materiales, marca, diseño, código) es propiedad de {tenantName === 'NATO University' ? 'NATO Creative' : tenantName} o de sus respectivos licenciantes. Queda expresamente prohibida cualquier forma de reproducción, distribución o uso comercial sin autorización escrita previa.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">8. Comunidad y foros</h2>
            <p>
              Al participar en los foros y la comunidad de la Plataforma, te comprometés a:
            </p>
            <ul className="list-disc list-outside ml-6 space-y-2">
              <li>Respetar a otros usuarios. Cero tolerancia con discriminación, acoso o lenguaje violento.</li>
              <li>No publicar spam, contenido promocional no autorizado, ni información de terceros sin su consentimiento.</li>
              <li>No publicar contenido protegido por derechos de autor de terceros sin licencia.</li>
            </ul>
            <p>
              Nos reservamos el derecho de eliminar contenido o suspender cuentas que violen estas reglas, a nuestro criterio razonable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">9. Disponibilidad del servicio</h2>
            <p>
              Hacemos esfuerzos razonables para mantener el servicio disponible 24/7. Sin embargo, pueden ocurrir interrupciones por mantenimiento, fallas de proveedores (Supabase, Vercel, Mercado Pago) o causas de fuerza mayor. Si una interrupción supera las 48 horas continuas, podés solicitar reembolso proporcional escribiendo a {supportEmail}.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">10. Limitación de responsabilidad</h2>
            <p>
              La Plataforma se ofrece "tal cual es". No garantizamos que el contenido educativo te genere un resultado específico (ingresos, empleo, transformación personal). Los resultados dependen de tu compromiso, contexto y aplicación. No somos responsables por:
            </p>
            <ul className="list-disc list-outside ml-6 space-y-2">
              <li>Resultados económicos o profesionales que no se materialicen.</li>
              <li>Pérdida de datos por fallas técnicas ajenas a nuestra gestión.</li>
              <li>Daños indirectos o lucro cesante.</li>
            </ul>
            <p>
              Esta limitación NO aplica en casos de dolo o negligencia grave, ni cuando contradiga derechos del consumidor establecidos por la Ley 24.240.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">11. Modificaciones</h2>
            <p>
              Podemos actualizar estos Términos. Si los cambios son sustanciales, te notificamos por email con al menos 30 días de anticipación. Si no estás de acuerdo, podés cancelar tu cuenta y solicitar reembolso proporcional de cursos comprados que aún no hayas consumido.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">12. Datos personales</h2>
            <p>
              El tratamiento de tus datos personales se rige por nuestra <Link to="/privacy" className="text-primary hover:underline">Política de Privacidad</Link>, en cumplimiento de la Ley 25.326.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">13. Ley aplicable y jurisdicción</h2>
            <p>
              Estos Términos se rigen por las leyes de la República Argentina. Para cualquier controversia, las partes se someten a la jurisdicción de los tribunales ordinarios de la ciudad de Mar del Plata, Provincia de Buenos Aires, con expresa renuncia a cualquier otro fuero que pudiera corresponder.
            </p>
          </section>

          <section className="space-y-3 pt-8 border-t border-border/40">
            <h2 className="font-heading text-2xl font-bold text-foreground">Contacto</h2>
            <p>
              Para cualquier consulta sobre estos términos:
            </p>
            <p>
              <a href={`mailto:${supportEmail}`} className="text-primary hover:underline font-semibold">{supportEmail}</a>
            </p>
          </section>

        </article>
      </main>

      <Footer />
    </div>
  )
}
