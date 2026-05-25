/**
 * Avisa al user antes de salir si hay cambios sin guardar.
 *
 *   const form = useForm({ ... })
 *   useUnsavedChangesWarning(form.formState.isDirty)
 *
 * Implementa:
 *  - beforeunload (cerrar tab / refresh)
 *  - popstate (back/forward del browser, parcial — react-router lo bloquea con su propio API)
 *
 * Para bloquear navegación dentro de react-router, usar useBlocker de RR v6.4+.
 * Acá nos enfocamos en el caso más común: cerrar tab / refresh.
 */
import { useEffect } from 'react'

export function useUnsavedChangesWarning(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Browsers modernos ignoran returnValue pero el preventDefault basta
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])
}
