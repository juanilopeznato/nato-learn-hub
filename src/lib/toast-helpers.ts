/**
 * Helpers de Sonner para patrones comunes:
 *  - toastError(): mensaje + botón "Reintentar" cuando aplica
 *  - toastSuccess(): mensaje neutro
 *
 * Centraliza el patrón "mutation falla → toast con retry" para que las
 * pages no repitan el boilerplate y para que retrocedamos rápido si
 * queremos cambiar el look.
 */
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

type Retryable = () => void | Promise<void>

interface ErrorOptions {
  /** Mostrar botón "Reintentar". Se llama al hacer click. */
  retry?: Retryable
  /** Contexto extra para el logger */
  context?: Record<string, unknown>
}

export function toastError(message: string, error?: unknown, opts: ErrorOptions = {}): void {
  logger.error(message, error, opts.context)
  const description = error instanceof Error ? error.message : (typeof error === 'string' ? error : undefined)
  toast.error(message, {
    description,
    action: opts.retry
      ? { label: 'Reintentar', onClick: () => { void opts.retry?.() } }
      : undefined,
  })
}

export function toastSuccess(message: string, description?: string): void {
  toast.success(message, description ? { description } : undefined)
}

/**
 * Wrapper para mutations que muestra toast con retry si falla.
 * Útil cuando llamás mutate.mutateAsync() en un handler.
 */
export async function withRetryToast<T>(
  fn: () => Promise<T>,
  failMessage: string,
): Promise<T | null> {
  try {
    return await fn()
  } catch (e) {
    toastError(failMessage, e, { retry: () => withRetryToast(fn, failMessage) })
    return null
  }
}
