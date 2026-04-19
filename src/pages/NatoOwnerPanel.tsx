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

/* ─── helpers ──────────────────────────────────────────────────────── */
const fmt = (n: number) => `ARS ${Number(n).toLocaleString('es-AR')}`
const fmtK = (n: number) => n >= 1000 ? `ARS ${(n / 1000).toFixed(0)}k` : fmt(n)

const PLAN_COLORS: Record<string, string> = {
  gratis: 'bg-gray-700 text-gray-300',
  starter: 'bg-blue-900/60 text-blue-300',
  creador: 'bg-yellow-900/60 text-yellow-300',
  pro: 'bg-purple-900/60 text-purple-300',
}

/* ─── MetricCard ────────────────────────────────────────────────────── */
function MetricCard({ label, value, sub, icon: Icon, accent = false }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; accent?: boolean
}) {
  return (
    <div className={`rounded-2xl p-5 border ${accent ? 'bg-yellow-400 border-yellow-300' : 'bg-gray-900 border-gray-800'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${accent ? 'text-yellow-900/70' : 'text-gray-500'}`}>{label}</p>
          <p className={`text-2xl font-bold ${accent ? 'text-yellow-900' : 'text-gray-100'}`}>{value}</p>
          {sub && <p className={`text-xs mt-0.5 ${accent ? 'text-yellow-800/70' : 'text-gray-500'}`}>{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-yellow-300/50' : 'bg-gray-800'}`}>
          <Icon className={`w-5 h-5 ${accent ? 'text-yellow-900' : 'text-gray-400'}`} />
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
        className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white group"
        onClick={() => { setInput(String(value)); setEditing(true) }}
      >
        <span>{value}%</span>
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-500 transition-opacity" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        value={input}
        onChange={e => setInput(e.target.value)}
        className="w-16 h-7 text-xs bg-gray-800 border-gray-600 text-white"
        onKeyDown={e => { if (e.key === 'Enter') save.mutate(); if (e.key === 'Escape') setEditing(false) }}
      />
      <span className="text-gray-500 text-xs">%</span>
      <button onClick={() => save.mutate()} className="text-green-400 hover:text-green-300">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={() => setEditing(false)} className="text-gray-500 hover:text-gray-300">
        <X className="w-4 h-4" />
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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900 sticky top-0 z-40">
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
          <TabsList className="bg-gray-800 border border-gray-700 flex-wrap h-auto gap-1 p-1">
            {[
              { value: 'revenue', label: 'Revenue' },
              { value: 'escuelas', label: 'Escuelas' },
              { value: 'suscripciones', label: 'Suscripciones' },
              { value: 'produccion', label: 'Producción NATO' },
            ].map(t => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="data-[state=active]:bg-gray-700 text-gray-400 data-[state=active]:text-white text-sm"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Revenue ── */}
          <TabsContent value="revenue" className="mt-6 space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Area chart */}
              <div className="lg:col-span-2 bg-gray-900 rounded-2xl border border-gray-800 p-6">
                <h2 className="text-base font-semibold text-white mb-6">Revenue mensual — últimos 12 meses</h2>
                {revenueTrend.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-gray-600 text-sm">Sin datos aún</div>
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
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                <h2 className="text-base font-semibold text-white mb-4">Top escuelas por revenue</h2>
                {leaderboard.length === 0 ? (
                  <div className="text-center text-gray-600 text-sm py-8">Sin datos</div>
                ) : (
                  <div className="space-y-3">
                    {leaderboard.map((t, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-300 font-medium flex items-center gap-1.5">
                            <span className="text-gray-600">#{i + 1}</span> {t.name}
                          </span>
                          <span className="text-yellow-400 font-semibold">{fmtK(t.revenue)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full">
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
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
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

          {/* ── Escuelas ── */}
          <TabsContent value="escuelas" className="mt-6">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold text-white shrink-0">Todas las escuelas</h2>
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <Input
                    placeholder="Buscar escuela..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
              {loadingTenants ? (
                <div className="p-8 text-center text-gray-600 text-sm">Cargando...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        {['Escuela', 'Plan', 'MP', 'Comisión %', 'Cursos', 'Alumnos', '30d alumnos', 'Revenue total', 'Revenue 30d', 'Última actividad', 'Estado', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTenants.map(t => (
                        <tr key={t.tenant_id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <div>
                              <p className="font-medium text-white">{t.tenant_name}</p>
                              <p className="text-xs text-gray-600">{new Date(t.tenant_created_at).toLocaleDateString('es-AR')}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[t.plan_name ?? 'gratis'] ?? PLAN_COLORS.gratis}`}>
                              {t.plan_name ?? 'gratis'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {t.mp_connected
                              ? <Wifi className="w-4 h-4 text-green-400" />
                              : <WifiOff className="w-4 h-4 text-gray-600" />}
                          </td>
                          <td className="px-4 py-3.5">
                            <CommissionCell
                              tenantId={t.tenant_id}
                              value={t.commission_pct}
                              onSaved={() => refetchTenants()}
                            />
                          </td>
                          <td className="px-4 py-3.5 text-gray-300">{t.total_courses}</td>
                          <td className="px-4 py-3.5 text-gray-300">{t.total_students}</td>
                          <td className="px-4 py-3.5">
                            {t.new_students_30d > 0
                              ? <span className="text-green-400 font-semibold">+{t.new_students_30d}</span>
                              : <span className="text-gray-600">0</span>}
                          </td>
                          <td className="px-4 py-3.5 text-yellow-400 font-semibold whitespace-nowrap">
                            {t.total_revenue_ars > 0 ? fmtK(t.total_revenue_ars) : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-gray-300 whitespace-nowrap">
                            {t.revenue_30d > 0 ? fmtK(t.revenue_30d) : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">
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
                              className="text-gray-500 hover:text-gray-300 transition-colors"
                              title={t.active ? 'Desactivar' : 'Activar'}
                            >
                              {t.active
                                ? <ToggleRight className="w-5 h-5 text-green-500" />
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
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <p className="text-xs text-gray-500 mb-1">Total recaudado</p>
                <p className="text-2xl font-bold text-yellow-400">{fmtK(totalSubscriptionRevenue)}</p>
              </div>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <p className="text-xs text-gray-500 mb-1">Pagos totales</p>
                <p className="text-2xl font-bold text-white">{subscriptions.filter(s => s.status === 'approved').length}</p>
              </div>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <p className="text-xs text-gray-500 mb-1">Pendientes</p>
                <p className={`text-2xl font-bold ${pendingSubscriptions > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                  {pendingSubscriptions}
                </p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800">
                <h2 className="text-base font-semibold text-white">Historial de suscripciones</h2>
              </div>
              {loadingSubscriptions ? (
                <div className="p-8 text-center text-gray-600 text-sm">Cargando...</div>
              ) : subscriptions.length === 0 ? (
                <div className="p-12 text-center">
                  <Receipt className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">Sin pagos de suscripción aún</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        {['Escuela', 'Plan', 'Monto ARS', 'Estado', 'Período', 'Fecha'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.map(p => (
                        <tr key={p.payment_id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
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
                          <td className="px-5 py-3.5 text-gray-400 text-xs">
                            {p.period_start && p.period_end
                              ? `${new Date(p.period_start).toLocaleDateString('es-AR')} → ${new Date(p.period_end).toLocaleDateString('es-AR')}`
                              : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 text-xs">
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
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center text-gray-600 text-sm">Cargando...</div>
            ) : productionCourses.length === 0 ? (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-12 text-center space-y-3">
                <Clapperboard className="w-10 h-10 text-gray-700 mx-auto" />
                <p className="text-gray-500 text-sm">No hay cursos marcados como producidos por NATO.</p>
                <p className="text-gray-600 text-xs">Activá "Producido por NATO Creative" al editar un curso.</p>
              </div>
            ) : (
              <>
                {/* Summary strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <p className="text-xs text-gray-500 mb-1">Cursos producidos</p>
                    <p className="text-2xl font-bold text-white">{productionCourses.length}</p>
                  </div>
                  <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <p className="text-xs text-gray-500 mb-1">En recupero</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {productionCourses.filter(c => !c.is_recovered).length}
                    </p>
                  </div>
                  <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <p className="text-xs text-gray-500 mb-1">Sin ventas este mes</p>
                    <p className="text-xl font-bold text-red-400">
                      {productionCourses.filter(c => !c.is_recovered && c.sales_last_30d === 0).length}
                    </p>
                  </div>
                  <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <p className="text-xs text-gray-500 mb-1">Ventas este mes</p>
                    <p className="text-xl font-bold text-green-400">
                      {productionCourses.reduce((s, c) => s + (c.sales_last_30d ?? 0), 0)}
                    </p>
                  </div>
                </div>

                {/* Course cards */}
                <div className="space-y-3">
                  {productionCourses.map(c => {
                    const pct = Math.min(100, Math.round((c.nato_sales / c.recovery_target) * 100))
                    return (
                      <div key={c.course_id} className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div>
                            <p className="font-semibold text-white">{c.course_title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{c.tenant_name}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {c.is_recovered ? (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full">
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
                                className="text-xs text-gray-500 hover:text-white h-7 px-2"
                                onClick={() => markRecovered.mutate(c.course_id)}
                              >
                                Marcar recuperado
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5 mb-4">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{c.nato_sales} ventas cobradas por NATO</span>
                            <span>Meta: {c.recovery_target}</span>
                          </div>
                          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${c.is_recovered ? 'bg-green-500' : 'bg-yellow-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-600">
                            {c.is_recovered
                              ? `✅ Recuperado — todas las ventas van al creador`
                              : `Faltan ${c.recovery_target - c.nato_sales} ventas para completar el recupero`}
                          </p>
                        </div>

                        {/* Forecast */}
                        {!c.is_recovered && (
                          <div className={`rounded-lg px-3 py-2 mb-4 text-xs ${
                            c.months_to_recovery === null
                              ? 'bg-red-900/30 text-red-400'
                              : c.months_to_recovery <= 2
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-yellow-900/20 text-yellow-400'
                          }`}>
                            {c.sales_last_30d === 0 || c.months_to_recovery === null
                              ? `⚠️ Sin ventas este mes — sin ritmo actual no hay fecha de recupero`
                              : c.months_to_recovery <= 1
                              ? `🚀 A este ritmo (${c.sales_last_30d} ventas/mes) se recupera este mes`
                              : `📅 A este ritmo (${c.sales_last_30d} ventas/mes) se recupera en ~${c.months_to_recovery} meses`}
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-800">
                          <div>
                            <p className="text-xs text-gray-500">Ventas NATO</p>
                            <p className="text-sm font-semibold text-yellow-400 mt-0.5">{c.nato_sales}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Últ. 30 días</p>
                            <p className="text-sm font-semibold text-white mt-0.5">{c.sales_last_30d}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Progreso</p>
                            <p className="text-sm font-semibold mt-0.5 text-gray-300">{pct}%</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
