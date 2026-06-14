import { Link } from 'react-router-dom'
import { Instagram, Linkedin, Mail, ArrowUpRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

/**
 * Footer rediseñado con jerarquía visual clara, hover states refinados y CTA
 * de newsletter sutil. Linear-style: poca decoración, mucho espacio.
 * Tenant-aware: dentro de una escuela muestra SU marca; en la raíz, NATO.
 */
const Footer = () => {
  const year = new Date().getFullYear()
  const { tenant } = useAuth()
  const brandName = tenant?.name ?? 'NATO University'
  const brandTagline = tenant
    ? (tenant.tagline ?? `Formación de ${tenant.name}.`)
    : 'La plataforma para crear tu escuela online y vender tus cursos. Cobrás en pesos con Mercado Pago.'
  return (
    <footer className="border-t border-border/60 bg-card/50">
      <div className="container py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand block */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src={tenant?.logo_url ?? '/nato-logo.png'}
                alt={brandName}
                className="h-7 w-auto object-contain"
                loading="lazy"
                decoding="async"
              />
              <span className="font-heading text-base font-semibold text-foreground tracking-tight">
                {tenant ? brandName : <>NATO <span className="text-primary">University</span></>}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              {brandTagline}
            </p>
            <div className="flex items-center gap-1 mt-5">
              {[
                { Icon: Instagram, href: 'https://instagram.com/nato.global', label: 'Instagram' },
                { Icon: Linkedin, href: 'https://linkedin.com/company/nato-global', label: 'LinkedIn' },
                { Icon: Mail, href: 'mailto:hola@natoglobal.com', label: 'Email' },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <Icon className="w-4 h-4" aria-hidden />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Plataforma</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { to: '/courses', label: 'Catálogo' },
                { to: '/pricing', label: 'Planes' },
                { to: '/community', label: 'Comunidad' },
                { to: '/dashboard', label: 'Mi panel' },
              ].map(item => (
                <li key={item.label}>
                  <Link to={item.to} className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 group">
                    {item.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Empresa</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: 'https://natoglobal.com', label: 'Sobre NATO', external: true },
                { href: 'mailto:hola@natoglobal.com', label: 'Contacto' },
                { to: '/status', label: 'Estado del sistema' },
              ].map(item => (
                <li key={item.label}>
                  {'to' in item ? (
                    <Link to={item.to!} className="text-muted-foreground hover:text-foreground transition-colors">
                      {item.label}
                    </Link>
                  ) : (
                    <a
                      href={item.href}
                      target={item.external ? '_blank' : undefined}
                      rel={item.external ? 'noopener noreferrer' : undefined}
                      className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 group"
                    >
                      {item.label}
                      {item.external && (
                        <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" aria-hidden />
                      )}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Legal</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacidad</Link></li>
              <li><Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Términos</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {year} NATO University. Todos los derechos reservados.</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" aria-hidden />
            Todos los sistemas operativos
          </span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
