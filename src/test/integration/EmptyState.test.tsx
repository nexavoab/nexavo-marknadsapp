import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from '@/components/ui/EmptyState'

describe('EmptyState', () => {
  it('renderar ikon och titel', () => {
    render(<EmptyState icon="🎯" title="Inget här" />)
    expect(screen.getByText('🎯')).toBeInTheDocument()
    expect(screen.getByText('Inget här')).toBeInTheDocument()
  })

  it('renderar beskrivning om den ges', () => {
    render(<EmptyState title="Tom" description="Skapa något" />)
    expect(screen.getByText('Skapa något')).toBeInTheDocument()
  })

  it('visar CTA-knapp och anropar onClick', () => {
    const onClick = vi.fn()
    render(<EmptyState title="Tom" action={{ label: 'Lägg till', onClick }} />)
    fireEvent.click(screen.getByText('Lägg till'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('visar inte knapp om ingen action', () => {
    render(<EmptyState title="Tom" />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
