/**
 * compressImage es difícil de testear sin canvas real (jsdom no implementa
 * canvas.toBlob). Estos tests mockean canvas para verificar la rama de
 * validación + el flujo de output.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { compressImage, StorageError } from '@/lib/storage'

describe('compressImage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      writable: true,
      value: vi.fn(async () => ({ width: 800, height: 600, close: () => {} })),
    })
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() })) as unknown as typeof HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) {
      cb(new Blob(['x'.repeat(500)], { type: 'image/webp' }))
    }
  })

  it('rechaza tipos no-imagen con StorageError', async () => {
    const file = new File(['x'], 'foo.pdf', { type: 'application/pdf' })
    await expect(compressImage(file, { maxW: 100, maxH: 100, quality: 0.8 })).rejects.toBeInstanceOf(StorageError)
  })

  it('comprime un jpeg y devuelve un blob webp', async () => {
    const file = new File(['x'], 'foo.jpg', { type: 'image/jpeg' })
    const out = await compressImage(file, { maxW: 200, maxH: 200, quality: 0.8 })
    expect(out).toBeInstanceOf(Blob)
    expect(out.type).toBe('image/webp')
  })

  it('acepta png, webp, gif, heic', async () => {
    for (const type of ['image/png', 'image/webp', 'image/gif', 'image/heic']) {
      const file = new File(['x'], 'foo', { type })
      const out = await compressImage(file, { maxW: 100, maxH: 100, quality: 0.8 })
      expect(out.type).toBe('image/webp')
    }
  })
})
