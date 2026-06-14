import { Helmet } from 'react-helmet-async'
import Navbar from '@/components/landing/Navbar'
import HeroSection from '@/components/landing/HeroSection'
import HowItWorks from '@/components/landing/HowItWorks'
import BentoFeatures from '@/components/landing/BentoFeatures'
import CoursesSection from '@/components/landing/CoursesSection'
import CTASection from '@/components/landing/CTASection'
import Footer from '@/components/landing/Footer'
import { canonicalUrl, absoluteUrl } from '@/lib/seo'
import { useAuth } from '@/context/AuthContext'

export default function Index() {
  const { tenant } = useAuth()
  // Sin escuela en la URL = raíz de plataforma (NATO University).
  // Con escuela = landing de esa escuela (ej. /nata-alvarez).
  const isPlatform = !tenant

  const logoUrl = absoluteUrl('/nato-logo.png')
  const url = canonicalUrl(isPlatform ? '/' : `/${tenant!.slug}`)

  const title = isPlatform
    ? 'NATO University — Creá tu escuela online y vendé tus cursos'
    : `${tenant!.name} — Cursos online`
  const desc = isPlatform
    ? 'Creá tu escuela online, vendé tus cursos y cobrá con Mercado Pago. Sin servidores ni código. NATO University.'
    : `Formación de ${tenant!.name}. Cursos prácticos con certificado verificable.`

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={logoUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={isPlatform ? 'NATO University' : tenant!.name} />
        <meta property="og:locale" content="es_AR" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={desc} />
        <meta name="twitter:image" content={logoUrl} />
      </Helmet>
      <Navbar />
      <HeroSection />
      {isPlatform ? (
        // Raíz de plataforma: vender NATO University a creadores.
        <>
          <HowItWorks />
          <BentoFeatures />
          <CTASection />
        </>
      ) : (
        // Dentro de una escuela: solo sus cursos, sin venta de plataforma.
        <CoursesSection />
      )}
      <Footer />
    </div>
  )
}
