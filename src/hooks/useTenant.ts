/**
 * Hook que devuelve el tenant actual o tira un error si no hay.
 *
 * Útil en pages protegidas donde ProtectedRoute ya garantizó el tenant —
 * permite evitar `tenant!.id` salpicado por todos lados y centraliza el
 * fallo cuando algo se cae.
 *
 *   const tenant = useTenant()   // throws si null
 *   const tenantId = tenant.id   // typed, no `!`
 */
import { useAuth } from '@/context/AuthContext'
import type { Tables } from '@/types/database.types'

type Tenant = Tables<'tenants'>

export function useTenant(): Tenant {
  const { tenant } = useAuth()
  if (!tenant) {
    throw new Error(
      '[useTenant] No hay tenant resuelto. Usar useAuth() si la página debe ' +
      'tolerar la ausencia de tenant, o asegurar que el ErrorBoundary la capture.',
    )
  }
  return tenant
}

/**
 * Variante "best effort" — devuelve null sin tirar. Útil en componentes
 * que pueden renderizar antes de que el tenant esté resuelto.
 */
export function useOptionalTenant(): Tenant | null {
  return useAuth().tenant
}
