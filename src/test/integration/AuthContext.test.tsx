import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

// Test-komponent som exponerar auth-state
function AuthTestComponent() {
  const { user, isHQ, isFranchisee, loading } = useAuth()
  if (loading) return <div>Loading...</div>
  return (
    <div>
      <div data-testid="user">{user?.email ?? 'ingen'}</div>
      <div data-testid="isHQ">{String(isHQ)}</div>
      <div data-testid="isFranchisee">{String(isFranchisee)}</div>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('visar loading initialt', () => {
    render(<AuthProvider><AuthTestComponent /></AuthProvider>)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('isHQ är false när ingen användare', async () => {
    render(<AuthProvider><AuthTestComponent /></AuthProvider>)
    await waitFor(() => {
      expect(screen.getByTestId('isHQ').textContent).toBe('false')
    })
  })

  it('isFranchisee är false när ingen användare', async () => {
    render(<AuthProvider><AuthTestComponent /></AuthProvider>)
    await waitFor(() => {
      expect(screen.getByTestId('isFranchisee').textContent).toBe('false')
    })
  })

  it('kastar fel om useAuth används utanför Provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<AuthTestComponent />)).toThrow('useAuth must be used within AuthProvider')
    consoleSpy.mockRestore()
  })
})
