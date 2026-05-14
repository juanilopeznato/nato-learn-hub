import { describe, it, expect } from 'vitest'
import { buildMpOAuthUrl } from '@/lib/mp-oauth'

describe('buildMpOAuthUrl', () => {
  it('arma una URL válida con todos los params', () => {
    const url = buildMpOAuthUrl('tenant-abc-123')
    expect(url).toContain('https://auth.mercadopago.com/authorization')
    expect(url).toContain('client_id=')
    expect(url).toContain('response_type=code')
    expect(url).toContain('platform_id=mp')
    expect(url).toContain('redirect_uri=')
    expect(url).toContain('state=tenant-abc-123')
  })

  it('escapea correctamente caracteres especiales en tenantId', () => {
    const url = buildMpOAuthUrl('tenant with spaces & symbols')
    expect(url).toContain('state=tenant+with+spaces+%26+symbols')
  })

  it('el redirect_uri es absoluto', () => {
    const url = buildMpOAuthUrl('x')
    const u = new URL(url)
    const redirect = u.searchParams.get('redirect_uri')
    expect(redirect).toMatch(/^https?:\/\//)
  })
})
