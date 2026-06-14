import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { hexToHsl, relativeLuminance } from '@/lib/color'

/**
 * Inyecta la identidad de la escuela activa (colores + tipografía) en las CSS
 * variables, en runtime. La escuela la decide la URL (ver AuthContext):
 *   - `/` (plataforma, sin escuela)  → limpia todo → defaults de NATO (Nunito/púrpura).
 *   - `/:escuela`                    → pinta la paleta y las fuentes de esa escuela.
 *
 * Las CSS vars inline en <html> ganan sobre :root/.dark; por eso recalculamos
 * en cada cambio de tema (dark) y LIMPIAMOS al salir a la plataforma.
 */
function setVar(name: string, value: string) {
  document.documentElement.style.setProperty(name, value)
}

const COLOR_VARS = [
  '--primary', '--ring', '--sidebar-primary', '--sidebar-ring', '--primary-foreground',
  '--primary-50', '--primary-100', '--primary-200', '--accent', '--accent-foreground',
]
const FONT_VARS = ['--font-heading', '--font-sans']

function clearTenant() {
  for (const v of [...COLOR_VARS, ...FONT_VARS]) document.documentElement.style.removeProperty(v)
}

function applyColors(primaryHex: string | null, accentHex: string | null) {
  const isDark = document.documentElement.classList.contains('dark')
  if (primaryHex) {
    const p = hexToHsl(primaryHex)
    if (p) {
      const l = isDark ? Math.min(p.l + 10, 72) : p.l
      setVar('--primary', `${p.h} ${p.s}% ${l}%`)
      setVar('--ring', `${p.h} ${p.s}% ${l}%`)
      setVar('--sidebar-primary', `${p.h} ${p.s}% ${p.l}%`)
      setVar('--sidebar-ring', `${p.h} ${p.s}% ${l}%`)
      setVar('--primary-foreground', relativeLuminance(primaryHex) > 0.5 ? '222 15% 13%' : '0 0% 100%')
      if (isDark) {
        setVar('--primary-50', `${p.h} 60% 18%`); setVar('--primary-100', `${p.h} 70% 22%`); setVar('--primary-200', `${p.h} 75% 30%`)
      } else {
        setVar('--primary-50', `${p.h} 100% 97%`); setVar('--primary-100', `${p.h} 95% 93%`); setVar('--primary-200', `${p.h} 90% 86%`)
      }
    }
  }
  if (accentHex) {
    const a = hexToHsl(accentHex)
    if (a) {
      const l = isDark ? Math.min(a.l + 8, 70) : a.l
      setVar('--accent', `${a.h} ${a.s}% ${l}%`)
      setVar('--accent-foreground', relativeLuminance(accentHex) > 0.5 ? '222 47% 6%' : '0 0% 100%')
    }
  }
}

export function TenantTheme() {
  const { tenant } = useAuth()
  const t = tenant as (typeof tenant & { font_heading?: string | null; font_body?: string | null }) | null
  const primary = t?.primary_color ?? null
  const accent = t?.accent_color ?? null
  const fontHeading = t?.font_heading ?? null
  const fontBody = t?.font_body ?? null

  useEffect(() => {
    // Sin escuela (plataforma) → limpiar overrides → defaults NATO del CSS.
    if (!tenant) { clearTenant(); return }

    // Fuentes (no dependen de dark)
    if (fontHeading) setVar('--font-heading', fontHeading)
    if (fontBody) setVar('--font-sans', fontBody)

    // Colores (dark-aware: recalcular al togglear tema)
    applyColors(primary, accent)
    const obs = new MutationObserver(() => applyColors(primary, accent))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id, primary, accent, fontHeading, fontBody])

  return null
}
