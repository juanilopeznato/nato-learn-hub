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

// Import después del mock
import { deleteImageByUrl } from '@/lib/storage'

describe('deleteImageByUrl', () => {
  beforeEach(() => {
    removeMock.mockClear()
    fromMock.mockClear()
  })

  it('no hace nada si la URL no es del storage de Supabase', async () => {
    await deleteImageByUrl('https://cdn.external.com/foo.jpg')
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('borra la imagen y su thumb hermano cuando es .webp principal', async () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/course-images/tenant-1/abc.webp'
    await deleteImageByUrl(url)
    expect(fromMock).toHaveBeenCalledWith('course-images')
    expect(removeMock).toHaveBeenCalledWith([
      'tenant-1/abc.webp',
      'tenant-1/abc.thumb.webp',
    ])
  })

  it('si la URL ya es de un thumb, no agrega un .thumb.thumb.webp', async () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/avatars/tenant-1/xyz.thumb.webp'
    await deleteImageByUrl(url)
    expect(removeMock).toHaveBeenCalledWith(['tenant-1/xyz.thumb.webp'])
  })

  it('extrae bien el path aunque la URL tenga query params', async () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/avatars/tenant-1/photo.webp?v=2'
    await deleteImageByUrl(url)
    expect(removeMock).toHaveBeenCalledWith([
      'tenant-1/photo.webp',
      'tenant-1/photo.thumb.webp',
    ])
  })

  it('borra archivos legacy no-.webp sin agregar thumb', async () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/avatars/legacy.png'
    await deleteImageByUrl(url)
    expect(removeMock).toHaveBeenCalledWith(['legacy.png'])
  })
})
