import React from 'react'

interface State {
  error: Error | null
}

interface Props {
  children: React.ReactNode
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info)

    // Plausible (analítica de uso)
    try {
      const w = window as unknown as { plausible?: (e: string, opts?: { props?: Record<string, string> }) => void }
      w.plausible?.('error_boundary_triggered', { props: { message: error.message } })
    } catch {
      /* no-op */
    }

    // Sentry (si está cargado vía script en index.html o como dep futura).
    // No agregamos @sentry/react como dep — solo enganchamos si existe.
    try {
      const w = window as unknown as { Sentry?: { captureException?: (e: Error, ctx?: unknown) => void } }
      w.Sentry?.captureException?.(error, { extra: { componentStack: info.componentStack } })
    } catch {
      /* no-op */
    }
  }

  reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border/60 p-8 shadow-sm">
          <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4" aria-hidden>
            <span className="text-2xl">⚠</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Algo salió mal</h1>
          <p className="text-sm text-foreground/70 mb-6">
            La página tuvo un error inesperado. Probá recargar o volver al inicio.
          </p>
          <details className="mb-6 text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none hover:text-foreground/85">Ver detalle técnico</summary>
            <pre className="mt-2 p-3 bg-secondary/30 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
          </details>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { this.reset(); window.location.reload() }}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              Recargar
            </button>
            <a
              href="/"
              className="flex-1 px-4 py-2 bg-secondary text-foreground/85 rounded-lg hover:bg-border transition-colors text-sm font-medium text-center"
            >
              Ir al inicio
            </a>
          </div>
        </div>
      </div>
    )
  }
}
