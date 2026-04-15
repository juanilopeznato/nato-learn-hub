interface Props {
  streak: number
  size?: 'sm' | 'md'
}

export function StreakBadge({ streak, size = 'md' }: Props) {
  if (streak < 1) return null

  const isHot = streak >= 7
  const isFire = streak >= 3

  return (
    <div
      className={`flex items-center gap-1 font-semibold rounded-full px-2.5 py-1 transition-all ${
        size === 'sm' ? 'text-xs' : 'text-sm'
      } ${
        isHot
          ? 'bg-orange-100 text-orange-600 ring-1 ring-orange-200'
          : isFire
          ? 'bg-amber-50 text-amber-600'
          : 'bg-gray-100 text-gray-500'
      }`}
      title={`${streak} día${streak !== 1 ? 's' : ''} seguido${streak !== 1 ? 's' : ''} aprendiendo`}
    >
      <span className={size === 'sm' ? 'text-sm' : 'text-base'}>
        {isHot ? '🔥' : isFire ? '🔥' : '📅'}
      </span>
      <span>{streak}</span>
      {size === 'md' && (
        <span className="font-normal opacity-70">{streak === 1 ? 'día' : 'días'}</span>
      )}
    </div>
  )
}
