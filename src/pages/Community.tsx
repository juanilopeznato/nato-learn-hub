import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PostCard } from '@/components/community/PostCard'
import { PostForm, type PostFormData } from '@/components/community/PostForm'
import { LogOut, Plus, Users } from 'lucide-react'
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
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [showPostForm, setShowPostForm] = useState(false)

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['community-posts', tenant?.id, filter],
    enabled: !!tenant?.id,
    queryFn: async () => {
      let query = supabase
        .from('community_posts')
        .select(`
          id, title, body, category, created_at, is_pinned,
          author:profiles(id, full_name, avatar_url, level),
          reactions:community_reactions(profile_id),
          comments:community_comments(count)
        `)
        .eq('tenant_id', tenant!.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50)

      if (filter !== 'all') {
        query = query.eq('category', filter)
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
      })
      if (error) throw error
      await supabase.rpc('award_points', { p_action: 'post_community' })
    },
    onSuccess: () => {
      setShowPostForm(false)
      queryClient.invalidateQueries({ queryKey: ['community-posts'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
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
              <span className="font-semibold text-gray-900">Comunidad</span>
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
          {/* Filters + new post */}
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
              <p className="text-gray-500">Sé el primero en publicar algo.</p>
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
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
