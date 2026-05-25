import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'

/**
 * Navbar rediseñado: glass-light header con border sutil al scrollear.
 * Tipografía más liviana, espacios generosos, hover states refinados.
 */
export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, profile, tenant } = useAuth()

  const tenantName = tenant?.name ?? 'NATO University'
  const logoUrl = tenant?.logo_url

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const dashHref = ['instructor', 'admin', 'nato_owner'].includes(profile?.role ?? '') ? '/instructor' : '/dashboard'

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 ease-apple ${
        scrolled ? 'glass-light shadow-xs' : 'bg-transparent'
      }`}
    >
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src={logoUrl ?? '/nato-logo.png'}
            alt={tenantName}
            className="h-7 w-auto object-contain transition-transform duration-200 ease-apple group-hover:scale-105"
            loading="eager"
            decoding="async"
          />
          {!logoUrl && (
            <span className="font-heading text-base font-semibold text-foreground tracking-tight">
              {tenantName}
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { href: '#courses', label: 'Cursos' },
            { to: '/courses', label: 'Catálogo' },
            { to: '/pricing', label: 'Planes' },
            ...(user ? [
              { to: '/dashboard', label: 'Mi aprendizaje' },
              { to: '/community', label: 'Comunidad' },
            ] : []),
          ].map((item) => (
            'href' in item ? (
              <a key={item.label} href={item.href} className="px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
                {item.label}
              </a>
            ) : (
              <Link key={item.label} to={item.to} className="px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
                {item.label}
              </Link>
            )
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <Button variant="hero" size="sm" asChild>
              <Link to={dashHref}>Mi panel</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Ingresar</Link>
              </Button>
              <Button variant="hero" size="sm" asChild>
                <Link to="/signup">Comenzar gratis</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-md text-foreground hover:bg-secondary/60 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass-light border-t border-border/40 px-6 py-4 space-y-1 animate-fade-in">
          {[
            { href: '#courses', label: 'Cursos' },
            { to: '/courses', label: 'Catálogo' },
            { to: '/pricing', label: 'Planes' },
            ...(user ? [{ to: '/dashboard', label: 'Mi aprendizaje' }] : []),
          ].map((item) => (
            'href' in item ? (
              <a key={item.label} href={item.href} className="block px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60" onClick={() => setMobileOpen(false)}>
                {item.label}
              </a>
            ) : (
              <Link key={item.label} to={item.to} className="block px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60" onClick={() => setMobileOpen(false)}>
                {item.label}
              </Link>
            )
          ))}
          <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-border/40">
            {user ? (
              <Button variant="hero" asChild>
                <Link to={dashHref}>Mi panel</Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link to="/login">Ingresar</Link>
                </Button>
                <Button variant="hero" asChild>
                  <Link to="/signup">Comenzar gratis</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
