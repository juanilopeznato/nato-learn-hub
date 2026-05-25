/**
 * Carga Sentry desde el CDN solo si VITE_SENTRY_DSN está seteado.
 *
 * No agregamos @sentry/react como dep porque pesa ~100KB y la mayoría de los
 * deploys de development no necesitan tracking. El loader inyecta el script
 * en el `<head>` y luego inicializa Sentry — el logger y ErrorBoundary
 * ya están preparados para usarlo si existe.
 */

interface SentryGlobal {
  init: (opts: Record<string, unknown>) => void
  captureException: (err: unknown, ctx?: unknown) => void
  captureMessage: (msg: string, level?: string) => void
}

const SDK_URL = 'https://browser.sentry-cdn.com/8.55.0/bundle.tracing.replay.min.js'
const SDK_INTEGRITY: string | undefined = undefined // Si lo agregás, va como `integrity` attribute

export function loadSentryIfConfigured(): void {
  if (typeof window === 'undefined') return
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return
  if ((window as unknown as { Sentry?: unknown }).Sentry) return

  const script = document.createElement('script')
  script.src = SDK_URL
  script.crossOrigin = 'anonymous'
  script.async = true
  if (SDK_INTEGRITY) script.integrity = SDK_INTEGRITY
  script.onload = () => {
    const Sentry = (window as unknown as { Sentry?: SentryGlobal }).Sentry
    if (!Sentry || !Sentry.init) return
    try {
      Sentry.init({
        dsn,
        environment: import.meta.env.MODE || 'production',
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1.0,
        beforeSend(event: { message?: string; exception?: { values?: { value?: string }[] } }) {
          const msg =
            event.message ||
            event.exception?.values?.[0]?.value ||
            ''
          // Filtrar errores de extensiones de browser
          if (/chrome-extension:|moz-extension:|safari-extension:/.test(msg)) return null
          // Filtrar errores conocidos de ResizeObserver (no son bugs reales)
          if (/ResizeObserver loop/.test(msg)) return null
          return event
        },
      })
    } catch (e) {
      console.warn('[sentry] init failed:', e)
    }
  }
  document.head.appendChild(script)
}
