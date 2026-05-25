import { Link, useLocation } from "react-router-dom"
import { useEffect, useMemo } from "react"
import { Helmet } from "react-helmet-async"
import { Home, BookOpen, Compass, Mail, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { logger } from "@/lib/logger"

/** Distancia Levenshtein simple para sugerir slugs cercanos. */
function distance(a: string, b: string): number {
  if (!a.length) return b.length
  if (!b.length) return a.length
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[a.length][b.length]
}

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

  // Si el path parece /courses/<slug> o /<slug> con guión-medio, intentar sugerir
  const candidateSlug = useMemo(() => {
    const m = location.pathname.match(/\/(?:courses\/)?([a-z0-9-]+)\/?$/i)
    return m?.[1] ?? null
  }, [location.pathname])

  const { data: suggestion } = useQuery({
    queryKey: ['404-suggest', candidateSlug, tenant?.id],
    enabled: !!candidateSlug && candidateSlug.length > 2 && !!tenant?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('slug, title')
        .eq('tenant_id', tenant!.id)
        .eq('is_published', true)
      if (!data || data.length === 0) return null
      const slug = candidateSlug!.toLowerCase()
      let best: { slug: string; title: string; d: number } | null = null
      for (const c of data as { slug: string; title: string }[]) {
        if (!c.slug) continue
        const d = distance(slug, c.slug.toLowerCase())
        if (!best || d < best.d) best = { ...c, d }
      }
      // Solo sugerir si la distancia es razonable (< 40% del largo)
      if (best && best.d <= Math.max(2, Math.floor(slug.length * 0.4))) return best
      return null
    },
  })

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-6">
      <Helmet>
        <title>Página no encontrada — {tenant?.name ?? "NATO University"}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="max-w-md w-full bg-card rounded-2xl border border-border/60 p-8 space-y-6">
        <div>
          <div className="text-6xl font-heading font-bold text-primary/20 mb-2" aria-hidden>404</div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Esta página no existe</h1>
          <p className="text-sm text-muted-foreground mt-2">
            El link puede estar mal o el contenido ya no está disponible.
            {location.pathname && (
              <span className="block mt-1 font-mono text-xs text-muted-foreground/80 truncate">{location.pathname}</span>
            )}
          </p>
        </div>

        {suggestion && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                ¿Quisiste decir <Link to={`/courses/${suggestion.slug}`} className="text-primary underline underline-offset-2 hover:opacity-80">{suggestion.title}</Link>?
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">/courses/{suggestion.slug}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">Probá yendo a</p>
          <ul className="space-y-1">
            {SUGGESTIONS.map(s => (
              <li key={s.to}>
                <Link
                  to={s.to}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/30 transition-colors group"
                >
                  <s.icon className="w-4 h-4 text-muted-foreground/80 group-hover:text-primary transition-colors" aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </Link>
              </li>
            ))}
            {user && (
              <li>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/30 transition-colors group"
                >
                  <Home className="w-4 h-4 text-muted-foreground/80 group-hover:text-primary transition-colors" aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Mi dashboard</p>
                    <p className="text-xs text-muted-foreground">Volver a tus cursos</p>
                  </div>
                </Link>
              </li>
            )}
          </ul>
        </div>

        <div className="flex gap-2 pt-2 border-t border-border/40">
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
