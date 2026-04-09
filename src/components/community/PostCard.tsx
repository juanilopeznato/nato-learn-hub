import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Heart, MessageCircle, Pin } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Category = 'question' | 'win' | 'resource' | 'general'

interface Post {
  id: string
  title: string
  body: string
  category: Category
  created_at: string
  is_pinned: boolean
  author: { id: string; full_name: string; avatar_url: string | null; level: number } | null
  reactions: { profile_id: string }[]
  comments: { count: number }[]
}

interface Props {
  post: Post
  currentProfileId: string
  tenantId: string
}

const CATEGORY_STYLES: Record<Category, { label: string; class: string }> = {
  question: { label: '❓ Pregunta',  class: 'bg-blue-50 text-blue-600' },
  win:      { label: '🏆 Logro',     class: 'bg-green-50 text-green-600' },
  resource: { label: '📎 Recurso',   class: 'bg-orange-50 text-orange-600' },
  general:  { label: '💬 General',   class: 'bg-gray-100 text-gray-600' },
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-xs font-semibold text-primary">{initials}</span>
    </div>
  )
}

function CommentSection({ postId, tenantId, profileId }: { postId: string; tenantId: string; profileId: string }) {
  const [body, setBody] = useState('')
  const queryClient = useQueryClient()

  const { data: comments = [] } = useQuery({
    queryKey: ['community-comments', postId],
    queryFn: async () => {
      const { data } = await supabase
        .from('community_comments')
        .select('id, body, created_at, author:profiles(id, full_name, avatar_url)')
        .eq('post_id', postId)
        .is('parent_id', null)
        .order('created_at', { ascending: true })
      return data ?? []
    },
  })

  const insertComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('community_comments').insert({
        post_id: postId, tenant_id: tenantId, author_id: profileId, body: body.trim(),
      })
      if (error) throw error
      await supabase.rpc('award_points', { p_action: 'comment_community' })
    },
    onSuccess: () => {
      setBody('')
      queryClient.invalidateQueries({ queryKey: ['community-comments', postId] })
      queryClient.invalidateQueries({ queryKey: ['community-posts'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="border-t border-gray-100 pt-4 space-y-3">
      {comments.map((c: any) => (
        <div key={c.id} className="flex gap-2.5">
          <Avatar name={c.author?.full_name ?? 'Usuario'} url={c.author?.avatar_url ?? null} />
          <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold text-gray-900">{c.author?.full_name ?? 'Usuario'}</span>
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}
              </span>
            </div>
            <p className="text-sm text-gray-700">{c.body}</p>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Escribí un comentario..."
          className="resize-none text-sm min-h-[60px] border-gray-200 focus:border-primary"
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey && body.trim()) insertComment.mutate() }}
        />
        <Button
          variant="hero"
          size="sm"
          className="self-end shrink-0"
          disabled={!body.trim() || insertComment.isPending}
          onClick={() => insertComment.mutate()}
        >
          Enviar
        </Button>
      </div>
    </div>
  )
}

export function PostCard({ post, currentProfileId, tenantId }: Props) {
  const [expanded, setExpanded] = useState(false)
  const queryClient = useQueryClient()

  const hasLiked = post.reactions.some(r => r.profile_id === currentProfileId)
  const likeCount = post.reactions.length
  const commentCount = (post.comments[0] as any)?.count ?? 0
  const cat = CATEGORY_STYLES[post.category]

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (hasLiked) {
        await supabase.from('community_reactions').delete()
          .eq('post_id', post.id).eq('profile_id', currentProfileId)
      } else {
        await supabase.from('community_reactions').insert({ post_id: post.id, profile_id: currentProfileId })
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 space-y-3 ${post.is_pinned ? 'ring-1 ring-primary/20' : ''}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to={`/members/${post.author?.id}`}>
          <Avatar name={post.author?.full_name ?? 'Usuario'} url={post.author?.avatar_url ?? null} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/members/${post.author?.id}`} className="text-sm font-semibold text-gray-900 hover:text-primary transition-colors">
              {post.author?.full_name ?? 'Usuario'}
            </Link>
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
              Nv. {post.author?.level ?? 1}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.class}`}>{cat.label}</span>
            {post.is_pinned && <Pin className="w-3 h-3 text-primary" />}
          </div>
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })}
          </span>
        </div>
      </div>

      {/* Content */}
      <div>
        <h3 className="font-heading font-semibold text-gray-900 mb-1">{post.title}</h3>
        <p className={`text-sm text-gray-600 leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}>
          {post.body}
        </p>
        {post.body.length > 200 && (
          <button
            className="text-xs text-primary hover:text-primary/80 mt-1"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? 'Ver menos' : 'Ver más'}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-1">
        <button
          className={`flex items-center gap-1.5 text-sm transition-colors ${hasLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
          onClick={() => toggleLike.mutate()}
        >
          <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>
        <button
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary transition-colors"
          onClick={() => setExpanded(v => !v)}
        >
          <MessageCircle className="w-4 h-4" />
          {commentCount > 0 && <span>{commentCount}</span>}
          <span>{expanded ? 'Cerrar' : 'Comentar'}</span>
        </button>
      </div>

      {expanded && (
        <CommentSection postId={post.id} tenantId={tenantId} profileId={currentProfileId} />
      )}
    </div>
  )
}
