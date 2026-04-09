import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, BookOpen, Building2, TrendingUp, LogOut, ChevronRight, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface PlatformConfig {
  key: string
  value: string
  description?: string
}

export default function AdminPanel() {
  const { profile, tenant, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [configEdits, setConfigEdits] = useState<Record<string, string>>({})

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [tenants, profiles, courses, enrollments] = await Promise.all([
        supabase.from('tenants').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('enrollments').select('id', { count: 'exact', head: true }),
      ])
      return {
        tenants: tenants.count ?? 0,
        profiles: profiles.count ?? 0,
        courses: courses.count ?? 0,
        enrollments: enrollments.count ?? 0,
      }
    },
  })

  const { data: allTenants } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tenants')
        .select('id, name, slug, custom_domain, active, created_at')
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const { data: allCourses } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, title, slug, price, is_free, is_published, created_at, tenants(name), profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(50)
      return data ?? []
    },
  })

  const { data: recentEnrollments } = useQuery({
    queryKey: ['admin-enrollments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('id, enrolled_at, mp_status, paid_amount, profiles(full_name, email), courses(title)')
        .order('enrolled_at', { ascending: false })
        .limit(50)
      return data ?? []
    },
  })

  const { data: platformConfig } = useQuery({
    queryKey: ['platform-config'],
    queryFn: async () => {
      const { data } = await supabase.from('platform_config').select('*')
      return (data ?? []) as PlatformConfig[]
    },
  })

  const updateConfig = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('platform_config')
        .update({ value })
        .eq('key', key)
      if (error) throw error
    },
    onSuccess: (_data, { key }) => {
      queryClient.invalidateQueries({ queryKey: ['platform-config'] })
      setConfigEdits(prev => { const next = { ...prev }; delete next[key]; return next })
      toast.success('Configuración guardada')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const statCards = [
    { label: 'Tenants', value: stats?.tenants ?? 0, icon: Building2, color: 'text-blue-600 bg-blue-50' },
    { label: 'Usuarios', value: stats?.profiles ?? 0, icon: Users, color: 'text-green-600 bg-green-50' },
    { label: 'Cursos', value: stats?.courses ?? 0, icon: BookOpen, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Inscripciones', value: stats?.enrollments ?? 0, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={tenant?.logo_url ?? '/nato-logo.png'} alt="Admin" className="h-8 w-auto object-contain" />
            <Badge variant="secondary" className="text-xs">Super Admin</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">Vista estudiante</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-400">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Panel Administrador</h1>
          <p className="text-gray-500 mt-1">Visión global de la plataforma</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(s => (
            <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-200 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold font-heading text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="tenants">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="courses">Cursos</TabsTrigger>
            <TabsTrigger value="enrollments">Inscripciones</TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              Configuración
            </TabsTrigger>
          </TabsList>

          {/* Tenants */}
          <TabsContent value="tenants" className="mt-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Nombre', 'Slug', 'Dominio', 'Estado', 'Creado'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allTenants?.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{t.slug}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{t.custom_domain ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={t.active ? 'default' : 'secondary'} className="text-xs">
                          {t.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(t.created_at).toLocaleDateString('es-AR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Courses */}
          <TabsContent value="courses" className="mt-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Título', 'Tenant', 'Instructor', 'Precio', 'Estado'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allCourses?.map((c: any) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/courses/${c.slug}`} className="font-medium text-gray-900 hover:text-primary flex items-center gap-1">
                          {c.title}
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{c.tenants?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{c.profiles?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {c.is_free ? <Badge variant="outline" className="text-xs text-accent border-accent/30">Gratis</Badge> : `$${c.price} ARS`}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={c.is_published ? 'default' : 'secondary'} className="text-xs">
                          {c.is_published ? 'Publicado' : 'Borrador'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Enrollments */}
          <TabsContent value="enrollments" className="mt-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Estudiante', 'Curso', 'Estado', 'Monto', 'Fecha'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentEnrollments?.map((e: any) => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-xs">{e.profiles?.full_name ?? '—'}</p>
                        <p className="text-gray-400 text-xs">{e.profiles?.email ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{e.courses?.title ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={e.mp_status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                          {e.mp_status === 'free' ? 'Gratis' : e.mp_status === 'approved' ? 'Pagado' : e.mp_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {e.paid_amount ? `$${e.paid_amount}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(e.enrolled_at).toLocaleDateString('es-AR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          {/* Config */}
          <TabsContent value="config" className="mt-6">
            <div className="max-w-xl space-y-4">
              <div>
                <h2 className="font-heading text-lg font-bold text-gray-900">Configuración de la plataforma</h2>
                <p className="text-sm text-gray-500 mt-1">Parámetros globales de NATO University.</p>
              </div>

              {!platformConfig || platformConfig.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
                  No hay configuración disponible
                </div>
              ) : (
                <div className="space-y-3">
                  {platformConfig.map(cfg => {
                    const isCommission = cfg.key === 'commission_pct'
                    const currentEdit = configEdits[cfg.key] ?? cfg.value
                    return (
                      <div key={cfg.key} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                        <Label className="text-sm font-semibold text-gray-700">
                          {isCommission ? 'Comisión de plataforma (%)' : cfg.key}
                        </Label>
                        {cfg.description && (
                          <p className="text-xs text-gray-400">{cfg.description}</p>
                        )}
                        <div className="flex gap-2">
                          {isCommission ? (
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.1}
                              value={currentEdit}
                              onChange={e => setConfigEdits(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                              className="flex-1"
                            />
                          ) : (
                            <Input
                              value={currentEdit}
                              onChange={e => setConfigEdits(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                              className="flex-1"
                            />
                          )}
                          <Button
                            size="sm"
                            variant="hero"
                            onClick={() => updateConfig.mutate({ key: cfg.key, value: currentEdit })}
                            disabled={updateConfig.isPending || currentEdit === cfg.value}
                          >
                            Guardar
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
