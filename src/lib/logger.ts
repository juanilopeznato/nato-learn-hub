/**
 * Logger central. Reemplaza console.log/error directos en código de producción
 * para tener un punto único donde activar/desactivar y donde enchufar Sentry,
 * Plausible u otros.
 *
 * Convención:
 *  - logger.debug → solo dev
 *  - logger.info  → siempre
 *  - logger.warn  → siempre + analytics si está cargado
 *  - logger.error → siempre + Sentry.captureException si está cargado
 */

interface SentryWindow {
  Sentry?: {
    captureException?: (err: unknown, ctx?: unknown) => void
    captureMessage?: (msg: string, level?: 'info' | 'warning' | 'error') => void
  }
}

interface PlausibleWindow {
  plausible?: (event: string, opts?: { props?: Record<string, string | number | boolean> }) => void
}

const IS_DEV = import.meta.env.DEV

function getSentry() {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as SentryWindow).Sentry
}

function getPlausible() {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as PlausibleWindow).plausible
}

export const logger = {
  debug(...args: unknown[]) {
    if (IS_DEV) console.debug('[debug]', ...args)
  },

  info(...args: unknown[]) {
    console.info('[info]', ...args)
  },

  warn(message: string, context?: Record<string, unknown>) {
    console.warn('[warn]', message, context)
    try {
      getSentry()?.captureMessage?.(message, 'warning')
      getPlausible()?.('warn', { props: { message } })
    } catch { /* no-op */ }
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    console.error('[error]', message, error, context)
    try {
      const err = error instanceof Error ? error : new Error(message)
      getSentry()?.captureException?.(err, { extra: { message, ...context } })
      getPlausible()?.('error', { props: { message: err.message.slice(0, 200) } })
    } catch { /* no-op */ }
  },

  /** Tracking explícito de eventos de producto (analytics) */
  track(event: string, props?: Record<string, string | number | boolean>) {
    try {
      getPlausible()?.(event, props ? { props } : undefined)
    } catch { /* no-op */ }
  },
}
