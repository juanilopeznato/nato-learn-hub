import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function Boom({ message }: { message: string }): JSX.Element {
  throw new Error(message)
}

function Safe() {
  return <div>kid renderizado</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renderiza los children si no hay error', () => {
    render(<ErrorBoundary><Safe /></ErrorBoundary>)
    expect(screen.getByText('kid renderizado')).toBeInTheDocument()
  })

  it('muestra el fallback cuando un descendiente tira', () => {
    render(<ErrorBoundary><Boom message="oops" /></ErrorBoundary>)
    expect(screen.getByText(/algo salió mal/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /recargar/i })).toBeInTheDocument()
  })

  it('expone el detalle técnico cuando se abre el details', () => {
    render(<ErrorBoundary><Boom message="kaboom-123" /></ErrorBoundary>)
    fireEvent.click(screen.getByText(/ver detalle técnico/i))
    expect(screen.getByText('kaboom-123')).toBeInTheDocument()
  })

  it('tiene un link al inicio que apunta a "/"', () => {
    render(<ErrorBoundary><Boom message="x" /></ErrorBoundary>)
    const home = screen.getByRole('link', { name: /ir al inicio/i }) as HTMLAnchorElement
    expect(home.getAttribute('href')).toBe('/')
  })
})
