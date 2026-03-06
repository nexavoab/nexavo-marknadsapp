import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FranchisePortalPage from '@/pages/franchise/FranchisePortalPage'

// Mock useFranchiseeData hook - tom state
const mockUseFranchiseeData = vi.fn()

vi.mock('@/hooks/useFranchiseeData', () => ({
  useFranchiseeData: () => mockUseFranchiseeData(),
}))

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('FranchisePortalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('visar loading skeleton initialt', () => {
    mockUseFranchiseeData.mockReturnValue({
      campaigns: [],
      loading: true,
      error: null,
    })

    renderWithRouter(<FranchisePortalPage />)

    // Kontrollera att det finns animate-pulse element (skeleton)
    const skeletons = document.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('visar "Aktiva kampanjer" heading', async () => {
    mockUseFranchiseeData.mockReturnValue({
      campaigns: [],
      loading: false,
      error: null,
    })

    renderWithRouter(<FranchisePortalPage />)

    await waitFor(() => {
      expect(screen.getByText(/aktiva kampanjer/i)).toBeInTheDocument()
    })
  })

  it('visar empty state när inga kampanjer', async () => {
    mockUseFranchiseeData.mockReturnValue({
      campaigns: [],
      loading: false,
      error: null,
    })

    renderWithRouter(<FranchisePortalPage />)

    await waitFor(() => {
      expect(screen.getByText(/inga aktiva kampanjer/i)).toBeInTheDocument()
    })
  })

  it('visar kampanjkort när data laddas', async () => {
    const mockCampaigns = [
      {
        id: 'camp-1',
        name: 'Sommarkampanj',
        description: 'Beskrivning',
        status: 'active',
        channels: ['facebook', 'instagram'],
        start_date: '2024-06-01',
        end_date: '2024-08-31',
      },
      {
        id: 'camp-2',
        name: 'Höstkampanj',
        description: 'Annan beskrivning',
        status: 'active',
        channels: ['facebook'],
        start_date: '2024-09-01',
        end_date: '2024-11-30',
      },
    ]

    mockUseFranchiseeData.mockReturnValue({
      campaigns: mockCampaigns,
      loading: false,
      error: null,
    })

    renderWithRouter(<FranchisePortalPage />)

    await waitFor(() => {
      expect(screen.getByText('Sommarkampanj')).toBeInTheDocument()
      expect(screen.getByText('Höstkampanj')).toBeInTheDocument()
    })
  })

  it('visar felmeddelande vid error', async () => {
    mockUseFranchiseeData.mockReturnValue({
      campaigns: [],
      loading: false,
      error: 'Kunde inte hämta kampanjer',
    })

    renderWithRouter(<FranchisePortalPage />)

    await waitFor(() => {
      expect(screen.getByText(/gick fel/i)).toBeInTheDocument()
    })
  })

  it('kampanjkort renderas korrekt', async () => {
    const mockCampaigns = [
      {
        id: 'camp-1',
        name: 'Testkampanj',
        status: 'active',
        channels: ['facebook'],
        description: 'Test beskrivning',
      },
    ]

    mockUseFranchiseeData.mockReturnValue({
      campaigns: mockCampaigns,
      loading: false,
      error: null,
    })

    renderWithRouter(<FranchisePortalPage />)

    await waitFor(() => {
      expect(screen.getByText('Testkampanj')).toBeInTheDocument()
    })
  })
})
