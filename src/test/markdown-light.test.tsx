import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarkdownLight } from '@/components/MarkdownLight'

describe('MarkdownLight', () => {
  it('renderiza texto plano como párrafo', () => {
    render(<MarkdownLight>hola mundo</MarkdownLight>)
    expect(screen.getByText('hola mundo')).toBeInTheDocument()
  })

  it('parsea **bold**', () => {
    render(<MarkdownLight>{'Hola **mundo**'}</MarkdownLight>)
    const strong = screen.getByText('mundo')
    expect(strong.tagName).toBe('STRONG')
  })

  it('parsea *italic*', () => {
    render(<MarkdownLight>{'Esto es *importante*'}</MarkdownLight>)
    const em = screen.getByText('importante')
    expect(em.tagName).toBe('EM')
  })

  it('parsea `inline code`', () => {
    render(<MarkdownLight>{'Usá `npm install` antes'}</MarkdownLight>)
    const code = screen.getByText('npm install')
    expect(code.tagName).toBe('CODE')
  })

  it('parsea [link](url)', () => {
    render(<MarkdownLight>{'Mirá [esto](https://example.com)'}</MarkdownLight>)
    const link = screen.getByRole('link', { name: 'esto' }) as HTMLAnchorElement
    expect(link.href).toContain('example.com')
    expect(link.target).toBe('_blank')
  })

  it('parsea headings # ## ###', () => {
    const { container } = render(<MarkdownLight>{'# Título\n## Sub\n### Sub2'}</MarkdownLight>)
    expect(container.querySelectorAll('h2')).toHaveLength(1)
    expect(container.querySelectorAll('h3')).toHaveLength(1)
    expect(container.querySelectorAll('h4')).toHaveLength(1)
  })

  it('parsea listas con - y *', () => {
    const { container } = render(<MarkdownLight>{'- uno\n- dos\n* tres'}</MarkdownLight>)
    expect(container.querySelectorAll('li')).toHaveLength(3)
  })

  it('auto-linkea URLs sueltas en texto plano', () => {
    render(<MarkdownLight>{'visitá https://natoglobal.com.ar para más'}</MarkdownLight>)
    const link = screen.getByRole('link', { name: /natoglobal/i }) as HTMLAnchorElement
    expect(link.href).toContain('natoglobal')
  })

  it('null/undefined no rompe', () => {
    const { container } = render(<MarkdownLight>{null}</MarkdownLight>)
    expect(container.firstChild).toBeNull()
  })
})
