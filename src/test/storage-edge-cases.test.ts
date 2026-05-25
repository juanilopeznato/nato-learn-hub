import { describe, it, expect, vi, beforeEach } from 'vitest'

const removeMock = vi.fn(async () => ({ data: [], error: null }))
const fromMock = vi.fn(() => ({ remove: removeMock }))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: (bucket: string) => fromMock(bucket),
    },
  },
}))

import { deleteImageByUrl, getOptimizedUrl } from '@/lib/storage'

describe('deleteImageByUrl — edge cases', () => {
  beforeEach(() => {
    removeMock.mockClear()
    fromMock.mockClear()
  })

  it('ignora URLs vacías sin tirar error', async () => {
    await deleteImageByUrl('')
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('ignora URLs malformadas', async () => {
    await deleteImageByUrl('not a url at all')
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('ignora URLs sin /storage/v1/object/public/ pattern', async () => {
    await deleteImageByUrl('https://supabase.co/something-else/file.png')
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('extrae bucket y path para deeply-nested folders', async () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/course-images/tenant-1/sub/deep/file.webp'
    await deleteImageByUrl(url)
    expect(fromMock).toHaveBeenCalledWith('course-images')
    expect(removeMock).toHaveBeenCalledWith([
      'tenant-1/sub/deep/file.webp',
      'tenant-1/sub/deep/file.thumb.webp',
    ])
  })

  it('maneja query string complejo', async () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/avatars/me.webp?v=2&t=123&cache=no'
    await deleteImageByUrl(url)
    expect(removeMock).toHaveBeenCalledWith([
      'me.webp',
      'me.thumb.webp',
    ])
  })

  it('no llama remove para archivos sin extensión .webp pero respeta el path', async () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/avatars/random.jpeg'
    await deleteImageByUrl(url)
    expect(removeMock).toHaveBeenCalledWith(['random.jpeg'])
  })

  it('no agrega .thumb.webp duplicado si la URL ya es un thumb', async () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/avatars/tenant-1/abc.thumb.webp'
    await deleteImageByUrl(url)
    expect(removeMock).toHaveBeenCalledWith(['tenant-1/abc.thumb.webp'])
  })
})

describe('getOptimizedUrl — edge cases', () => {
  it('size=full devuelve transform con width=1920', () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/course-images/a.webp'
    const out = getOptimizedUrl(url, { size: 'full' })
    expect(out).toContain('width=1920')
    expect(out).toContain('/render/image/public/')
  })

  it('preserva query params en URLs con thumb existente', () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/avatars/x.webp?cache=1'
    const out = getOptimizedUrl(url, { size: 'thumb' })
    expect(out).toContain('.thumb.webp')
    expect(out).toContain('cache=1')
  })

  it('URLs no-supabase pasan sin tocar', () => {
    const url = 'https://cdn.cloudflare.com/random.jpg'
    expect(getOptimizedUrl(url, { size: 'md' })).toBe(url)
  })

  it('null y undefined devuelven string vacío sin crashear', () => {
    expect(getOptimizedUrl(null)).toBe('')
    expect(getOptimizedUrl(undefined)).toBe('')
    expect(getOptimizedUrl('')).toBe('')
  })

  it('size sm prefiere thumb sobre transform', () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/avatars/a.webp'
    const out = getOptimizedUrl(url, { size: 'sm' })
    expect(out).toContain('.thumb.webp')
  })
})
