/**
 * Helpers para renderizar texto de usuario de forma segura.
 *
 * `autoLinkText`: divide texto en partes (texto plano + URLs detectadas).
 *   Devuelve array para mapear en JSX → <a> safe + texto.
 * `escapeHtml`: por si tenemos que servir como HTML.
 *
 * No usa DOMPurify ni dangerouslySetInnerHTML — todo render via React.
 */

const URL_REGEX = /\b((?:https?:\/\/|www\.)[^\s<>"'`]+)/gi
// Mention de @user (lo dejamos como texto plano por ahora, no linkeamos)
// Email
const EMAIL_REGEX = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi

type Segment =
  | { type: 'text'; value: string }
  | { type: 'url'; value: string; href: string }
  | { type: 'email'; value: string; href: string }

/**
 * Trim trailing punctuation comunes (. , ! ?) que se suelen comer en links.
 */
function cleanUrl(raw: string): string {
  return raw.replace(/[.,!?:;)\]]+$/g, '')
}

function normalizeHref(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://${url}`
}

/**
 * Parsea texto y devuelve segmentos (texto + URLs + emails).
 */
export function parseText(text: string): Segment[] {
  if (!text) return []

  const segments: Segment[] = []
  // Mejor: matchear todo en un pass con regex combinado
  const combined = /\b((?:https?:\/\/|www\.)[^\s<>"'`]+)|\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi
  let lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = combined.exec(text)) !== null) {
    const start = m.index
    if (start > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, start) })
    }
    if (m[1]) {
      const cleaned = cleanUrl(m[1])
      const trailing = m[1].slice(cleaned.length)
      segments.push({ type: 'url', value: cleaned, href: normalizeHref(cleaned) })
      if (trailing) segments.push({ type: 'text', value: trailing })
    } else if (m[2]) {
      segments.push({ type: 'email', value: m[2], href: `mailto:${m[2]}` })
    }
    lastIndex = combined.lastIndex
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return segments
}

/** Por si necesitamos escapar HTML en algún lado (ej: server-side render manual) */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Re-exports para tests
export const __testing__ = { URL_REGEX, EMAIL_REGEX, cleanUrl, normalizeHref }
