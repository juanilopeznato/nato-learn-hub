import { describe, it, expect } from 'vitest'
import { getOptimizedUrl } from '@/lib/storage'

describe('getOptimizedUrl', () => {
  const url = 'https://hoolsigtquohayhpqgtb.supabase.co/storage/v1/object/public/course-images/tenant-1/abc123.webp'

  it('devuelve string vacío si no hay URL', () => {
    expect(getOptimizedUrl(null)).toBe('')
    expect(getOptimizedUrl(undefined)).toBe('')
    expect(getOptimizedUrl('')).toBe('')
  })

  it('para size=thumb prefiere el thumb pre-generado si la URL es .webp', () => {
    const out = getOptimizedUrl(url, { size: 'thumb' })
    expect(out).toContain('.thumb.webp')
  })

  it('para tamaños grandes usa render/image transform', () => {
    const out = getOptimizedUrl(url, { size: 'lg' })
    expect(out).toContain('/render/image/public/')
    expect(out).toContain('width=1280')
    expect(out).toContain('quality=80')
  })

  it('no rompe URLs externas (no Supabase storage)', () => {
    const ext = 'https://cdn.external.com/foo.jpg'
    expect(getOptimizedUrl(ext, { size: 'md' })).toBe(ext)
  })

  it('size=full sigue siendo URL transformada (1920)', () => {
    const out = getOptimizedUrl(url, { size: 'full' })
    expect(out).toContain('width=1920')
  })
})
