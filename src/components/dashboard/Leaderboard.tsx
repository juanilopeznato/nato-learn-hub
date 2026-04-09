import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'

interface Props {
  tenantId: string
  currentProfileId?: string
}

const RANK_STYLES = ['text-yellow-500', 'text-gray-400', 'text-amber-600']

export function Leaderboard({ tenantId, currentProfileId }: Props) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['leaderboard', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leaderboard_monthly')
        .select('profile_id, full_name, avatar_url, level, points_this_month')
        .eq('tenant_id', tenantId)
        .order('points_this_month', { ascending: false })
        .limit(10)
      if (error) throw error
      return data ?? []
    },
  })

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <Trophy className="w-4 h-4 text-yellow-500" />
        <h3 className="font-heading font-semibold text-gray-900 text-sm">Top del mes</h3>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400">
          Completá lecciones o comentá para aparecer acá.
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {rows.map((row, i) => {
            const initials = (row.full_name ?? 'U').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
            const isMe = row.profile_id === currentProfileId
            return (
              <Link
                key={row.profile_id}
                to={`/members/${row.profile_id}`}
                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${isMe ? 'bg-primary/5' : ''}`}
              >
                <span className={`text-sm font-bold w-5 text-center shrink-0 ${RANK_STYLES[i] ?? 'text-gray-400'}`}>
                  {i + 1}
                </span>
                {row.avatar_url ? (
                  <img src={row.avatar_url} alt={row.full_name ?? ''} className="w-7 h-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary">{initials}</span>
                  </div>
                )}
                <span className="flex-1 text-sm text-gray-900 truncate">
                  {row.full_name ?? 'Usuario'}
                  {isMe && <span className="ml-1 text-xs text-primary">(vos)</span>}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-gray-400">Nv.{row.level}</span>
                  <span className="text-xs font-semibold text-primary">{row.points_this_month} pts</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
