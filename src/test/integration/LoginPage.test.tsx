import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

// Mock AuthContext före import av LoginPage
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

  it('renderar email och password-fält', () => {
    render(<BrowserRouter><LoginPage /></BrowserRouter>)
    expect(screen.getByLabelText(/e-post/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/lösenord/i)).toBeInTheDocument()
  })

  it('renderar login-knapp', () => {
    render(<BrowserRouter><LoginPage /></BrowserRouter>)
    expect(screen.getByRole('button', { name: /logga in/i })).toBeInTheDocument()
  })

  it('visar titel', () => {
    render(<BrowserRouter><LoginPage /></BrowserRouter>)
    expect(screen.getByText('Nexavo Marknadsapp')).toBeInTheDocument()
  })
})
