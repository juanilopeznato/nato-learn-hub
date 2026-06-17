import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar,
} from 'recharts'
import {
  Building2, Users, BookOpen, TrendingUp, DollarSign,
  ShieldCheck, Star, Activity, Clapperboard, CheckCircle2,
  Clock, CreditCard, Wifi, WifiOff, Pencil, Check, X,
  ToggleLeft, ToggleRight, Search, Receipt,
} from 'lucide-react'
import { StorageMetrics } from '@/components/StorageMetrics'
import { StorageMigration } from '@/components/StorageMigration'

/* ─── helpers ──────────────────────────────────────────────────────── */
const fmt = (n: number) => `ARS ${Number(n).toLocaleString('es-AR')}`
const fmtK = (n: number) => n >= 1000 ? `ARS ${(n / 1000).toFixed(0)}k` : fmt(n)

// Edición Limitada — control financiero
const FEE_PCT = 0.0189            // MP Checkout 35 días (1,56%) + IVA 21% ≈ 1,89%
const COSTO_PRODUCCION = 4_400_000 // costo de grabación del curso
const SPLIT = { nata: 0.5, juani: 0.4, lula: 0.1 } as const

const PLAN_COLORS: Record<string, string> = {
  gratis: 'bg-muted-foreground text-foreground/85',
  starter: 'bg-primary/20 text-primary',
  creador: 'bg-yellow-900/60 text-yellow-300',
  pro: 'bg-purple-900/60 text-purple-300',
}

