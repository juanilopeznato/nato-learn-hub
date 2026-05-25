/**
 * Sistema de tema: light / dark / system.
 *
 * - Persiste en localStorage (`nato_theme`)
 * - Aplica clase `.dark` al <html>
 * - Respeta prefers-color-scheme si está en 'system'
 * - El cambio entre claros/oscuros es instantáneo (sin flicker) gracias a un
 *   script inline en index.html (ver setupThemeEarly)
 */
export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'nato_theme'

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === 'light' || v === 'dark' || v === 'system') return v
  return 'system'
}

export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, theme) } catch { /* */ }
  applyTheme(theme)
}

/** Resuelve 'system' al valor concreto */
export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  const resolved = resolveTheme(theme)
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
    root.style.colorScheme = 'dark'
  } else {
    root.classList.remove('dark')
    root.style.colorScheme = 'light'
  }
}

/**
 * Llamar en index.html con un script inline para evitar flicker.
 * (También se puede llamar desde main.tsx para coincidir con la primera render.)
 */
export function initTheme(): void {
  if (typeof window === 'undefined') return
  applyTheme(getStoredTheme())
  // Escuchar cambios del system cuando el tema es 'system'
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', () => {
      if (getStoredTheme() === 'system') applyTheme('system')
    })
  } catch { /* */ }
}
