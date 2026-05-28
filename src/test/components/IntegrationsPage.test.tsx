import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import IntegrationsPage from '@/pages/hq/IntegrationsPage'
import { supabase } from '@/lib/supabase'
import { redirectToExternalUrl } from '@/lib/navigation'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    appUser: { id: 'user-1', organization_id: 'org-1', role: 'hq_admin', email: 'hq@test.com', name: 'HQ User' },
    user: { id: 'auth-1', email: 'hq@test.com' },
    loading: false,
    isHQ: true,
    isFranchisee: false,
  }),
}))

vi.mock('@/lib/navigation', () => ({
  redirectToExternalUrl: vi.fn(),
}))

function renderPage(initialEntry = '/hq/integrations') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <IntegrationsPage />
    </MemoryRouter>
  )
}

function mockLoadIntegrations(integrations: Array<Record<string, unknown>>) {
  const eqMock = vi.fn().mockResolvedValue({ data: integrations, error: null })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never)
  return { selectMock, eqMock }
}

describe('IntegrationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renderar tillgangliga integrationer och roadmap nar inget ar anslutet', async () => {
    mockLoadIntegrations([])

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /integrationer/i })).toBeInTheDocument()
    })

    expect(screen.getByText(/anslut meta ads/i)).toBeInTheDocument()
    expect(screen.getByText('Meta Ads')).toBeInTheDocument()
    expect(screen.getByText('Google Ads')).toBeInTheDocument()
    expect(screen.getByText('E-post')).toBeInTheDocument()
    expect(screen.getByText('SMS')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /anslut/i }).length).toBeGreaterThan(0)
    expect(screen.getByText(/roadmap/i)).toBeInTheDocument()
  })

  it('visar ansluten status och doljer onboarding nar minst en integration ar aktiv', async () => {
    mockLoadIntegrations([
      {
        id: 'integration-meta',
        provider: 'meta',
        status: 'active',
        updated_at: '2026-03-08T10:00:00.000Z',
        token_expires_at: null,
      },
    ])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/^Ansluten$/)).toBeInTheDocument()
    })

    expect(screen.queryByText(/anslut meta ads/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /koppla fr.n/i })).toBeInTheDocument()
    expect(screen.getByText(/18\/24 franchisetagare aktiva/i)).toBeInTheDocument()
  })

  it('visar callback-success direkt i UI', async () => {
    mockLoadIntegrations([])

    renderPage('/hq/integrations?success=true&provider=meta')

    await waitFor(() => {
      expect(screen.getByText(/meta ads har anslutits!/i)).toBeInTheDocument()
    })
  })

  it('startar oauth-flodet via edge function', async () => {
    const user = userEvent.setup()
    mockLoadIntegrations([])
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    } as never)

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ url: 'https://oauth.example.com/connect' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    renderPage()

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /anslut/i }).length).toBeGreaterThan(0)
    })

    await user.click(screen.getAllByRole('button', { name: /anslut/i })[0])

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('integrations-oauth?provider=meta&action=initiate'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer token-123',
            'Content-Type': 'application/json',
          }),
        })
      )
    })
    expect(redirectToExternalUrl).toHaveBeenCalledWith('https://oauth.example.com/connect')
  })

  it('kan koppla fran en aktiv integration', async () => {
    const user = userEvent.setup()
    const loadQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'integration-meta',
              provider: 'meta',
              status: 'active',
              updated_at: '2026-03-08T10:00:00.000Z',
              token_expires_at: null,
            },
          ],
          error: null,
        }),
      }),
    }
    const disconnectQuery = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }
    const reloadQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }

    vi.mocked(supabase.from)
      .mockReturnValueOnce(loadQuery as never)
      .mockReturnValueOnce(disconnectQuery as never)
      .mockReturnValueOnce(reloadQuery as never)

    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /koppla fr.n/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /koppla fr.n/i }))

    await waitFor(() => {
      expect(screen.getByText(/integration fr.nkopplad/i)).toBeInTheDocument()
    })
    expect(disconnectQuery.update).toHaveBeenCalledWith({ status: 'disconnected' })
  })
})
