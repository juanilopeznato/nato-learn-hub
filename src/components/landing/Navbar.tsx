import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, profile, tenant } = useAuth()

  const tenantName = tenant?.name ?? 'NATO University'
  const logoUrl = tenant?.logo_url

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img
            src={logoUrl ?? '/nato-logo.png'}
            alt={tenantName}
            className="h-8 w-auto object-contain"
          />
          {!logoUrl && (
            <span className="font-heading text-lg font-bold text-gray-900">
              {tenantName}
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#courses" className="text-sm text-gray-600 hover:text-primary transition-colors">
            Cursos
          </a>
          <Link to="/courses" className="text-sm text-gray-600 hover:text-primary transition-colors">
            Ver todos
          </Link>
          <Link to="/pricing" className="text-sm text-gray-600 hover:text-primary transition-colors">
            Precios
          </Link>
          {user && (
            <>
              <Link to="/dashboard" className="text-sm text-gray-600 hover:text-primary transition-colors">
                Mi aprendizaje
              </Link>
              <Link to="/community" className="text-sm text-gray-600 hover:text-primary transition-colors">
                Comunidad
              </Link>
            </>
          )}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Button variant="hero" size="sm" asChild>
              <Link to={['instructor', 'admin', 'nato_owner'].includes(profile?.role ?? '') ? '/instructor' : '/dashboard'}>
                Mi panel
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Iniciar Sesión</Link>
              </Button>
              <Button variant="hero" size="sm" asChild>
                <Link to="/signup">Comenzar gratis</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-gray-700"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          <a href="#courses" className="block text-sm text-gray-600 hover:text-primary" onClick={() => setMobileOpen(false)}>
            Cursos
          </a>
          <Link to="/courses" className="block text-sm text-gray-600 hover:text-primary" onClick={() => setMobileOpen(false)}>
            Ver todos
          </Link>
          <Link to="/pricing" className="block text-sm text-gray-600 hover:text-primary" onClick={() => setMobileOpen(false)}>
            Precios
          </Link>
          {user && (
            <Link to="/dashboard" className="block text-sm text-gray-600 hover:text-primary" onClick={() => setMobileOpen(false)}>
              Mi aprendizaje
            </Link>
          )}
          <div className="flex gap-2 pt-2">
            {user ? (
              <Button variant="hero" size="sm" className="flex-1" asChild>
                <Link to={['instructor', 'admin', 'nato_owner'].includes(profile?.role ?? '') ? '/instructor' : '/dashboard'}>Mi panel</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="flex-1" asChild>
                  <Link to="/login">Iniciar Sesión</Link>
                </Button>
                <Button variant="hero" size="sm" className="flex-1" asChild>
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
