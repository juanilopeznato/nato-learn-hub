import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PostCard } from '@/components/community/PostCard'
import { PostForm, type PostFormData } from '@/components/community/PostForm'
import { LogOut, Plus, Users, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

type CategoryFilter = 'all' | 'question' | 'win' | 'resource' | 'general'

const FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'all',      label: 'Todo' },
  { value: 'question', label: '❓ Preguntas' },
  { value: 'win',      label: '🏆 Logros' },
  { value: 'resource', label: '📎 Recursos' },
  { value: 'general',  label: '💬 General' },
]

export default function Community() {
  const { profile, tenant, signOut } = useAuth()
  const queryClient = useQueryClient()
  const location = useLocation()

  // Leer ?course= de la URL para pre-filtrar por curso
  const urlCourseId = new URLSearchParams(location.search).get('course')

  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [activeCourseId, setActiveCourseId] = useState<string | null>(urlCourseId)
  const [showPostForm, setShowPostForm] = useState(false)

  // Cursos en los que el alumno está inscripto (para mostrar como filtros)
  const { data: enrolledCourses = [] } = useQuery({
    queryKey: ['enrolled-courses-community', profile?.id, tenant?.id],
    enabled: !!profile?.id && !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('course_id, courses(id, title)')
        .eq('student_id', profile!.id)
        .in('mp_status', ['free', 'approved'])
      return (data ?? []).map(e => e.courses as unknown as { id: string; title: string } | null).filter(Boolean) as { id: string; title: string }[]
    },
  })

  // Nombre del curso activo para el header contextual
  const activeCourse = enrolledCourses.find(c => c.id === activeCourseId)

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['community-posts', tenant?.id, filter, activeCourseId],
    enabled: !!tenant?.id,
    queryFn: async () => {
      let query = supabase
        .from('community_posts')
        .select(`
          id, title, body, category, created_at, is_pinned, course_id,
          author:profiles(id, full_name, avatar_url, level),
          reactions:community_reactions(profile_id),
          comments:community_comments(count)
        `)
        .eq('tenant_id', tenant!.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50)

      if (filter !== 'all') query = query.eq('category', filter)

      if (activeCourseId) {
        query = query.eq('course_id', activeCourseId)
      }

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })

  const createPost = useMutation({
    mutationFn: async (data: PostFormData) => {
      if (!profile || !tenant) throw new Error('Sin sesión')
      const { error } = await supabase.from('community_posts').insert({
        tenant_id: tenant.id,
        author_id: profile.id,
        title: data.title,
        body: data.body,
        category: data.category,
        course_id: data.course_id ?? activeCourseId ?? null,
      })
      if (error) throw error
      await supabase.rpc('award_points', { p_action: 'post_community' })
    },
    onSuccess: () => {
      setShowPostForm(false)
      queryClient.invalidateQueries({ queryKey: ['community-posts'] })
      toast.success('Publicado +5 pts')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenant?.name ?? 'NATO University'} className="h-8 w-auto object-contain" />
            </Link>
            <div className="hidden sm:flex items-center gap-1 text-sm">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-semibold text-gray-900">
                {activeCourse ? activeCourse.title : 'Comunidad'}
              </span>
              {activeCourse && (
                <button
                  onClick={() => setActiveCourseId(null)}
                  className="ml-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  (ver todo)
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">Mi aprendizaje</Link>
            </Button>
            <div className="hidden sm:flex items-center gap-1 text-sm text-gray-500 mr-1">
              <span className="text-xs font-semibold text-primary">{(profile as any)?.points ?? 0} pts</span>
              <span className="text-xs text-gray-400">· Nv.{(profile as any)?.level ?? 1}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-400">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Filtros de curso (si el alumno tiene cursos) */}
          {enrolledCourses.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveCourseId(null)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  !activeCourseId
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                <Users className="w-3 h-3" />
                Toda la escuela
              </button>
              {enrolledCourses.map(course => (
                <button
                  key={course.id}
                  onClick={() => setActiveCourseId(course.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeCourseId === course.id
                      ? 'bg-primary text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  <BookOpen className="w-3 h-3" />
                  {course.title.length > 24 ? course.title.slice(0, 22) + '…' : course.title}
                </button>
              ))}
            </div>
          )}

          {/* Filtros de categoría + botón publicar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1.5 flex-wrap flex-1">
              {FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filter === f.value
                      ? 'bg-primary text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <Button variant="hero" size="sm" onClick={() => setShowPostForm(true)} className="shrink-0">
              <Plus className="w-4 h-4" />
              Publicar
            </Button>
          </div>

          {/* Posts */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl h-32 animate-pulse" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-3">
              <Users className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-gray-700 font-medium">
                {activeCourse
                  ? `Todavía no hay posts en el foro de ${activeCourse.title}`
                  : 'Sé el primero en publicar algo.'}
              </p>
              <p className="text-gray-400 text-sm">Preguntá, compartí un logro o subí un recurso.</p>
              <Button variant="hero" size="sm" onClick={() => setShowPostForm(true)}>
                <Plus className="w-4 h-4" />
                Nueva publicación
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post: any) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentProfileId={profile!.id}
                  tenantId={tenant!.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={showPostForm} onOpenChange={setShowPostForm}>
        <DialogContent className="bg-white border-gray-200 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-gray-900">Nueva publicación</DialogTitle>
          </DialogHeader>
          <PostForm
            onSubmit={createPost.mutateAsync}
            onCancel={() => setShowPostForm(false)}
            enrolledCourses={enrolledCourses}
            defaultCourseId={activeCourseId ?? undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
