import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isThisMonth, subDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Users, TrendingUp, BookOpen, DollarSign, Activity, Award, Eye, MousePointerClick, ShoppingCart, UserCheck } from 'lucide-react'

interface Props {
  courseIds: string[]
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-1">
      <div className="flex items-center gap-2 text-gray-500">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="font-heading text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  )
}

export function KpiDashboard({ courseIds }: Props) {
  // Enrollments KPIs
  const { data: enrollments = [] } = useQuery({
    queryKey: ['kpi-enrollments', courseIds],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('id, enrolled_at, amount_paid, mp_status, course_id')
        .in('course_id', courseIds)
        .in('mp_status', ['free', 'approved'])
      return data ?? []
    },
  })

  // Active students last 7 days
  const { data: recentProgress = [] } = useQuery({
    queryKey: ['kpi-active', courseIds],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const since = subDays(new Date(), 7).toISOString()
      const { data } = await supabase
        .from('lesson_progress')
        .select('enrollment_id, enrollments!inner(course_id, student_id)')
        .in('enrollments.course_id', courseIds)
        .gte('completed_at', since)
      return data ?? []
    },
  })

  // Completion rate per course
  const { data: progressRows = [] } = useQuery({
    queryKey: ['kpi-completion', courseIds],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('course_progress')
        .select('course_id, progress_percent, enrollment_id')
        .in('course_id', courseIds)
      return data ?? []
    },
  })

  // Top completed lessons
  const { data: lessonProgress = [] } = useQuery({
    queryKey: ['kpi-lessons', courseIds],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('lesson_progress')
        .select('lesson_id, lessons!inner(title, modules!inner(course_id))')
        .in('lessons.modules.course_id', courseIds)
        .eq('completed', true)
      return data ?? []
    },
  })

  // Funnel analytics (single course only)
  const singleCourseId = courseIds.length === 1 ? courseIds[0] : null

  const { data: funnelData } = useQuery({
    queryKey: ['kpi-funnel', singleCourseId],
    enabled: !!singleCourseId,
    queryFn: async () => {
      const { data } = await supabase.rpc('get_course_funnel', { p_course_id: singleCourseId! })
      return data?.[0] ?? null
    },
  })

  const { data: dailyEventsData = [] } = useQuery({
    queryKey: ['kpi-daily-events', singleCourseId],
    enabled: !!singleCourseId,
    queryFn: async () => {
      const { data } = await supabase.rpc('get_course_daily_events', {
        p_course_id: singleCourseId!,
        p_days: 30,
      })
      return (data ?? []).map((row: any) => ({
        day: format(new Date(row.day), 'd MMM', { locale: es }),
        Vistas: Number(row.page_views ?? 0),
        Clics: Number(row.cta_clicks ?? 0),
        Checkouts: Number(row.checkout_starts ?? 0),
        Inscriptos: Number(row.enrollments ?? 0),
      }))
    },
  })

  // Enrollment trend
  const { data: trendData = [] } = useQuery({
    queryKey: ['kpi-trend', courseIds],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.rpc('get_enrollment_trend', { p_course_ids: courseIds })
      return (data ?? []).map((row: any) => ({
        day: format(new Date(row.day), 'd MMM', { locale: es }),
        inscriptos: Number(row.count),
      }))
    },
  })

  // Compute KPIs
  const totalEnrollments = enrollments.length
  const newThisMonth = enrollments.filter(e => isThisMonth(new Date(e.enrolled_at))).length
  const revenueTotal = enrollments.reduce((sum, e) => sum + (e.amount_paid ?? 0), 0)
  const revenueThisMonth = enrollments.filter(e => isThisMonth(new Date(e.enrolled_at))).reduce((sum, e) => sum + (e.amount_paid ?? 0), 0)
  const activeStudents = new Set(recentProgress.map((lp: any) => lp.enrollments?.student_id).filter(Boolean)).size
  const avgCompletion = progressRows.length
    ? Math.round(progressRows.reduce((sum, p) => sum + (p.progress_percent ?? 0), 0) / progressRows.length)
    : 0

  // Top 5 lessons
  const lessonCounts: Record<string, { title: string; count: number }> = {}
  lessonProgress.forEach((lp: any) => {
    const id = lp.lesson_id
    const title = lp.lessons?.title ?? 'Sin título'
    if (!lessonCounts[id]) lessonCounts[id] = { title, count: 0 }
    lessonCounts[id].count++
  })
  const topLessons = Object.values(lessonCounts).sort((a, b) => b.count - a.count).slice(0, 5)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={Users} label="Total inscriptos" value={totalEnrollments} sub={`+${newThisMonth} este mes`} />
        <StatCard icon={Activity} label="Activos (7 días)" value={activeStudents} sub="estudiantes con actividad" />
        <StatCard icon={TrendingUp} label="Completitud promedio" value={`${avgCompletion}%`} sub="avance promedio del curso" />
        <StatCard icon={DollarSign} label="Revenue total" value={revenueTotal > 0 ? `ARS ${revenueTotal.toLocaleString('es-AR')}` : '--'} sub="cursos pagos" />
        <StatCard icon={DollarSign} label="Revenue este mes" value={revenueThisMonth > 0 ? `ARS ${revenueThisMonth.toLocaleString('es-AR')}` : '--'} />
        <StatCard icon={BookOpen} label="Nuevos este mes" value={newThisMonth} sub="inscripciones" />
      </div>

      {/* Funnel — single course only */}
      {singleCourseId && (
        <div className="space-y-4">
          {/* Funnel steps */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Embudo de conversión</h4>
            {funnelData ? (() => {
              const steps = [
                { icon: Eye, label: 'Visitas a la landing', value: funnelData.page_views ?? 0, color: 'bg-blue-500' },
                { icon: MousePointerClick, label: 'Clics en CTA', value: funnelData.cta_clicks ?? 0, color: 'bg-indigo-500' },
                { icon: ShoppingCart, label: 'Inicio de checkout', value: funnelData.checkout_starts ?? 0, color: 'bg-violet-500' },
                { icon: UserCheck, label: 'Inscriptos', value: funnelData.enrollments ?? 0, color: 'bg-primary' },
              ]
              const maxVal = steps[0].value || 1
              return (
                <div className="space-y-3">
                  {steps.map((step, i) => {
                    const pct = Math.round((step.value / maxVal) * 100)
                    const convFromPrev = i > 0 && steps[i - 1].value > 0
                      ? Math.round((step.value / steps[i - 1].value) * 100)
                      : null
                    return (
                      <div key={step.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-gray-700">
                            <step.icon className="w-3.5 h-3.5 text-gray-400" />
                            {step.label}
                          </span>
                          <div className="flex items-center gap-3">
                            {convFromPrev !== null && (
                              <span className="text-xs text-gray-400">{convFromPrev}% del paso anterior</span>
                            )}
                            <span className="font-semibold text-gray-900 tabular-nums w-10 text-right">{step.value.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${step.color} rounded-full transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  {/* Overall conversion rate */}
                  {funnelData.page_views > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
                      <span className="text-gray-500">Conversión total (visita → inscripción)</span>
                      <span className="font-bold text-primary">
                        {((funnelData.enrollments / funnelData.page_views) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              )
            })() : (
              <div className="h-24 flex items-center justify-center text-sm text-gray-400">
                Sin datos de visitas todavía
              </div>
            )}
          </div>

          {/* Daily events chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Actividad diaria — últimos 30 días</h4>
            {dailyEventsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailyEventsData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Vistas" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Clics" stroke="#6366F1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Checkouts" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Inscriptos" stroke="#7C3AED" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
                Sin actividad en los últimos 30 días
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enrollment trend chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Inscripciones — últimos 30 días</h4>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorInsc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
                formatter={(value: number) => [value, 'Inscriptos']}
              />
              <Area type="monotone" dataKey="inscriptos" stroke="#7C3AED" strokeWidth={2} fill="url(#colorInsc)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-sm text-gray-400">
            Aún no hay inscripciones en los últimos 30 días
          </div>
        )}
      </div>

      {/* Top lessons */}
      {topLessons.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
            <Award className="w-4 h-4 text-yellow-500" />
            Lecciones más completadas
          </h4>
          <div className="space-y-2">
            {topLessons.map((lesson, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-4 text-right shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-700 truncate">{lesson.title}</span>
                    <span className="text-xs font-semibold text-primary shrink-0">{lesson.count}</span>
                  </div>
                  <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full"
                      style={{ width: `${Math.round((lesson.count / (topLessons[0].count || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
