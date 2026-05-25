/**
 * Helpers de SEO centralizados.
 *
 * Configurable via env. Si el dominio final cambia (ej: natouniversity.com.ar),
 * actualizar VITE_PUBLIC_URL en Lovable y todos los Helmet quedan al día.
 */

const FALLBACK_PUBLIC_URL = 'https://natouniversity.lovable.app'

export function getPublicUrl(): string {
  const env = import.meta.env.VITE_PUBLIC_URL
  if (env) return env.replace(/\/+$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  return FALLBACK_PUBLIC_URL
}

/** Absolutiza una URL relativa contra el origin público */
export function absoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = getPublicUrl()
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

/** URL canónica del path actual */
export function canonicalUrl(path: string): string {
  const base = getPublicUrl()
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}
