/**
 * Botón flotante "Reportar problema" — discreto, abajo a la derecha.
 *
 * Si Sentry Feedback widget está cargado (configurando feedbackIntegration en
 * el init), abre el widget oficial. Si no, fallback a mailto:.
 *
 * Solo aparece en pages logueadas (Dashboard, LessonView, etc) para no
 * distraer en landings.
 */
import { useState } from 'react'
import { MessageSquare, X, Mail } from 'lucide-react'

interface SentryFeedbackWindow {
  Sentry?: {
    getFeedback?: () => { createWidget?: () => unknown; openDialog?: () => unknown } | undefined
    captureFeedback?: (data: { message: string; email?: string; name?: string }) => void
  }
}

interface Props {
  /** Texto del botón. Default "Reportar problema" */
  label?: string
  /** Email de fallback si Sentry no está cargado */
  fallbackEmail?: string
  /** Posición. Default 'bottom-right' */
  position?: 'bottom-right' | 'bottom-left'
  className?: string
}

export function FeedbackButton({
  label = 'Reportar problema',
  fallbackEmail = 'hola@natoglobal.com.ar',
  position = 'bottom-right',
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  function openSentryWidget() {
    const w = window as unknown as SentryFeedbackWindow
    const feedback = w.Sentry?.getFeedback?.()
    if (feedback?.openDialog) {
      feedback.openDialog()
      return true
    }
    return false
  }

  function handleClick() {
    // Preferir el widget oficial de Sentry si está
    if (openSentryWidget()) return
    // Fallback: mini-formulario propio o mailto
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    // Si Sentry tiene captureFeedback API, lo usamos
    const w = window as unknown as SentryFeedbackWindow
    if (w.Sentry?.captureFeedback) {
      w.Sentry.captureFeedback({ message })
      setSent(true)
      setTimeout(() => { setOpen(false); setSent(false); setMessage('') }, 1500)
      return
    }
    // Fallback: abrir mailto:
    const subject = encodeURIComponent('Feedback NATO University')
    const body = encodeURIComponent(`${message}\n\n---\nURL: ${window.location.href}\nUA: ${navigator.userAgent}`)
    window.location.href = `mailto:${fallbackEmail}?subject=${subject}&body=${body}`
    setSent(true)
    setTimeout(() => { setOpen(false); setSent(false); setMessage('') }, 1500)
  }

  const posClass = position === 'bottom-left' ? 'bottom-4 left-4' : 'bottom-4 right-4'

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`fixed ${posClass} z-40 flex items-center gap-2 px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-full shadow-lg hover:bg-gray-800 transition-all opacity-70 hover:opacity-100 no-print ${className ?? ''}`}
        aria-label={label}
      >
        <MessageSquare className="w-3.5 h-3.5" aria-hidden />
        <span className="hidden sm:inline">{label}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[55] bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading font-semibold text-foreground">{label}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Contanos qué pasó. Sumamos contexto técnico automáticamente.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="text-muted-foreground/80 hover:text-foreground/85">
                <X className="w-4 h-4" />
              </button>
            </div>

            {sent ? (
              <div className="text-center py-6 text-sm text-green-600">¡Gracias! Lo vamos a revisar.</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Describí qué pasó (o qué te gustaría que mejoremos)"
                  rows={4}
                  className="w-full text-sm border border-border/60 rounded-lg p-3 focus:border-primary focus:outline-none resize-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!message.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90"
                >
                  <Mail className="w-3.5 h-3.5" /> Enviar
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
