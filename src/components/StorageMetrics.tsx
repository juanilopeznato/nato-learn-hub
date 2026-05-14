/**
 * Tab "Storage" para NatoOwnerPanel.
 *
 * Muestra peso por bucket + top archivos más pesados, con alarma visual si
 * algún bucket supera 1 GB (Free de Supabase = 1 GB total).
 *
 * Requiere `docs/storage-metrics.sql` aplicado una vez en el dashboard
 * (funciones SECURITY DEFINER que validan rol nato_owner).
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { HardDrive, AlertTriangle, Image as ImageIcon, FileText } from 'lucide-react'

interface BucketUsage {
  bucket_id: string
  files: number
  total_bytes: number
  largest_mb: number
}

interface TopFile {
  name: string
  size_kb: number
  created_at: string
}

const FREE_TIER_LIMIT = 1 * 1024 * 1024 * 1024 // 1 GB
const PRO_TIER_LIMIT = 100 * 1024 * 1024 * 1024 // 100 GB

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function StorageMetrics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['nato-storage-usage'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_storage_usage' as never) as { data: BucketUsage[] | null; error: { message: string } | null }
      if (error) throw error
      return (data ?? []) as BucketUsage[]
    },
    staleTime: 5 * 60_000, // 5min
  })

  if (error) {
    return (
      <div className="rounded-2xl border border-yellow-900/60 bg-yellow-950/40 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-yellow-200 font-medium">Funciones SQL no aplicadas</h3>
            <p className="text-yellow-100/80 text-sm mt-1">
              Aplicá <code className="text-xs bg-yellow-900/50 px-1.5 py-0.5 rounded">docs/storage-metrics.sql</code> en
              Supabase Dashboard → SQL Editor (una sola vez). Después recargá esta página.
            </p>
            <p className="text-yellow-100/60 text-xs mt-2">{String(error.message ?? error)}</p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <div className="text-gray-400 text-sm">Cargando uso de storage…</div>
  }

  const buckets = data ?? []
  const totalBytes = buckets.reduce((s, b) => s + Number(b.total_bytes ?? 0), 0)
  const totalFiles = buckets.reduce((s, b) => s + Number(b.files ?? 0), 0)
  const pctFree = (totalBytes / FREE_TIER_LIMIT) * 100
  const pctPro = (totalBytes / PRO_TIER_LIMIT) * 100

  const alarm = pctFree > 70

  return (
    <div className="space-y-6">
      {/* Totales */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className={`rounded-2xl border p-5 ${alarm ? 'bg-red-950/40 border-red-900/60' : 'bg-gray-900 border-gray-800'}`}>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <HardDrive className="w-4 h-4" />
            Total storage
          </div>
          <div className={`mt-2 text-2xl font-semibold ${alarm ? 'text-red-200' : 'text-white'}`}>{fmtBytes(totalBytes)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {pctFree.toFixed(1)}% del Free tier · {pctPro.toFixed(2)}% del Pro
          </div>
          <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${pctFree > 90 ? 'bg-red-500' : pctFree > 70 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(pctFree, 100)}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <ImageIcon className="w-4 h-4" />
            Archivos
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">{totalFiles.toLocaleString('es-AR')}</div>
          <div className="text-xs text-gray-500 mt-1">en {buckets.length} bucket{buckets.length === 1 ? '' : 's'}</div>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <FileText className="w-4 h-4" />
            Promedio / archivo
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {totalFiles ? fmtBytes(totalBytes / totalFiles) : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Target post-pipeline: &lt; 200 KB
          </div>
        </div>
      </div>

      {alarm && (
        <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-red-200 font-medium">Storage al {pctFree.toFixed(0)}% del Free tier</p>
            <p className="text-red-100/80 mt-1">
              Considerá migrar imágenes legacy con el script de optimización o subir el plan a Pro.
            </p>
          </div>
        </div>
      )}

      {/* Por bucket */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-white font-medium">Por bucket</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-950 text-gray-400">
            <tr>
              <th className="text-left px-5 py-2 font-medium">Bucket</th>
              <th className="text-right px-5 py-2 font-medium">Archivos</th>
              <th className="text-right px-5 py-2 font-medium">Total</th>
              <th className="text-right px-5 py-2 font-medium">Promedio</th>
              <th className="text-right px-5 py-2 font-medium">Más grande</th>
            </tr>
          </thead>
          <tbody>
            {buckets.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-6 text-center text-gray-500">Sin buckets con datos</td></tr>
            ) : buckets.map(b => {
              const avg = b.files > 0 ? Number(b.total_bytes) / Number(b.files) : 0
              return (
                <tr key={b.bucket_id} className="border-t border-gray-800/60">
                  <td className="px-5 py-3 text-white">{b.bucket_id}</td>
                  <td className="px-5 py-3 text-right text-gray-300">{Number(b.files).toLocaleString('es-AR')}</td>
                  <td className="px-5 py-3 text-right text-gray-300">{fmtBytes(Number(b.total_bytes))}</td>
                  <td className="px-5 py-3 text-right text-gray-400">{fmtBytes(avg)}</td>
                  <td className={`px-5 py-3 text-right ${Number(b.largest_mb) > 1 ? 'text-yellow-300' : 'text-gray-400'}`}>
                    {Number(b.largest_mb).toFixed(2)} MB
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <TopFilesByBucket buckets={buckets.map(b => b.bucket_id)} />
    </div>
  )
}

function TopFilesByBucket({ buckets }: { buckets: string[] }) {
  if (buckets.length === 0) return null
  return (
    <div className="space-y-4">
      <h3 className="text-white font-medium">Top archivos más pesados</h3>
      {buckets.map(b => <TopFilesTable key={b} bucket={b} />)}
    </div>
  )
}

function TopFilesTable({ bucket }: { bucket: string }) {
  const { data } = useQuery({
    queryKey: ['nato-storage-top', bucket],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_storage_top_files' as never, { p_bucket: bucket, p_limit: 10 } as never) as { data: TopFile[] | null; error: { message: string } | null }
      if (error) throw error
      return (data ?? []) as TopFile[]
    },
    staleTime: 5 * 60_000,
  })

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      <div className="px-5 py-2 border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
        {bucket}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {(data ?? []).map((f, i) => (
            <tr key={f.name} className={i % 2 ? 'bg-gray-950/50' : ''}>
              <td className="px-5 py-2 text-gray-300 truncate max-w-[400px]">{f.name}</td>
              <td className={`px-5 py-2 text-right ${f.size_kb > 500 ? 'text-yellow-300' : 'text-gray-400'}`}>
                {f.size_kb > 1024 ? `${(f.size_kb / 1024).toFixed(1)} MB` : `${Math.round(f.size_kb)} KB`}
              </td>
              <td className="px-5 py-2 text-right text-gray-500 text-xs">
                {new Date(f.created_at).toLocaleDateString('es-AR')}
              </td>
            </tr>
          ))}
          {(!data || data.length === 0) && (
            <tr><td className="px-5 py-3 text-center text-gray-500" colSpan={3}>Sin archivos</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
