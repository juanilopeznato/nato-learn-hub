import { describe, it, expect } from 'vitest'
import { parseText, escapeHtml } from '@/lib/text-render'

describe('parseText', () => {
  it('texto sin links queda como un solo segment text', () => {
    const out = parseText('hola mundo')
    expect(out).toEqual([{ type: 'text', value: 'hola mundo' }])
  })

  it('detecta una URL https en medio de texto', () => {
    const out = parseText('mirá esto https://natoglobal.com.ar es lo nuestro')
    expect(out).toHaveLength(3)
    expect(out[1]).toMatchObject({ type: 'url', value: 'https://natoglobal.com.ar', href: 'https://natoglobal.com.ar' })
  })

  it('detecta www. URLs y las normaliza a https://', () => {
    const out = parseText('andá a www.natoglobal.com.ar')
    expect(out[1]).toMatchObject({ type: 'url', value: 'www.natoglobal.com.ar', href: 'https://www.natoglobal.com.ar' })
  })

  it('limpia puntuación al final del URL', () => {
    const out = parseText('Ver https://x.com.')
    const url = out.find(s => s.type === 'url')!
    expect(url.value).toBe('https://x.com')
    expect(out[out.length - 1]).toEqual({ type: 'text', value: '.' })
  })

  it('detecta email y arma mailto:', () => {
    const out = parseText('escribime a hola@nato.com.ar')
    const email = out.find(s => s.type === 'email')!
    expect(email).toMatchObject({ type: 'email', value: 'hola@nato.com.ar', href: 'mailto:hola@nato.com.ar' })
  })

  it('múltiples URLs + email en el mismo texto', () => {
    const out = parseText('https://a.com y www.b.com y c@d.com')
    expect(out.filter(s => s.type === 'url')).toHaveLength(2)
    expect(out.filter(s => s.type === 'email')).toHaveLength(1)
  })

  it('vacío o null devuelve []', () => {
    expect(parseText('')).toEqual([])
  })
})

describe('escapeHtml', () => {
  it('escapa < > & " \'', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
  })
})
