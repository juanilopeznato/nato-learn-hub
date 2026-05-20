import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

const mockedAuth = vi.hoisted(() => ({ tenant: null as { id: string; name: string } | null }))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockedAuth,
}))

import { useTenant, useOptionalTenant } from '@/hooks/useTenant'

describe('useTenant', () => {
  it('tira si no hay tenant', () => {
    mockedAuth.tenant = null
    expect(() => renderHook(() => useTenant())).toThrow(/no hay tenant/i)
  })

  it('devuelve el tenant si existe', () => {
    mockedAuth.tenant = { id: 'tenant-1', name: 'School' }
    const { result } = renderHook(() => useTenant())
    expect(result.current.id).toBe('tenant-1')
  })
})

describe('useOptionalTenant', () => {
  it('devuelve null sin tirar si no hay tenant', () => {
    mockedAuth.tenant = null
    const { result } = renderHook(() => useOptionalTenant())
    expect(result.current).toBeNull()
  })
})
