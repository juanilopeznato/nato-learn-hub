import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import { useAuth } from '@/context/AuthContext'
import { canonicalUrl } from '@/lib/seo'

/**
 * Política de Privacidad — adaptada a Ley 25.326 (Protección de Datos
 * Personales, Argentina). Cubre tratamiento de datos por NATO University
 * y todos los tenants de la plataforma.
 */
export default function PrivacyPolicy() {
  const { tenant } = useAuth()
  const tenantName = tenant?.name ?? 'NATO University'
  const supportEmail = (tenant && 'support_email' in tenant ? (tenant as { support_email?: string | null }).support_email : null) ?? 'hola@natoglobal.com'

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Política de Privacidad — {tenantName}</title>
        <meta name="description" content={`Política de Privacidad de ${tenantName}. Cómo recolectamos, usamos y protegemos tus datos personales.`} />
        <link rel="canonical" href={canonicalUrl('/privacy')} />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <Navbar />

      <main className="container max-w-3xl py-24 lg:py-32">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Volver al inicio
        </Link>

        <header className="mb-12 pb-8 border-b border-border/40">
          <h1 className="font-heading text-display-lg text-foreground tracking-tight">Política de Privacidad</h1>
          <p className="text-sm text-muted-foreground mt-3">
            Última actualización: 8 de junio de 2026 · Vigencia inmediata
          </p>
        </header>

        <article className="prose prose-lesson max-w-none space-y-8 text-foreground/85 leading-relaxed">

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">1. Responsable del tratamiento</h2>
            <p>
              Esta plataforma {tenantName === 'NATO University' ? 'es operada por NATO Creative' : `aloja el contenido de ${tenantName}, operado bajo la infraestructura de NATO Creative`}, con domicilio en Mar del Plata, Provincia de Buenos Aires, Argentina. El responsable del tratamiento de tus datos personales es la entidad legal que corresponde a {tenantName === 'NATO University' ? 'NATO Creative' : tenantName} según el caso.
            </p>
            <p>
              Para consultas o ejercicio de derechos: <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">2. Datos que recolectamos</h2>
            <p>Recolectamos únicamente los datos necesarios para prestar el servicio:</p>
            <ul className="list-disc list-outside ml-6 space-y-2">
              <li><strong>Datos de cuenta:</strong> nombre completo, email, contraseña encriptada (nunca legible en texto plano).</li>
              <li><strong>Datos de uso:</strong> cursos en los que te inscribiste, lecciones completadas, progreso, notas personales, comentarios en foros.</li>
              <li><strong>Datos de pago:</strong> procesados directamente por Mercado Pago. NO almacenamos números de tarjeta. Solo guardamos el ID de la transacción y el estado (aprobado/rechazado).</li>
              <li><strong>Datos técnicos:</strong> IP, navegador, dispositivo, páginas visitadas. Usados para seguridad, prevención de fraude y mejora del producto.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">3. Finalidad del tratamiento</h2>
            <ul className="list-disc list-outside ml-6 space-y-2">
              <li>Prestar el servicio de educación online: dar acceso a los cursos, registrar tu progreso, emitir certificados.</li>
              <li>Procesar pagos a través de Mercado Pago.</li>
              <li>Enviarte comunicaciones operativas (confirmación de compra, recordatorios de progreso) y, opcionalmente, novedades educativas.</li>
              <li>Cumplir obligaciones legales y fiscales en Argentina.</li>
              <li>Mejorar el producto a partir del análisis agregado y anónimo del uso.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">4. Proveedores con los que compartimos datos</h2>
            <p>
              Para operar la plataforma usamos servicios de terceros que cumplen con estándares internacionales de protección de datos:
            </p>
            <ul className="list-disc list-outside ml-6 space-y-2">
              <li><strong>Supabase</strong> (almacenamiento de cuentas, contenido y progreso)</li>
              <li><strong>Mercado Pago</strong> (procesamiento de pagos)</li>
              <li><strong>Resend</strong> (envío de emails transaccionales)</li>
              <li><strong>Vercel</strong> (hosting de la aplicación web)</li>
              <li><strong>Plausible</strong> (analytics agregado y anónimo, sin cookies de tracking)</li>
              <li><strong>YouTube/Vimeo</strong> (alojamiento de los videos de las clases)</li>
            </ul>
            <p>Ninguno de estos proveedores accede a tus datos para fines distintos a los necesarios para operar el servicio.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">5. Tus derechos (Ley 25.326)</h2>
            <p>Como titular de los datos personales, tenés derecho a:</p>
            <ul className="list-disc list-outside ml-6 space-y-2">
              <li><strong>Acceder</strong> a tus datos almacenados.</li>
              <li><strong>Rectificar</strong> datos inexactos o desactualizados.</li>
              <li><strong>Suprimir</strong> tus datos cuando ya no sean necesarios o retires tu consentimiento.</li>
              <li><strong>Oponerte</strong> al tratamiento en los casos previstos por la ley.</li>
              <li><strong>Portabilidad:</strong> recibir tus datos en formato estructurado para llevarlos a otro servicio.</li>
            </ul>
            <p>
              Para ejercer cualquiera de estos derechos, escribinos a <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a>. Te respondemos en un plazo máximo de 10 días hábiles.
            </p>
            <p className="text-sm text-muted-foreground italic">
              La Agencia de Acceso a la Información Pública es el órgano de control de la Ley 25.326. Tenés la facultad de presentar denuncia ante ese organismo si entendés que se violan tus derechos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">6. Conservación de datos</h2>
            <p>
              Conservamos tus datos mientras tu cuenta esté activa. Si cancelás tu cuenta, eliminamos tus datos personales en un plazo máximo de 90 días, excepto aquellos que debamos conservar por obligación legal o fiscal (mínimo 10 años para facturación, según RG AFIP).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">7. Cookies</h2>
            <p>
              Usamos cookies estrictamente necesarias para mantener tu sesión iniciada y recordar tus preferencias (tema claro/oscuro, idioma). No usamos cookies publicitarias ni de seguimiento de terceros. Plausible, nuestra herramienta de analytics, NO usa cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">8. Seguridad</h2>
            <p>
              Aplicamos medidas técnicas y organizativas razonables para proteger tus datos: encriptación en tránsito (HTTPS/TLS 1.3), encriptación en reposo, autenticación segura con contraseñas hasheadas (bcrypt), Row-Level Security en la base de datos, monitoreo de accesos sospechosos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">9. Menores de edad</h2>
            <p>
              El servicio no está dirigido a menores de 18 años. Si detectamos que un menor se registró sin autorización parental, eliminamos su cuenta y los datos asociados.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">10. Cambios en esta política</h2>
            <p>
              Si modificamos esta política, te notificamos por email con al menos 30 días de anticipación antes de que entren en vigencia los cambios. Si no estás de acuerdo, podés cancelar tu cuenta antes de que las nuevas condiciones se apliquen.
            </p>
          </section>

          <section className="space-y-3 pt-8 border-t border-border/40">
            <h2 className="font-heading text-2xl font-bold text-foreground">Contacto</h2>
            <p>
              Para cualquier consulta sobre esta política o el tratamiento de tus datos:
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
