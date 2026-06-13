/**
 * Utilidades de color para el theming per-tenant.
 *
 * Los tokens del sistema viven como triples HSL sin coma (`258 91% 55%`) porque
 * se consumen con `hsl(var(--token))` en Tailwind. Estas funciones convierten el
 * hex que guarda `tenants.primary_color` a ese formato y calculan contraste.
 */

/** Normaliza un hex (#RGB o #RRGGBB) a 6 dígitos en minúscula, o null si es inválido. */
function normalizeHex(hex: string): string | null {
  if (!hex) return null
  let c = hex.trim().replace(/^#/, '')
  if (c.length === 3) c = c.split('').map(ch => ch + ch).join('')
  return /^[0-9a-fA-F]{6}$/.test(c) ? c.toLowerCase() : null
}

/** #RRGGBB → { h, s, l } en grados / % / % (el formato de los tokens). */
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const c = normalizeHex(hex)
  if (!c) return null
  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      default:  h = (r - g) / d + 4
    }
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/** Luminancia relativa (WCAG) — para elegir foreground blanco vs. tinta oscura. */
export function relativeLuminance(hex: string): number {
  const c = normalizeHex(hex)
  if (!c) return 0
  const toLin = (v: number) => {
    const x = v / 255
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  }
  const r = toLin(parseInt(c.slice(0, 2), 16))
  const g = toLin(parseInt(c.slice(2, 4), 16))
  const b = toLin(parseInt(c.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
