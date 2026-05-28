import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    signIn: vi.fn().mockResolvedValue(undefined),
    user: null,
    loading: false,
  }),
}))

import LoginPage from '@/pages/LoginPage'

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderar email och password-falt', () => {
    render(<BrowserRouter><LoginPage /></BrowserRouter>)
    expect(screen.getByLabelText(/e-post/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/l.senord/i)).toBeInTheDocument()
  })

  it('renderar login-knapp', () => {
    render(<BrowserRouter><LoginPage /></BrowserRouter>)
    expect(screen.getByRole('button', { name: /logga in/i })).toBeInTheDocument()
  })

  it('visar branding och produkttitel', () => {
    render(<BrowserRouter><LoginPage /></BrowserRouter>)
    expect(screen.getByText('Nexavo')).toBeInTheDocument()
    expect(screen.getByText('Marknadsapp')).toBeInTheDocument()
  })
})