/* ─── MetricCard ────────────────────────────────────────────────────── */
function MetricCard({ label, value, sub, icon: Icon, accent = false }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; accent?: boolean
}) {
  return (
    <div className={`rounded-2xl p-5 border ${accent ? 'bg-yellow-400 border-yellow-300' : 'bg-foreground border-foreground/40'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${accent ? 'text-yellow-900/70' : 'text-muted-foreground'}`}>{label}</p>
          <p className={`text-2xl font-bold ${accent ? 'text-yellow-900' : 'text-white'}`}>{value}</p>
          {sub && <p className={`text-xs mt-0.5 ${accent ? 'text-yellow-800/70' : 'text-muted-foreground'}`}>{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-yellow-300/50' : 'bg-foreground/40'}`}>
          <Icon className={`w-5 h-5 ${accent ? 'text-yellow-900' : 'text-muted-foreground/80'}`} />
        </div>
      </div>
    </div>
  )
}

/* ─── CommissionCell ────────────────────────────────────────────────── */
function CommissionCell({ tenantId, value, onSaved }: { tenantId: string; value: number; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(String(value))

  const save = useMutation({
    mutationFn: async () => {
      const pct = parseFloat(input)
      if (isNaN(pct) || pct < 0 || pct > 100) throw new Error('Valor inválido')
      await supabase.rpc('update_tenant_commission', { p_tenant_id: tenantId, p_commission: pct })
    },
    onSuccess: () => { setEditing(false); onSaved(); toast.success('Comisión actualizada') },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!editing) {
    return (
      <button
        className="flex items-center gap-1.5 text-sm text-foreground/85 hover:text-white group"
        onClick={() => { setInput(String(value)); setEditing(true) }}
      >
        <span>{value}%</span>
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        value={input}
        onChange={e => setInput(e.target.value)}
        className="w-16 h-7 text-xs bg-foreground/40 border-foreground/30 text-white"
        onKeyDown={e => { if (e.key === 'Enter') save.mutate(); if (e.key === 'Escape') setEditing(false) }}
      />
      <span className="text-muted-foreground text-xs">%</span>
      <button onClick={() => save.mutate()} aria-label="Guardar cambio" className="text-accent hover:text-accent/80">
        <Check className="w-4 h-4" aria-hidden />
      </button>
      <button onClick={() => setEditing(false)} aria-label="Cancelar edición" className="text-muted-foreground hover:text-foreground/85">
        <X className="w-4 h-4" aria-hidden />
      </button>
    </div>
  )
}

/* ─── Main ──────────────────────────────────────────────────────────── */
export default function NatoOwnerPanel() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  useEffect(() => { document.title = 'NATO Owner Panel' }, [])
  useEffect(() => {
    if (profile && profile.role !== 'nato_owner') navigate('/dashboard')
  }, [profile, navigate])

  const enabled = profile?.role === 'nato_owner'

  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['nato-platform-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_platform_metrics')
      if (error) throw error
      return data as Record<string, number>
    },
    enabled,
  })

  const { data: tenants = [], isLoading: loadingTenants, refetch: refetchTenants } = useQuery({
    queryKey: ['nato-tenants-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tenants_summary')
      if (error) throw error
      return data as {
        tenant_id: string; tenant_name: string; plan_name: string | null
        total_courses: number; total_students: number
        total_revenue_ars: number; nato_revenue_ars: number
        revenue_30d: number; new_students_30d: number
        last_activity: string | null; mp_connected: boolean
        commission_pct: number; plan_expires_at: string | null
        affiliate_code: string | null; tenant_created_at: string; active: boolean
      }[]
    },
    enabled,
  })

  const { data: productionCourses = [], isLoading: loadingProduction } = useQuery({
    queryKey: ['nato-production-courses'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_production_courses_with_forecast')
      if (error) throw error
      return data as {
        course_id: string; course_title: string; tenant_name: string
        recovery_target: number; nato_sales: number; is_recovered: boolean
        sales_last_30d: number; months_to_recovery: number | null
      }[]
    },
    enabled,
  })

  const { data: revenueTrend = [] } = useQuery({
    queryKey: ['nato-revenue-trend'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_platform_revenue_trend')
      if (error) throw error
      return (data as { month: string; total_ars: number; nato_ars: number }[]).map(r => ({
        ...r, total_ars: Number(r.total_ars), nato_ars: Number(r.nato_ars),
      }))
    },
    enabled,
  })

  const { data: subscriptions = [], isLoading: loadingSubscriptions } = useQuery({
    queryKey: ['nato-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_subscription_summary')
      if (error) throw error
      return data as {
        payment_id: string; tenant_name: string; plan_name: string
        amount_ars: number; status: string
        period_start: string | null; period_end: string | null; created_at: string
      }[]
    },
    enabled,
  })

  const { data: elFinance } = useQuery({
    queryKey: ['nato-el-finance'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_course_finance', { p_slug: 'edicion-limitada' })
      if (error) throw error
      return data as {
        course_title: string; recovery_target: number
        nato_sales: number; nato_gross: number
        creator_sales: number; creator_gross: number
      }
    },
    enabled,
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await supabase.rpc('toggle_tenant_active', { p_tenant_id: id, p_active: !active })
    },
    onSuccess: () => { refetchTenants(); toast.success('Estado actualizado') },
    onError: (e: Error) => toast.error(e.message),
  })

  const markRecovered = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.rpc('mark_course_recovered', { p_course_id: courseId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nato-production-courses'] })
      toast.success('Curso marcado como recuperado')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!profile || profile.role !== 'nato_owner') return null

  const filteredTenants = tenants.filter(t =>
    !search || t.tenant_name.toLowerCase().includes(search.toLowerCase())
  )

  // Revenue leaderboard — top 5 schools by revenue
  const leaderboard = [...tenants]
    .sort((a, b) => b.total_revenue_ars - a.total_revenue_ars)
    .slice(0, 5)
    .map(t => ({ name: t.tenant_name.length > 18 ? t.tenant_name.slice(0, 16) + '…' : t.tenant_name, revenue: t.total_revenue_ars }))

  const totalSubscriptionRevenue = subscriptions.filter(s => s.status === 'approved').reduce((s, p) => s + Number(p.amount_ars), 0)
  const pendingSubscriptions = subscriptions.filter(s => s.status === 'pending').length

  // Edición Limitada — finanzas + split
  const elNatoGross = Number(elFinance?.nato_gross ?? 0)
  const elCreatorGross = Number(elFinance?.creator_gross ?? 0)
  const elNetTotal = (elNatoGross + elCreatorGross) * (1 - FEE_PCT)
  const elRecTarget = elFinance?.recovery_target ?? 17
  const elRecDone = elFinance?.nato_sales ?? 0
  const elRecovered = elRecDone >= elRecTarget
  const elProfitNet = elCreatorGross * (1 - FEE_PCT)

  return (
    <div className="min-h-screen bg-foreground/95 text-white">
      {/* Header */}
      <header className="border-b border-foreground/40 bg-foreground sticky top-0 z-40">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-yellow-900" />
            </div>
            <div>
              <p className="text-xs text-yellow-400 font-semibold tracking-widest uppercase">NATO</p>
              <p className="text-sm font-bold text-white leading-none">Owner Panel</p>
            </div>
          </div>
          <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 text-xs">Acceso exclusivo</Badge>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 space-y-8">

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Revenue total" value={loadingMetrics ? '…' : fmtK(metrics?.total_revenue_ars ?? 0)} sub="todos los tiempos" icon={DollarSign} accent />
          <MetricCard label="Revenue NATO" value={loadingMetrics ? '…' : fmtK(metrics?.nato_revenue_ars ?? 0)} sub="recupero + comisiones" icon={Star} />
          <MetricCard label="MRR SaaS" value={loadingMetrics ? '…' : fmtK(metrics?.mrr ?? 0)} sub="suscripciones activas" icon={TrendingUp} />
          <MetricCard label="SaaS total" value={loadingMetrics ? '…' : fmtK(metrics?.subscription_revenue ?? 0)} sub="histórico planes" icon={Receipt} />
          <MetricCard label="Escuelas" value={loadingMetrics ? '…' : (metrics?.total_tenants ?? 0)} sub={`${metrics?.active_tenants ?? 0} activas este mes`} icon={Building2} />
          <MetricCard label="Estudiantes" value={loadingMetrics ? '…' : (metrics?.total_students ?? 0)} sub={`+${metrics?.new_students_30d ?? 0} en 30 días`} icon={Users} />
          <MetricCard label="Inscripciones" value={loadingMetrics ? '…' : (metrics?.total_enrollments ?? 0)} sub={`${metrics?.paid_enrollments ?? 0} pagas`} icon={Activity} />
          <MetricCard label="Comisiones pend." value={loadingMetrics ? '…' : fmtK(metrics?.pending_commissions ?? 0)} sub="afiliados" icon={CreditCard} />
        </div>

        <Tabs defaultValue="revenue">
          <TabsList className="bg-foreground/90 border border-foreground/40 flex-wrap h-auto gap-1 p-1">
            {[
              { value: 'revenue', label: 'Revenue' },
              { value: 'edicion', label: 'Edición Limitada · $' },
              { value: 'escuelas', label: 'Escuelas' },
              { value: 'suscripciones', label: 'Suscripciones' },
              { value: 'produccion', label: 'Producción NATO' },
              { value: 'storage', label: 'Storage' },
            ].map(t => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="data-[state=active]:bg-muted-foreground text-muted-foreground/80 data-[state=active]:text-white text-sm"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Revenue ── */}
          <TabsContent value="revenue" className="mt-6 space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Area chart */}
              <div className="lg:col-span-2 bg-foreground rounded-2xl border border-foreground/40 p-6">
                <h2 className="text-base font-semibold text-white mb-6">Revenue mensual — últimos 12 meses</h2>
                {revenueTrend.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-foreground/70 text-sm">Sin datos aún</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={revenueTrend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="natoGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false}
                        tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: '#f9fafb' }}
                        formatter={(v: number, name: string) => [fmt(v), name === 'total_ars' ? 'Total plataforma' : 'Revenue NATO']}
                      />
                      <Legend formatter={v => v === 'total_ars' ? 'Total plataforma' : 'Revenue NATO'} />
                      <Area type="monotone" dataKey="total_ars" stroke="#fbbf24" strokeWidth={2} fill="url(#totalGrad)" />
                      <Area type="monotone" dataKey="nato_ars" stroke="#a78bfa" strokeWidth={2} fill="url(#natoGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Leaderboard */}
              <div className="bg-foreground rounded-2xl border border-foreground/40 p-6">
                <h2 className="text-base font-semibold text-white mb-4">Top escuelas por revenue</h2>
                {leaderboard.length === 0 ? (
                  <div className="text-center text-foreground/70 text-sm py-8">Sin datos</div>
                ) : (
                  <div className="space-y-3">
                    {leaderboard.map((t, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-foreground/85 font-medium flex items-center gap-1.5">
                            <span className="text-foreground/70">#{i + 1}</span> {t.name}
                          </span>
                          <span className="text-yellow-400 font-semibold">{fmtK(t.revenue)}</span>
                        </div>
                        <div className="h-1.5 bg-foreground/40 rounded-full">
                          <div
                            className="h-full bg-yellow-400/60 rounded-full"
                            style={{ width: leaderboard[0].revenue ? `${(t.revenue / leaderboard[0].revenue) * 100}%` : '0%' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Revenue por escuela — bar chart */}
            {leaderboard.length > 0 && (
              <div className="bg-foreground rounded-2xl border border-foreground/40 p-6">
                <h2 className="text-base font-semibold text-white mb-6">Revenue por escuela</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={leaderboard} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false}
                      tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [fmt(v), 'Revenue total']}
                    />
                    <Bar dataKey="revenue" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          {/* ── Edición Limitada · $ ── */}
          <TabsContent value="edicion" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Ventas pagas" value={elRecDone + (elFinance?.creator_sales ?? 0)} sub={`${elRecDone} recupero · ${elFinance?.creator_sales ?? 0} post-recupero`} icon={Activity} />
              <MetricCard label="Recaudado neto" value={fmtK(elNetTotal)} sub={`bruto ${fmtK(elNatoGross + elCreatorGross)} − ${(FEE_PCT * 100).toFixed(2)}% MP`} icon={DollarSign} accent />
              <MetricCard label="Recupero" value={`${elRecDone}/${elRecTarget}`} sub={elRecovered ? '✅ costo cubierto' : `faltan ${elRecTarget - elRecDone}`} icon={Clapperboard} />
              <MetricCard label="Ganancia repartible" value={fmtK(elProfitNet)} sub={elRecovered ? 'neto post-recupero' : 'empieza tras la venta 17'} icon={TrendingUp} />
            </div>

            {/* Recupero del costo */}
            <div className="bg-foreground rounded-2xl border border-foreground/40 p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white font-semibold">Recupero del costo de grabación</span>
                <span className="text-muted-foreground">{fmt(COSTO_PRODUCCION)}</span>
              </div>
              <div className="h-2.5 bg-foreground/40 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${Math.min(100, Math.round((elRecDone / elRecTarget) * 100))}%` }} />
              </div>
              <p className="text-xs text-foreground/70">
                {elRecovered
                  ? '✅ Recuperado: de acá en más la ganancia se reparte.'
                  : `${elRecDone} de ${elRecTarget} ventas cobradas por NATO Creative. Faltan ${elRecTarget - elRecDone}.`}
              </p>
            </div>

            {/* Split */}
            <div className="bg-foreground rounded-2xl border border-foreground/40 p-6">
              <h2 className="text-base font-semibold text-white mb-1">Reparto de la ganancia</h2>
              <p className="text-xs text-muted-foreground mb-5">
                Sobre el neto de las ventas post-recupero (después del {(FEE_PCT * 100).toFixed(2)}% de MP). Hoy: {fmtK(elProfitNet)}.
              </p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { name: 'Nata', pct: SPLIT.nata, color: 'text-yellow-400' },
                  { name: 'Juani', pct: SPLIT.juani, color: 'text-purple-300' },
                  { name: 'Lula', pct: SPLIT.lula, color: 'text-accent' },
                ].map(s => (
                  <div key={s.name} className="bg-foreground/40 rounded-xl p-4 text-center">
                    <p className="text-xs text-muted-foreground">{s.name}</p>
                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>{fmtK(elProfitNet * s.pct)}</p>
                    <p className="text-xs text-foreground/70 mt-0.5">{(s.pct * 100).toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Flujo de la plata */}
            <div className="bg-foreground rounded-2xl border border-foreground/40 p-5 text-xs text-foreground/70 space-y-1">
              <p className="text-white font-semibold text-sm mb-1">Flujo de la plata</p>
              <p>• Ventas 1–{elRecTarget}: entran al <strong className="text-foreground/90">MP de NATO Creative</strong> (recupero del costo).</p>
              <p>• Ventas {elRecTarget + 1}+: entran al <strong className="text-foreground/90">MP de Nata</strong> y se reparten 50 / 40 / 10.</p>
              <p>• Acreditación de MP: <strong className="text-foreground/90">~35 días</strong> desde cada cobro.</p>
            </div>
          </TabsContent>

          {/* ── Escuelas ── */}
          <TabsContent value="escuelas" className="mt-6">
            <div className="bg-foreground rounded-2xl border border-foreground/40 overflow-hidden">
              <div className="px-6 py-4 border-b border-foreground/40 flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold text-white shrink-0">Todas las escuelas</h2>
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar escuela..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-foreground/40 border-foreground/30 text-white"
                  />
                </div>
              </div>
              {loadingTenants ? (
                <div className="p-8 text-center text-foreground/70 text-sm">Cargando...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-foreground/40">
                        {['Escuela', 'Plan', 'MP', 'Comisión %', 'Cursos', 'Alumnos', '30d alumnos', 'Revenue total', 'Revenue 30d', 'Última actividad', 'Estado', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTenants.map(t => (
                        <tr key={t.tenant_id} className="border-b border-foreground/30 hover:bg-foreground/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <div>
                              <p className="font-medium text-white">{t.tenant_name}</p>
                              <p className="text-xs text-foreground/70">{new Date(t.tenant_created_at).toLocaleDateString('es-AR')}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[t.plan_name ?? 'gratis'] ?? PLAN_COLORS.gratis}`}>
                              {t.plan_name ?? 'gratis'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {t.mp_connected
                              ? <Wifi className="w-4 h-4 text-accent" />
                              : <WifiOff className="w-4 h-4 text-foreground/70" />}
                          </td>
                          <td className="px-4 py-3.5">
                            <CommissionCell
                              tenantId={t.tenant_id}
                              value={t.commission_pct}
                              onSaved={() => refetchTenants()}
                            />
                          </td>
                          <td className="px-4 py-3.5 text-foreground/85">{t.total_courses}</td>
                          <td className="px-4 py-3.5 text-foreground/85">{t.total_students}</td>
                          <td className="px-4 py-3.5">
                            {t.new_students_30d > 0
                              ? <span className="text-accent font-semibold">+{t.new_students_30d}</span>
                              : <span className="text-foreground/70">0</span>}
                          </td>
                          <td className="px-4 py-3.5 text-yellow-400 font-semibold whitespace-nowrap">
                            {t.total_revenue_ars > 0 ? fmtK(t.total_revenue_ars) : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-foreground/85 whitespace-nowrap">
                            {t.revenue_30d > 0 ? fmtK(t.revenue_30d) : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                            {t.last_activity ? new Date(t.last_activity).toLocaleDateString('es-AR') : 'Sin actividad'}
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge variant={t.active ? 'default' : 'secondary'} className="text-xs">
                              {t.active ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => toggleActive.mutate({ id: t.tenant_id, active: t.active })}
                              className="text-muted-foreground hover:text-foreground/85 transition-colors"
                              title={t.active ? 'Desactivar' : 'Activar'}
                            >
                              {t.active
                                ? <ToggleRight className="w-5 h-5 text-accent" />
                                : <ToggleLeft className="w-5 h-5" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Suscripciones ── */}
          <TabsContent value="suscripciones" className="mt-6 space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-foreground rounded-xl border border-foreground/40 p-4">
                <p className="text-xs text-muted-foreground mb-1">Total recaudado</p>
                <p className="text-2xl font-bold text-yellow-400">{fmtK(totalSubscriptionRevenue)}</p>
              </div>
              <div className="bg-foreground rounded-xl border border-foreground/40 p-4">
                <p className="text-xs text-muted-foreground mb-1">Pagos totales</p>
                <p className="text-2xl font-bold text-white">{subscriptions.filter(s => s.status === 'approved').length}</p>
              </div>
              <div className="bg-foreground rounded-xl border border-foreground/40 p-4">
                <p className="text-xs text-muted-foreground mb-1">Pendientes</p>
                <p className={`text-2xl font-bold ${pendingSubscriptions > 0 ? 'text-yellow-400' : 'text-foreground/70'}`}>
                  {pendingSubscriptions}
                </p>
              </div>
            </div>

            <div className="bg-foreground rounded-2xl border border-foreground/40 overflow-hidden">
              <div className="px-6 py-4 border-b border-foreground/40">
                <h2 className="text-base font-semibold text-white">Historial de suscripciones</h2>
              </div>
              {loadingSubscriptions ? (
                <div className="p-8 text-center text-foreground/70 text-sm">Cargando...</div>
              ) : subscriptions.length === 0 ? (
                <div className="p-12 text-center">
                  <Receipt className="w-8 h-8 text-foreground/85 mx-auto mb-3" />
                  <p className="text-foreground/70 text-sm">Sin pagos de suscripción aún</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-foreground/40">
                        {['Escuela', 'Plan', 'Monto ARS', 'Estado', 'Período', 'Fecha'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.map(p => (
                        <tr key={p.payment_id} className="border-b border-foreground/30 hover:bg-foreground/30 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-white">{p.tenant_name}</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[p.plan_name ?? 'gratis'] ?? PLAN_COLORS.gratis}`}>
                              {p.plan_name}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-yellow-400 font-semibold">{fmt(Number(p.amount_ars))}</td>
                          <td className="px-5 py-3.5">
                            <Badge
                              variant={p.status === 'approved' ? 'default' : p.status === 'pending' ? 'secondary' : 'destructive'}
                              className="text-xs"
                            >
                              {p.status === 'approved' ? 'Pagado' : p.status === 'pending' ? 'Pendiente' : 'Fallido'}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground/80 text-xs">
                            {p.period_start && p.period_end
                              ? `${new Date(p.period_start).toLocaleDateString('es-AR')} → ${new Date(p.period_end).toLocaleDateString('es-AR')}`
                              : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground text-xs">
                            {new Date(p.created_at).toLocaleDateString('es-AR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Producción NATO ── */}
          <TabsContent value="produccion" className="mt-6 space-y-4">
            {loadingProduction ? (
              <div className="bg-foreground rounded-2xl border border-foreground/40 p-8 text-center text-foreground/70 text-sm">Cargando...</div>
            ) : productionCourses.length === 0 ? (
              <div className="bg-foreground rounded-2xl border border-foreground/40 p-12 text-center space-y-3">
                <Clapperboard className="w-10 h-10 text-foreground/85 mx-auto" />
                <p className="text-muted-foreground text-sm">No hay cursos marcados como producidos por NATO.</p>
                <p className="text-foreground/70 text-xs">Activá "Producido por NATO Creative" al editar un curso.</p>
              </div>
            ) : (
              <>
                {/* Summary strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-foreground rounded-xl border border-foreground/40 p-4">
                    <p className="text-xs text-muted-foreground mb-1">Cursos producidos</p>
                    <p className="text-2xl font-bold text-white">{productionCourses.length}</p>
                  </div>
                  <div className="bg-foreground rounded-xl border border-foreground/40 p-4">
                    <p className="text-xs text-muted-foreground mb-1">En recupero</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {productionCourses.filter(c => !c.is_recovered).length}
                    </p>
                  </div>
                  <div className="bg-foreground rounded-xl border border-foreground/40 p-4">
                    <p className="text-xs text-muted-foreground mb-1">Sin ventas este mes</p>
                    <p className="text-xl font-bold text-destructive">
                      {productionCourses.filter(c => !c.is_recovered && c.sales_last_30d === 0).length}
                    </p>
                  </div>
                  <div className="bg-foreground rounded-xl border border-foreground/40 p-4">
                    <p className="text-xs text-muted-foreground mb-1">Ventas este mes</p>
                    <p className="text-xl font-bold text-accent">
                      {productionCourses.reduce((s, c) => s + (c.sales_last_30d ?? 0), 0)}
                    </p>
                  </div>
                </div>

                {/* Course cards */}
                <div className="space-y-3">
                  {productionCourses.map(c => {
                    const pct = Math.min(100, Math.round((c.nato_sales / c.recovery_target) * 100))
                    return (
                      <div key={c.course_id} className="bg-foreground rounded-2xl border border-foreground/40 p-5">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div>
                            <p className="font-semibold text-white">{c.course_title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{c.tenant_name}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {c.is_recovered ? (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 px-2.5 py-1 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Recuperado
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full">
                                <Clock className="w-3.5 h-3.5" /> En recupero
                              </span>
                            )}
                            {!c.is_recovered && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-muted-foreground hover:text-white h-7 px-2"
                                onClick={() => markRecovered.mutate(c.course_id)}
                              >
                                Marcar recuperado
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5 mb-4">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{c.nato_sales} ventas cobradas por NATO</span>
                            <span>Meta: {c.recovery_target}</span>
                          </div>
                          <div className="h-2 bg-foreground/40 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${c.is_recovered ? 'bg-accent' : 'bg-yellow-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-foreground/70">
                            {c.is_recovered
                              ? `✅ Recuperado — todas las ventas van al creador`
                              : `Faltan ${c.recovery_target - c.nato_sales} ventas para completar el recupero`}
                          </p>
                        </div>

                        {/* Forecast */}
                        {!c.is_recovered && (
                          <div className={`rounded-lg px-3 py-2 mb-4 text-xs ${
                            c.months_to_recovery === null
                              ? 'bg-destructive/20 text-destructive'
                              : c.months_to_recovery <= 2
                              ? 'bg-accent/20 text-accent'
                              : 'bg-yellow-900/20 text-yellow-400'
                          }`}>
                            {c.sales_last_30d === 0 || c.months_to_recovery === null
                              ? `⚠️ Sin ventas este mes — sin ritmo actual no hay fecha de recupero`
                              : c.months_to_recovery <= 1
                              ? `🚀 A este ritmo (${c.sales_last_30d} ventas/mes) se recupera este mes`
                              : `📅 A este ritmo (${c.sales_last_30d} ventas/mes) se recupera en ~${c.months_to_recovery} meses`}
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-foreground/40">
                          <div>
                            <p className="text-xs text-muted-foreground">Ventas NATO</p>
                            <p className="text-sm font-semibold text-yellow-400 mt-0.5">{c.nato_sales}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Últ. 30 días</p>
                            <p className="text-sm font-semibold text-white mt-0.5">{c.sales_last_30d}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Progreso</p>
                            <p className="text-sm font-semibold mt-0.5 text-foreground/85">{pct}%</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Storage ── */}
          <TabsContent value="storage" className="mt-6 space-y-6">
            <StorageMetrics />
            <StorageMigration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
