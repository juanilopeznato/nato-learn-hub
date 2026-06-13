import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { hexToHsl, relativeLuminance } from '@/lib/color'

/**
 * Inyecta la paleta de la escuela activa (tenants.primary_color / accent_color)
 * en las CSS variables, en runtime, sin tocar el resto del sistema de diseño.
 *
 * - Convierte el hex de marca a HSL (el formato de los tokens) y deriva las
 *   variantes: ring, sidebar, los tints primary-50/100/200 y el foreground por
 *   contraste real (blanco vs. tinta).
 * - Es dark-aware: cuando el <html> tiene `.dark`, sube el lightness del primary
 *   ~+10 para igualar el patrón del CSS, y re-aplica al togglear tema.
 * - Si el tenant no define colores, no hace nada (quedan los defaults del CSS).
 *
 * Las CSS vars inline en <html> ganan sobre las reglas :root / .dark, por eso
 * recalculamos en cada cambio de clase en lugar de setear un valor fijo.
 */
function setVar(name: string, value: string) {
  document.documentElement.style.setProperty(name, value)
}

function applyTenantPalette(primaryHex: string | null, accentHex: string | null) {
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
        setVar('--primary-50', `${p.h} 60% 18%`)
        setVar('--primary-100', `${p.h} 70% 22%`)
        setVar('--primary-200', `${p.h} 75% 30%`)
      } else {
        setVar('--primary-50', `${p.h} 100% 97%`)
        setVar('--primary-100', `${p.h} 95% 93%`)
        setVar('--primary-200', `${p.h} 90% 86%`)
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
  const primary = tenant?.primary_color ?? null
  const accent = tenant?.accent_color ?? null

  useEffect(() => {
    if (!primary && !accent) return
    applyTenantPalette(primary, accent)
    // El toggle de tema agrega/quita `.dark` en <html>: recalculamos ahí.
    const obs = new MutationObserver(() => applyTenantPalette(primary, accent))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [primary, accent])

  return null
}
