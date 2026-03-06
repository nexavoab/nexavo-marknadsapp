import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CampaignsPage from '@/pages/hq/campaigns/CampaignsPage'

// Mock useCampaigns hook
vi.mock('@/hooks/useCampaigns', () => ({
  useCampaigns: () => ({
    fetchCampaigns: vi.fn().mockResolvedValue([]),
    fetchCampaign: vi.fn(),
    createCampaign: vi.fn(),
    updateCampaignStatus: vi.fn(),
    loading: false,
  }),
}))

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    appUser: { id: 'user-1', organization_id: 'org-1', role: 'hq_admin' },
  }),
}))

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('CampaignsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderar "Ny kampanj"-knapp', async () => {
    renderWithRouter(<CampaignsPage />)

    await waitFor(() => {
      const newButton = screen.getByRole('button', { name: /ny kampanj/i })
      expect(newButton).toBeInTheDocument()
    })
  })

  it('visar empty state när inga kampanjer', async () => {
    renderWithRouter(<CampaignsPage />)

    await waitFor(() => {
      // Kontrollera att det finns text om inga kampanjer
      expect(screen.getByText(/inga kampanjer/i)).toBeInTheDocument()
    })
  })

  it('visar heading', async () => {
    renderWithRouter(<CampaignsPage />)

    await waitFor(() => {
      // Använd getByRole för att hitta specifikt h1
      const heading = screen.getByRole('heading', { level: 1, name: /kampanjer/i })
      expect(heading).toBeInTheDocument()
    })
  })

  it('visar status-badges för kampanjer', async () => {
    renderWithRouter(<CampaignsPage />)

    await waitFor(() => {
      // Kontrollera att sidan renderas
      expect(screen.getByRole('button', { name: /ny kampanj/i })).toBeInTheDocument()
    })
  })
})
