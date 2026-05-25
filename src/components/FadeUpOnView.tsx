/**
 * Wrapper que anima children con un fade-up cuando entra al viewport.
 *
 *   <FadeUpOnView>
 *     <Card>...</Card>
 *   </FadeUpOnView>
 *
 *   <FadeUpOnView delay={120}>...</FadeUpOnView>
 *
 * Cero deps externas. Respeta prefers-reduced-motion (siempre visible).
 */
import { useRef, type ReactNode } from 'react'
import { useInView } from '@/hooks/useInView'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  className?: string
  /** Delay en ms antes de empezar la animación */
  delay?: number
  /** Threshold del IntersectionObserver (0..1) */
  threshold?: number
  /** as = elemento HTML wrapper */
  as?: keyof JSX.IntrinsicElements
}

export function FadeUpOnView({
  children,
  className,
  delay = 0,
  threshold = 0.1,
  as: Tag = 'div',
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { threshold, once: true })

  return (
    <Tag
      ref={ref as never}
      className={cn(
        'transition-all duration-700 ease-apple',
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className,
      )}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
