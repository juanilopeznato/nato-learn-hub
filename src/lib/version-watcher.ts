/**
 * Detector de nuevo deploy sin Service Worker.
 *
 * Cada `intervalMs` hace HEAD a `/index.html` y compara el hash del bundle
 * principal embebido. Si cambió, dispara `onNewVersion`.
 *
 * Más simple que un SW + funciona en cualquier hosting estático.
 * Llamar `startVersionWatcher()` una vez desde main.tsx.
 */
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

const DEFAULT_INTERVAL = 5 * 60_000 // 5 min
let currentHash: string | null = null
let started = false

function extractBundleHash(html: string): string | null {
  // Vite emite `<script type="module" src="/assets/index-XXXXX.js">` en index.html
  const match = html.match(/\/assets\/index-([A-Za-z0-9_-]+)\.js/)
  return match?.[1] ?? null
}

async function fetchCurrentHash(): Promise<string | null> {
  try {
    const res = await fetch(`/?v=${Date.now()}`, { method: 'GET', cache: 'no-store' })
    if (!res.ok) return null
    const html = await res.text()
    return extractBundleHash(html)
  } catch (e) {
    logger.debug('version-watcher fetch failed', e)
    return null
  }
}

export async function startVersionWatcher(intervalMs = DEFAULT_INTERVAL): Promise<void> {
  if (started) return
  if (typeof window === 'undefined') return
  // Solo en prod
  if (import.meta.env.DEV) return
  started = true

  // Hash inicial = el que cargó esta sesión
  currentHash = await fetchCurrentHash()
  if (!currentHash) return

  const check = async () => {
    if (document.visibilityState !== 'visible') return
    const latest = await fetchCurrentHash()
    if (!latest || latest === currentHash) return
    logger.info(`Nueva versión detectada: ${currentHash} → ${latest}`)
    toast.message('Hay una versión nueva', {
      description: 'Recargá para usar la última versión de la app.',
      duration: Infinity,
      action: {
        label: 'Recargar',
        onClick: () => window.location.reload(),
      },
    })
    // Después de avisar, no volvemos a chequear (la sesión está marcada como stale)
    currentHash = latest
  }

  // Chequear al volver al tab + cada N minutos
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check()
  })
  setInterval(() => void check(), intervalMs)
}
