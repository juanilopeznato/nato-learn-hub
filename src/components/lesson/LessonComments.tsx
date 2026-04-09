import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { MessageCircle, Trash2, CornerDownRight } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  lessonId: string
  tenantId: string
  profileId: string
  profileRole: string
}

interface Comment {
  id: string
  body: string
  created_at: string
  parent_id: string | null
  author: { id: string; full_name: string; avatar_url: string | null } | null
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-xs font-semibold text-primary">{initials}</span>
    </div>
  )
}

function CommentForm({ onSubmit, placeholder = 'Escribí tu comentario...', autoFocus = false, onCancel }: {
  onSubmit: (body: string) => Promise<void>
  placeholder?: string
  autoFocus?: boolean
  onCancel?: () => void
}) {
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setLoading(true)
    try {
      await onSubmit(body.trim())
      setBody('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder={placeholder}
        className="resize-none text-sm min-h-[80px] border-gray-200 focus:border-primary"
        autoFocus={autoFocus}
      />
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="hero" size="sm" disabled={loading || !body.trim()}>
          {loading ? 'Enviando...' : 'Comentar'}
        </Button>
      </div>
    </form>
  )
}

function CommentItem({ comment, replies, canDelete, onReply, onDelete }: {
  comment: Comment
  replies: Comment[]
  canDelete: (authorId: string) => boolean
  onReply: (parentId: string, body: string) => Promise<void>
  onDelete: (id: string) => void
}) {
  const [showReply, setShowReply] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Avatar name={comment.author?.full_name ?? 'Usuario'} url={comment.author?.avatar_url ?? null} />
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-900">{comment.author?.full_name ?? 'Usuario'}</span>
              <span className="text-xs text-gray-400 shrink-0">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: es })}
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{comment.body}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 ml-1">
            <button
              className="text-xs text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
              onClick={() => setShowReply(v => !v)}
            >
              <CornerDownRight className="w-3 h-3" />
              Responder
            </button>
            {canDelete(comment.author?.id ?? '') && (
              <button
                className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                onClick={() => onDelete(comment.id)}
              >
                <Trash2 className="w-3 h-3" />
                Eliminar
              </button>
            )}
          </div>
          {showReply && (
            <div className="mt-2">
              <CommentForm
                placeholder={`Responder a ${comment.author?.full_name ?? 'este comentario'}...`}
                autoFocus
                onCancel={() => setShowReply(false)}
                onSubmit={async (body) => {
                  await onReply(comment.id, body)
                  setShowReply(false)
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-11 space-y-3">
          {replies.map(reply => (
            <div key={reply.id} className="flex gap-3">
              <Avatar name={reply.author?.full_name ?? 'Usuario'} url={reply.author?.avatar_url ?? null} />
              <div className="flex-1 min-w-0">
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">{reply.author?.full_name ?? 'Usuario'}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{reply.body}</p>
                </div>
                {canDelete(reply.author?.id ?? '') && (
                  <button
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 mt-1 ml-1"
                    onClick={() => onDelete(reply.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function LessonComments({ lessonId, tenantId, profileId, profileRole }: Props) {
  const queryClient = useQueryClient()

  const { data: comments = [] } = useQuery({
    queryKey: ['lesson-comments', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_comments')
        .select('id, body, created_at, parent_id, author:profiles(id, full_name, avatar_url)')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as Comment[]
    },
  })

  const insertMutation = useMutation({
    mutationFn: async ({ body, parentId }: { body: string; parentId: string | null }) => {
      const { error } = await supabase.from('lesson_comments').insert({
        lesson_id: lessonId,
        tenant_id: tenantId,
        author_id: profileId,
        body,
        parent_id: parentId,
      })
      if (error) throw error
      await supabase.rpc('award_points', { p_action: 'comment_lesson' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-comments', lessonId] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lesson_comments').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson-comments', lessonId] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const canDelete = (authorId: string) =>
    authorId === profileId || ['instructor', 'admin', 'super_admin'].includes(profileRole)

  const rootComments = comments.filter(c => !c.parent_id)
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <MessageCircle className="w-4 h-4" />
        Comentarios ({comments.length})
      </h3>

      <CommentForm
        onSubmit={(body) => insertMutation.mutateAsync({ body, parentId: null })}
      />

      {rootComments.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-gray-100">
          {rootComments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={getReplies(comment.id)}
              canDelete={canDelete}
              onReply={(parentId, body) => insertMutation.mutateAsync({ body, parentId })}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
