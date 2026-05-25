import { Link, useLocation } from "react-router-dom"
import { useEffect } from "react"
import { Helmet } from "react-helmet-async"
import { Home, BookOpen, Compass, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { logger } from "@/lib/logger"

const SUGGESTIONS = [
  { to: "/", label: "Inicio", icon: Home, desc: "Volver a la página principal" },
  { to: "/courses", label: "Cursos", icon: BookOpen, desc: "Ver todos los cursos disponibles" },
  { to: "/pricing", label: "Planes", icon: Compass, desc: "Conocer planes y precios" },
]

const NotFound = () => {
  const location = useLocation()
  const { tenant, user } = useAuth()

  useEffect(() => {
    logger.warn(`404: ${location.pathname}`, { from: document.referrer || 'direct' })
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Helmet>
        <title>Página no encontrada — {tenant?.name ?? "NATO University"}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
        <div>
          <div className="text-6xl font-heading font-bold text-primary/20 mb-2" aria-hidden>404</div>
          <h1 className="font-heading text-2xl font-semibold text-gray-900">Esta página no existe</h1>
          <p className="text-sm text-gray-500 mt-2">
            El link puede estar mal o el contenido ya no está disponible.
            {location.pathname && (
              <span className="block mt-1 font-mono text-xs text-gray-400 truncate">{location.pathname}</span>
            )}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Probá yendo a</p>
          <ul className="space-y-1">
            {SUGGESTIONS.map(s => (
              <li key={s.to}>
                <Link
                  to={s.to}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <s.icon className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{s.label}</p>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                </Link>
              </li>
            ))}
            {user && (
              <li>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <Home className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Mi dashboard</p>
                    <p className="text-xs text-gray-500">Volver a tus cursos</p>
                  </div>
                </Link>
              </li>
            )}
          </ul>
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <Button asChild variant="hero" className="flex-1">
            <Link to="/">Ir al inicio</Link>
          </Button>
          <Button asChild variant="outline" size="icon" title="Reportar problema">
            <a href="mailto:hola@natoglobal.com.ar?subject=404 en NATO University" aria-label="Reportar problema">
              <Mail className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default NotFound
