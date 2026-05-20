import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SanitizedHtml } from '@/components/SanitizedHtml'

describe('SanitizedHtml', () => {
  it('muestra el placeholder mientras carga DOMPurify', () => {
    render(<SanitizedHtml html="<b>hola</b>" />)
    expect(screen.getByText(/cargando vista previa/i)).toBeInTheDocument()
  })

  it('renderiza HTML sanitizado después de cargar la lib', async () => {
    const { container } = render(<SanitizedHtml html="<strong>limpio</strong>" />)
    await waitFor(() => {
      expect(container.querySelector('strong')).not.toBeNull()
      expect(container.textContent).toContain('limpio')
    })
  })

  it('elimina script tags maliciosos', async () => {
    const { container } = render(
      <SanitizedHtml html='<p>safe</p><script>window.pwned=true</script>' />,
    )
    await waitFor(() => {
      expect(container.querySelector('p')).not.toBeNull()
      expect(container.querySelector('script')).toBeNull()
    })
  })

  it('aplica className al wrapper', async () => {
    const { container } = render(<SanitizedHtml html="<p>x</p>" className="my-class" />)
    await waitFor(() => {
      expect(container.firstChild).toHaveClass('my-class')
    })
  })
})
