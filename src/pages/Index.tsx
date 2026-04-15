import { Helmet } from 'react-helmet-async'
import Navbar from '@/components/landing/Navbar'
import HeroSection from '@/components/landing/HeroSection'
import HowItWorks from '@/components/landing/HowItWorks'
import CoursesSection from '@/components/landing/CoursesSection'
import CTASection from '@/components/landing/CTASection'
import Footer from '@/components/landing/Footer'

export default function Index() {
  return (
    <div className="min-h-screen">
      <Helmet>
        <title>NATO University — Cursos de marketing digital y negocios</title>
        <meta name="description" content="Aprendé marketing digital, creación de contenido y negocios online con NATO University. Cursos prácticos, certificados verificables y comunidad activa." />
        <link rel="canonical" href="https://nato-learn-hub.vercel.app/" />
        <meta property="og:title" content="NATO University — Cursos de marketing digital y negocios" />
        <meta property="og:description" content="Aprendé marketing digital, creación de contenido y negocios online. Cursos prácticos y certificados verificables." />
        <meta property="og:url" content="https://nato-learn-hub.vercel.app/" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'EducationalOrganization',
          name: 'NATO University',
          url: 'https://nato-learn-hub.vercel.app',
          logo: 'https://nato-learn-hub.vercel.app/nato-logo.png',
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
