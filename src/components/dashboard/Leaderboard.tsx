import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { SmartAvatar } from '@/components/SmartImage'

interface Props {
  tenantId: string
  currentProfileId?: string
}

const RANK_STYLES = ['text-yellow-500', 'text-muted-foreground/80', 'text-amber-600']

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

  // Si el alumno NO está en el top 10, calculamos su puesto real para mostrarlo
  // al final ("vos: #24"). Sin esto, fuera del top 10 no sabe dónde está → desmotiva.
  const inTop10 = rows.some(r => r.profile_id === currentProfileId)
  const { data: myRank } = useQuery({
    queryKey: ['leaderboard-my-rank', tenantId, currentProfileId],
    enabled: !!currentProfileId && !isLoading && rows.length > 0 && !inTop10,
    queryFn: async () => {
      const { data: me } = await supabase
        .from('leaderboard_monthly')
        .select('profile_id, full_name, avatar_url, level, points_this_month')
        .eq('tenant_id', tenantId)
        .eq('profile_id', currentProfileId!)
        .maybeSingle()
      if (!me) return null
      // Rank = cuántos tienen más puntos que yo + 1
      const { count } = await supabase
        .from('leaderboard_monthly')
        .select('profile_id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gt('points_this_month', me.points_this_month ?? 0)
      return { ...me, rank: (count ?? 0) + 1 }
    },
  })

  return (
    <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <Trophy className="w-4 h-4 text-yellow-500" />
        <h3 className="font-heading font-semibold text-foreground text-sm">Top del mes</h3>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-secondary rounded-lg animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground/80">
          Completá lecciones o comentá para aparecer acá.
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {rows.map((row, i) => {
            const initials = (row.full_name ?? 'U').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
            const isMe = row.profile_id === currentProfileId
            return (
              <Link
                key={row.profile_id}
                to={`/members/${row.profile_id}`}
                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/30 transition-colors ${isMe ? 'bg-primary/5' : ''}`}
              >
                <span className={`text-sm font-bold w-5 text-center shrink-0 ${RANK_STYLES[i] ?? 'text-muted-foreground/80'}`}>
                  {i + 1}
                </span>
                <SmartAvatar
                  src={row.avatar_url}
                  alt={row.full_name ?? ''}
                  size={28}
                  fallbackInitials={initials}
                  className="shrink-0 bg-primary/10 text-primary"
                />

                <span className="flex-1 text-sm text-foreground truncate">
                  {row.full_name ?? 'Usuario'}
                  {isMe && <span className="ml-1 text-xs text-primary">(vos)</span>}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-muted-foreground/80">Nv.{row.level}</span>
                  <span className="text-xs font-semibold text-primary">{row.points_this_month} pts</span>
                </div>
              </Link>
            )
          })}

          {/* Tu puesto si quedaste fuera del top 10 */}
          {myRank && (
            <Link
              to={`/members/${myRank.profile_id}`}
              className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border-t-2 border-primary/20 hover:bg-primary/10 transition-colors"
            >
              <span className="text-sm font-bold w-5 text-center shrink-0 text-primary tabular-nums">
                {myRank.rank}
              </span>
              <SmartAvatar
                src={myRank.avatar_url}
                alt={myRank.full_name ?? ''}
                size={28}
                fallbackInitials={(myRank.full_name ?? 'U').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                className="shrink-0 bg-primary/10 text-primary"
              />
              <span className="flex-1 text-sm text-foreground truncate">
                {myRank.full_name ?? 'Usuario'}
                <span className="ml-1 text-xs text-primary font-medium">(vos)</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-muted-foreground/80">Nv.{myRank.level}</span>
                <span className="text-xs font-semibold text-primary">{myRank.points_this_month} pts</span>
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
