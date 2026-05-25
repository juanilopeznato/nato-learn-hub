/**
 * Hook minimal para detectar cuando un elemento entra al viewport.
 *
 * Uso para animar entradas (fade-up) sin agregar libs como framer-motion.
 *
 *   const ref = useRef<HTMLDivElement>(null)
 *   const inView = useInView(ref, { threshold: 0.15, once: true })
 *
 *   <div ref={ref} className={inView ? 'animate-slide-up' : 'opacity-0'}>
 */
import { useEffect, useState, type RefObject } from 'react'

interface Options {
  /** 0..1 — porcentaje del elemento que debe ser visible para disparar */
  threshold?: number
  /** Si true, una vez visible no vuelve a false (más performante) */
  once?: boolean
  /** Margen alrededor del root (puede acelerar el trigger) */
  rootMargin?: string
}

export function useInView(
  ref: RefObject<Element>,
  { threshold = 0.1, once = true, rootMargin = '0px' }: Options = {},
): boolean {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Si IntersectionObserver no existe (browsers viejos), mostrar todo
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    // Respetar prefers-reduced-motion: mostrar inmediatamente sin animar
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInView(true)
      return
    }
    const obs = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true)
            if (once) obs.disconnect()
          } else if (!once) {
            setInView(false)
          }
        }
      },
      { threshold, rootMargin },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref, threshold, once, rootMargin])

  return inView
}
