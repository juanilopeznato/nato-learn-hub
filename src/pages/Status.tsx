/**
 * Status page público pre-launch. Verifica:
 *  - Frontend cargó (siempre ok si lo estás viendo)
 *  - Supabase responde (ping a una tabla pública)
 *  - Storage CDN responde
 *
 * URL: /status — no requiere login. Para monitoring externo (UptimeRobot etc).
 */
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { canonicalUrl } from '@/lib/seo'

type Check = 'pending' | 'ok' | 'fail'

interface SystemCheck {
  name: string
  status: Check
  latencyMs?: number
  message?: string
}

async function pingSupabase(): Promise<SystemCheck> {
  const start = performance.now()
  try {
    const { error } = await supabase.from('tenants').select('id', { count: 'exact', head: true }).limit(1)
    const latency = Math.round(performance.now() - start)
    if (error) return { name: 'Supabase', status: 'fail', latencyMs: latency, message: error.message }
    return { name: 'Supabase', status: 'ok', latencyMs: latency }
  } catch (e) {
    return { name: 'Supabase', status: 'fail', message: e instanceof Error ? e.message : 'error' }
  }
}

async function pingStorage(): Promise<SystemCheck> {
  const start = performance.now()
  try {
    const url = import.meta.env.VITE_SUPABASE_URL
    if (!url) return { name: 'Storage CDN', status: 'fail', message: 'VITE_SUPABASE_URL ausente' }
    const res = await fetch(`${url}/storage/v1/object/public/avatars/_ping?cache=${Date.now()}`, { method: 'HEAD' })
    const latency = Math.round(performance.now() - start)
    // 200, 404 = bucket existe; >=500 = problema
    if (res.status >= 500) return { name: 'Storage CDN', status: 'fail', latencyMs: latency, message: `HTTP ${res.status}` }
    return { name: 'Storage CDN', status: 'ok', latencyMs: latency }
  } catch (e) {
    return { name: 'Storage CDN', status: 'fail', message: e instanceof Error ? e.message : 'error' }
  }
}

export default function Status() {
  const [checks, setChecks] = useState<SystemCheck[]>([
    { name: 'Frontend', status: 'ok' },
    { name: 'Supabase', status: 'pending' },
    { name: 'Storage CDN', status: 'pending' },
  ])

  useEffect(() => {
    void Promise.all([pingSupabase(), pingStorage()]).then(([db, storage]) => {
      setChecks([{ name: 'Frontend', status: 'ok', latencyMs: 0 }, db, storage])
    })
  }, [])

  const allOk = checks.every(c => c.status === 'ok')
  const anyFail = checks.some(c => c.status === 'fail')

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-6">
      <Helmet>
        <title>Status — NATO University</title>
        <meta name="robots" content="noindex" />
        <link rel="canonical" href={canonicalUrl('/status')} />
      </Helmet>
      <div className="max-w-md w-full bg-white rounded-2xl border border-border/60 p-8 space-y-5">
        <div className="flex items-center gap-3">
          {anyFail ? (
            <AlertTriangle className="w-7 h-7 text-red-500" aria-hidden />
          ) : allOk ? (
            <CheckCircle2 className="w-7 h-7 text-green-500" aria-hidden />
          ) : (
            <Loader2 className="w-7 h-7 text-muted-foreground/80 animate-spin" aria-hidden />
          )}
          <div>
            <h1 className="font-heading text-xl font-semibold text-foreground">
              {anyFail ? 'Hay problemas' : allOk ? 'Todo funcionando' : 'Verificando…'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {anyFail ? 'Algunos servicios no responden' : 'Estado de los servicios de NATO University'}
            </p>
          </div>
        </div>

        <ul className="divide-y divide-gray-100 border-t border-border/40">
          {checks.map(c => (
            <li key={c.name} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {c.status === 'ok' && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" aria-hidden />}
                {c.status === 'fail' && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" aria-hidden />}
                {c.status === 'pending' && <Loader2 className="w-4 h-4 text-muted-foreground/80 animate-spin shrink-0" aria-hidden />}
                <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {c.latencyMs !== undefined && (
                  <span className={`text-xs ${c.latencyMs > 1000 ? 'text-yellow-500' : 'text-muted-foreground/80'}`}>
                    {c.latencyMs} ms
                  </span>
                )}
                <span className={`text-xs font-medium uppercase ${
                  c.status === 'ok' ? 'text-green-600' : c.status === 'fail' ? 'text-red-600' : 'text-muted-foreground/80'
                }`}>
                  {c.status === 'pending' ? '…' : c.status}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {checks.find(c => c.status === 'fail')?.message && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            {checks.find(c => c.status === 'fail')!.message}
          </div>
        )}

        <p className="text-xs text-muted-foreground/80 pt-2 border-t border-border/40">
          Última verificación: {new Date().toLocaleString('es-AR')}
        </p>
      </div>
    </div>
  )
}
