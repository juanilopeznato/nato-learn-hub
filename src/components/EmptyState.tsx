/**
 * Empty state ilustrado. SVG inline para no cargar imágenes externas.
 *
 *   <EmptyState
 *     illustration="search"
 *     title="Sin resultados"
 *     description="No encontramos cursos con esos filtros."
 *     action={<Button onClick={...}>Limpiar filtros</Button>}
 *   />
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Illustration = 'search' | 'empty-box' | 'rocket' | 'success'

interface Props {
  illustration?: Illustration
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ illustration = 'search', title, description, action, className }: Props) {
  return (
    <div className={cn('rounded-2xl border border-border/60 bg-card p-12 lg:p-16 text-center space-y-6', className)}>
      <div className="mx-auto w-32 h-32 lg:w-40 lg:h-40">
        {illustration === 'search' && <SearchSvg />}
        {illustration === 'empty-box' && <EmptyBoxSvg />}
        {illustration === 'rocket' && <RocketSvg />}
        {illustration === 'success' && <SuccessSvg />}
      </div>
      <div className="space-y-2 max-w-sm mx-auto">
        <h3 className="font-heading text-display-sm text-foreground">{title}</h3>
        {description && <p className="text-body-sm text-muted-foreground leading-relaxed">{description}</p>}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}

function SearchSvg() {
  return (
    <svg viewBox="0 0 160 160" className="w-full h-full" fill="none" aria-hidden>
      <circle cx="80" cy="80" r="78" fill="hsl(var(--primary))" fillOpacity="0.04" />
      <circle cx="80" cy="80" r="60" fill="hsl(var(--primary))" fillOpacity="0.06" />
      <circle cx="70" cy="70" r="22" stroke="hsl(var(--primary))" strokeWidth="3" fill="white" />
      <path d="M86 86 L102 102" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" />
      <circle cx="70" cy="70" r="14" stroke="hsl(var(--primary))" strokeWidth="2" strokeOpacity="0.3" />
      <path d="M58 65 L66 73 L82 57" stroke="hsl(var(--primary))" strokeOpacity="0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      <circle cx="120" cy="40" r="3" fill="hsl(var(--primary))" fillOpacity="0.3" />
      <circle cx="40" cy="120" r="3" fill="hsl(var(--accent))" fillOpacity="0.3" />
      <circle cx="130" cy="100" r="2" fill="hsl(var(--primary))" fillOpacity="0.4" />
      <circle cx="30" cy="50" r="2" fill="hsl(var(--accent))" fillOpacity="0.4" />
    </svg>
  )
}

function EmptyBoxSvg() {
  return (
    <svg viewBox="0 0 160 160" className="w-full h-full" fill="none" aria-hidden>
      <circle cx="80" cy="80" r="78" fill="hsl(var(--primary))" fillOpacity="0.04" />
      {/* Box base */}
      <path d="M40 80 L40 120 L80 140 L120 120 L120 80 L80 100 Z" fill="hsl(var(--primary))" fillOpacity="0.1" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round" />
      {/* Box top open */}
      <path d="M40 80 L80 60 L120 80 L80 100 Z" fill="white" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round" />
      <path d="M80 100 L80 140" stroke="hsl(var(--primary))" strokeWidth="2" strokeOpacity="0.3" />
      {/* Sparkles */}
      <path d="M55 50 L57 54 L61 56 L57 58 L55 62 L53 58 L49 56 L53 54 Z" fill="hsl(var(--accent))" fillOpacity="0.6" />
      <path d="M115 45 L116 47 L118 48 L116 49 L115 51 L114 49 L112 48 L114 47 Z" fill="hsl(var(--primary))" fillOpacity="0.6" />
    </svg>
  )
}

function RocketSvg() {
  return (
    <svg viewBox="0 0 160 160" className="w-full h-full" fill="none" aria-hidden>
      <circle cx="80" cy="80" r="78" fill="hsl(var(--primary))" fillOpacity="0.04" />
      {/* Rocket body */}
      <path d="M80 30 C95 30 105 50 105 75 C105 95 95 105 80 105 C65 105 55 95 55 75 C55 50 65 30 80 30 Z" fill="white" stroke="hsl(var(--primary))" strokeWidth="2.5" />
      {/* Window */}
      <circle cx="80" cy="65" r="10" fill="hsl(var(--primary))" fillOpacity="0.15" stroke="hsl(var(--primary))" strokeWidth="2" />
      {/* Fins */}
      <path d="M55 85 L40 105 L55 100 Z" fill="hsl(var(--primary))" fillOpacity="0.2" stroke="hsl(var(--primary))" strokeWidth="2" />
      <path d="M105 85 L120 105 L105 100 Z" fill="hsl(var(--primary))" fillOpacity="0.2" stroke="hsl(var(--primary))" strokeWidth="2" />
      {/* Fire */}
      <path d="M68 105 C68 115 72 122 80 130 C88 122 92 115 92 105 Z" fill="hsl(var(--accent))" fillOpacity="0.6" />
      <path d="M73 105 C73 110 76 115 80 120 C84 115 87 110 87 105 Z" fill="hsl(38 100% 60%)" fillOpacity="0.7" />
    </svg>
  )
}

function SuccessSvg() {
  return (
    <svg viewBox="0 0 160 160" className="w-full h-full" fill="none" aria-hidden>
      <circle cx="80" cy="80" r="78" fill="hsl(var(--accent))" fillOpacity="0.06" />
      <circle cx="80" cy="80" r="55" fill="hsl(var(--accent))" fillOpacity="0.1" stroke="hsl(var(--accent))" strokeWidth="2" />
      <path d="M58 80 L73 95 L102 65" stroke="hsl(var(--accent))" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}
