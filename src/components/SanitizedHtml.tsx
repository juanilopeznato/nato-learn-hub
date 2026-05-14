/**
 * Renderiza HTML sanitizado con DOMPurify cargado en lazy.
 *
 * Mientras carga la lib (típicamente <100ms) muestra el HTML como texto plano
 * dentro de un placeholder. Una vez carga, sanitiza y renderiza.
 *
 * Esto saca DOMPurify del bundle eager y lo carga solo cuando hay HTML
 * para mostrar.
 */
import { useEffect, useState } from 'react'

let dompurifyPromise: Promise<typeof import('dompurify').default> | null = null
function loadDompurify() {
  dompurifyPromise ??= import('dompurify').then(m => m.default)
  return dompurifyPromise
}

interface Props {
  html: string
  className?: string
}

export function SanitizedHtml({ html, className }: Props) {
  const [sanitized, setSanitized] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadDompurify().then(DOMPurify => {
      if (!cancelled) setSanitized(DOMPurify.sanitize(html))
    })
    return () => { cancelled = true }
  }, [html])

  if (sanitized === null) {
    return <div className={className}><span className="text-gray-400 text-sm">Cargando vista previa…</span></div>
  }
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />
}
