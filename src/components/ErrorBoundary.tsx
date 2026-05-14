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
    // Si hay analytics global, mandamos un evento — silencioso si no existe
    try {
      const w = window as unknown as { plausible?: (e: string, opts?: { props?: Record<string, string> }) => void }
      w.plausible?.('error_boundary_triggered', { props: { message: error.message } })
    } catch {
      /* no-op */
    }
  }

  reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4" aria-hidden>
            <span className="text-2xl">⚠</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Algo salió mal</h1>
          <p className="text-sm text-gray-600 mb-6">
            La página tuvo un error inesperado. Probá recargar o volver al inicio.
          </p>
          <details className="mb-6 text-xs text-gray-500">
            <summary className="cursor-pointer select-none hover:text-gray-700">Ver detalle técnico</summary>
            <pre className="mt-2 p-3 bg-gray-50 rounded-lg overflow-x-auto whitespace-pre-wrap">
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
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium text-center"
            >
              Ir al inicio
            </a>
          </div>
        </div>
      </div>
    )
  }
}
