import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Building2, Users, BookOpen, TrendingUp, DollarSign,
  ShieldCheck, Star, Activity, Clapperboard, CheckCircle2, Clock
} from 'lucide-react'

function MetricCard({
  label, value, sub, icon: Icon, accent = false,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent?: boolean
}) {
  return (
    <div className={`rounded-2xl p-5 border ${accent ? 'bg-yellow-400 border-yellow-300' : 'bg-white border-gray-100'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${accent ? 'text-yellow-900/70' : 'text-gray-400'}`}>{label}</p>
          <p className={`text-2xl font-bold ${accent ? 'text-yellow-900' : 'text-gray-900'}`}>{value}</p>
          {sub && <p className={`text-xs mt-0.5 ${accent ? 'text-yellow-800/70' : 'text-gray-400'}`}>{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-yellow-300/50' : 'bg-gray-50'}`}>
          <Icon className={`w-5 h-5 ${accent ? 'text-yellow-900' : 'text-gray-500'}`} />
        </div>
      </div>
    </div>
  )
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  starter: 'bg-blue-100 text-blue-700',
  creator: 'bg-yellow-100 text-yellow-700',
  pro: 'bg-purple-100 text-purple-700',
}

export default function NatoOwnerPanel() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'NATO Owner Panel'
  }, [])

  // Redirect if not nato_owner
  useEffect(() => {
    if (profile && profile.role !== 'nato_owner') navigate('/dashboard')
  }, [profile, navigate])

  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['nato-platform-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_platform_metrics')
      if (error) throw error
      return data as Record<string, number>
    },
    enabled: profile?.role === 'nato_owner',
  })

  const { data: tenants = [], isLoading: loadingTenants } = useQuery({
    queryKey: ['nato-tenants-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tenants_summary')
      if (error) throw error
      return data as {
        tenant_id: string
        tenant_name: string
        plan_name: string | null
        total_courses: number
        total_students: number
        total_revenue_ars: number
        nato_revenue_ars: number
        last_activity: string | null
      }[]
    },
    enabled: profile?.role === 'nato_owner',
  })

  const { data: productionCourses = [], isLoading: loadingProduction } = useQuery({
    queryKey: ['nato-production-courses'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_production_courses')
      if (error) throw error
      return data as {
        course_id: string
        course_title: string
        tenant_name: string
        recovery_target: number
        paid_sales: number
        nato_sales: number
        nato_revenue_ars: number
        is_recovered: boolean
      }[]
    },
    enabled: profile?.role === 'nato_owner',
  })

  const { data: revenueTrend = [] } = useQuery({
    queryKey: ['nato-revenue-trend'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_platform_revenue_trend')
      if (error) throw error
      return (data as { month: string; total_ars: number; nato_ars: number }[]).map(r => ({
        ...r,
        total_ars: Number(r.total_ars),
        nato_ars: Number(r.nato_ars),
      }))
    },
    enabled: profile?.role === 'nato_owner',
  })

  if (!profile || profile.role !== 'nato_owner') return null

  const fmt = (n: number) => `ARS ${Number(n).toLocaleString('es-AR')}`

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
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
          <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 text-xs">
            Acceso exclusivo
          </Badge>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 space-y-8">

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Revenue total"
            value={loadingMetrics ? '...' : fmt(metrics?.total_revenue_ars ?? 0)}
            sub="todos los tiempos"
            icon={DollarSign}
            accent
          />
          <MetricCard
            label="Revenue NATO"
            value={loadingMetrics ? '...' : fmt(metrics?.nato_revenue_ars ?? 0)}
            sub="recupero de producción"
            icon={Star}
          />
          <MetricCard
            label="Escuelas activas"
            value={loadingMetrics ? '...' : (metrics?.total_tenants ?? 0)}
            sub={`${metrics?.active_tenants ?? 0} activas este mes`}
            icon={Building2}
          />
          <MetricCard
            label="Estudiantes totales"
            value={loadingMetrics ? '...' : (metrics?.total_students ?? 0)}
            sub={`+${metrics?.new_students_30d ?? 0} últimos 30 días`}
            icon={Users}
          />
          <MetricCard
            label="Cursos publicados"
            value={loadingMetrics ? '...' : (metrics?.total_courses ?? 0)}
            sub={`${metrics?.nato_produced_courses ?? 0} producidos por NATO`}
            icon={BookOpen}
          />
          <MetricCard
            label="Inscripciones"
            value={loadingMetrics ? '...' : (metrics?.total_enrollments ?? 0)}
            sub={`${metrics?.paid_enrollments ?? 0} pagas`}
            icon={Activity}
          />
          <MetricCard
            label="Revenue creadores"
            value={loadingMetrics ? '...' : fmt(metrics?.creator_revenue_ars ?? 0)}
            sub="post-recupero"
            icon={TrendingUp}
          />
          <MetricCard
            label="Conversión de pago"
            value={
              loadingMetrics ? '...' :
              metrics?.total_enrollments
                ? `${Math.round(((metrics?.paid_enrollments ?? 0) / metrics.total_enrollments) * 100)}%`
                : '0%'
            }
            sub="inscripciones → pago"
            icon={TrendingUp}
          />
        </div>

        <Tabs defaultValue="revenue">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="revenue" className="data-[state=active]:bg-gray-700 text-gray-300 data-[state=active]:text-white">
              Revenue
            </TabsTrigger>
            <TabsTrigger value="escuelas" className="data-[state=active]:bg-gray-700 text-gray-300 data-[state=active]:text-white">
              Escuelas
            </TabsTrigger>
            <TabsTrigger value="produccion" className="data-[state=active]:bg-gray-700 text-gray-300 data-[state=active]:text-white">
              Producción NATO
            </TabsTrigger>
          </TabsList>

          {/* Revenue trend */}
          <TabsContent value="revenue" className="mt-6">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
              <h2 className="text-base font-semibold text-white mb-6">Revenue mensual — últimos 12 meses</h2>
              {revenueTrend.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-gray-600 text-sm">
                  Sin datos aún
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
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
                      formatter={(v: number, name: string) => [
                        `ARS ${v.toLocaleString('es-AR')}`,
                        name === 'total_ars' ? 'Total plataforma' : 'NATO'
                      ]}
                    />
                    <Legend formatter={v => v === 'total_ars' ? 'Total plataforma' : 'Revenue NATO'} />
                    <Area type="monotone" dataKey="total_ars" stroke="#fbbf24" strokeWidth={2} fill="url(#totalGrad)" />
                    <Area type="monotone" dataKey="nato_ars" stroke="#a78bfa" strokeWidth={2} fill="url(#natoGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>

          {/* Escuelas table */}
          <TabsContent value="escuelas" className="mt-6">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800">
                <h2 className="text-base font-semibold text-white">Todas las escuelas</h2>
              </div>
              {loadingTenants ? (
                <div className="p-8 text-center text-gray-600 text-sm">Cargando...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        {['Escuela', 'Plan', 'Cursos', 'Estudiantes', 'Revenue total', 'Revenue NATO', 'Última actividad'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.map(t => (
                        <tr key={t.tenant_id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-white">{t.tenant_name}</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[t.plan_name ?? 'free'] ?? PLAN_COLORS.free}`}>
                              {t.plan_name ?? 'free'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-300">{t.total_courses}</td>
                          <td className="px-5 py-3.5 text-gray-300">{t.total_students}</td>
                          <td className="px-5 py-3.5 text-yellow-400 font-semibold">
                            {t.total_revenue_ars > 0 ? `ARS ${Number(t.total_revenue_ars).toLocaleString('es-AR')}` : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-purple-400 font-semibold">
                            {t.nato_revenue_ars > 0 ? `ARS ${Number(t.nato_revenue_ars).toLocaleString('es-AR')}` : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 text-xs">
                            {t.last_activity
                              ? new Date(t.last_activity).toLocaleDateString('es-AR')
                              : 'Sin actividad'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
          {/* Producción NATO */}
          <TabsContent value="produccion" className="mt-6 space-y-4">
            {loadingProduction ? (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center text-gray-600 text-sm">Cargando...</div>
            ) : productionCourses.length === 0 ? (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-12 text-center space-y-3">
                <Clapperboard className="w-10 h-10 text-gray-700 mx-auto" />
                <p className="text-gray-500 text-sm">No hay cursos marcados como producidos por NATO todavía.</p>
                <p className="text-gray-600 text-xs">Activá el toggle "Producido por NATO Creative" al crear o editar un curso.</p>
              </div>
            ) : (
              <>
                {/* Summary strip */}
                <div className="grid grid-cols-3 gap-4">
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
                    <p className="text-xs text-gray-500 mb-1">Total cobrado por NATO</p>
                    <p className="text-2xl font-bold text-purple-400">
                      ARS {productionCourses.reduce((s, c) => s + Number(c.nato_revenue_ars), 0).toLocaleString('es-AR')}
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
                          {c.is_recovered ? (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Recuperado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full shrink-0">
                              <Clock className="w-3.5 h-3.5" /> En recupero
                            </span>
                          )}
                        </div>

                        {/* Progress bar */}
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
                              ? `${c.paid_sales - c.recovery_target} ventas ya van al creador`
                              : `Faltan ${c.recovery_target - c.nato_sales} ventas para completar el recupero`}
                          </p>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-800">
                          <div>
                            <p className="text-xs text-gray-500">Ventas totales</p>
                            <p className="text-sm font-semibold text-white mt-0.5">{c.paid_sales}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Revenue NATO</p>
                            <p className="text-sm font-semibold text-purple-400 mt-0.5">
                              ARS {Number(c.nato_revenue_ars).toLocaleString('es-AR')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Estado</p>
                            <p className="text-sm font-semibold mt-0.5 text-gray-300">{pct}% recuperado</p>
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
