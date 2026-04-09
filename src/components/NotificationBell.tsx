import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Bell, MessageSquare, Heart, BookOpen, Trophy, Reply } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Link } from 'react-router-dom'

type Notification = {
  id: string
  type: 'lesson_comment' | 'comment_reply' | 'post_reaction' | 'post_comment' | 'new_lesson' | 'course_completed'
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}

function NotifIcon({ type }: { type: Notification['type'] }) {
  const cls = 'w-4 h-4 shrink-0'
  switch (type) {
    case 'lesson_comment':   return <MessageSquare className={`${cls} text-blue-500`} />
    case 'comment_reply':    return <Reply className={`${cls} text-indigo-500`} />
    case 'post_reaction':    return <Heart className={`${cls} text-rose-500`} />
    case 'post_comment':     return <MessageSquare className={`${cls} text-violet-500`} />
    case 'new_lesson':       return <BookOpen className={`${cls} text-primary`} />
    case 'course_completed': return <Trophy className={`${cls} text-yellow-500`} />
    default:                 return <Bell className={`${cls} text-gray-400`} />
  }
}

interface Props {
  profileId: string
}

export function NotificationBell({ profileId }: Props) {
  const queryClient = useQueryClient()

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', profileId)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return (data ?? []) as Notification[]
    },
  })

  // All notifications for display (last 10 including read)
  const { data: allNotifications = [] } = useQuery({
    queryKey: ['notifications-all', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', profileId)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return (data ?? []) as Notification[]
    },
  })

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${profileId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
          queryClient.invalidateQueries({ queryKey: ['notifications-all'] })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profileId, queryClient])

  const unreadCount = notifications.length

  const markAllRead = async () => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', profileId)
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['notifications-all'] })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2">
          <Bell className="w-5 h-5 text-gray-500" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-heading text-sm font-semibold text-gray-900">Notificaciones</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline"
            >
              Marcar todo como leído
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
          {allNotifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No tenés notificaciones
            </div>
          ) : (
            allNotifications.map(notif => {
              const inner = (
                <div
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-primary/5' : ''}`}
                >
                  <div className="mt-0.5">
                    <NotifIcon type={notif.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-snug ${!notif.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{notif.body}</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">{timeAgo(notif.created_at)}</p>
                  </div>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  )}
                </div>
              )

              return notif.link ? (
                <Link key={notif.id} to={notif.link}>{inner}</Link>
              ) : (
                <div key={notif.id}>{inner}</div>
              )
            })
          )}
        </div>

        {allNotifications.length > 0 && unreadCount === 0 && (
          <div className="px-4 py-2 border-t border-gray-100 text-center text-xs text-gray-400">
            Todo al día
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
