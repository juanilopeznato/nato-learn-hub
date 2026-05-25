import { Helmet } from 'react-helmet-async'
import Navbar from '@/components/landing/Navbar'
import HeroSection from '@/components/landing/HeroSection'
import HowItWorks from '@/components/landing/HowItWorks'
import CoursesSection from '@/components/landing/CoursesSection'
import CTASection from '@/components/landing/CTASection'
import Footer from '@/components/landing/Footer'
import { canonicalUrl, absoluteUrl } from '@/lib/seo'

export default function Index() {
  const url = canonicalUrl('/')
  const logoUrl = absoluteUrl('/nato-logo.png')
  const title = 'NATO University — Cursos de marketing digital y negocios'
  const desc = 'Aprendé marketing digital, creación de contenido y negocios online con NATO University. Cursos prácticos, certificados verificables y comunidad activa.'
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
        <meta property="og:site_name" content="NATO University" />
        <meta property="og:locale" content="es_AR" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={desc} />
        <meta name="twitter:image" content={logoUrl} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'EducationalOrganization',
          name: 'NATO University',
          url,
          logo: logoUrl,
          description: 'Plataforma de cursos online de marketing digital, negocios y creación de contenido.',
          sameAs: [],
        })}</script>
      </Helmet>
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <CoursesSection />
      <CTASection />
      <Footer />
    </div>
  )
}
