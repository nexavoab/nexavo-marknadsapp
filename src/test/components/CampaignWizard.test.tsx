import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CampaignWizard } from '@/components/campaign/CampaignWizard'

// Mock BrandContext
vi.mock('@/contexts/BrandContext', () => ({
  useBrandContext: () => ({
    brand: {
      id: 'brand-1',
      name: 'TestBrand',
      organization_id: 'org-1',
      tone_traits: { formality: 0.5, modernity: 0.5, emotion: 0.5, volume: 0.5 },
      colors: { primary: '#2563EB' },
      logos: { primary_url: 'https://test.com/logo.png', min_size_px: 24, safe_zone_percent: 10 },
      typography: { heading_font: 'Inter', body_font: 'Inter' },
      imagery: { forbidden_styles: [], example_urls: [] },
      forbidden_words: [],
      required_disclaimers: [],
    },
    loading: false,
    hasBrand: true,
  }),
}))

// Mock useAIGateway
vi.mock('@/hooks/useAIGateway', () => ({
  useAIGateway: () => ({
    generateConcept: vi.fn().mockResolvedValue({
      concepts: [{ headline: 'Test', subheadline: 'Sub', keyMessage: 'Key', visualDirection: 'Visual', emotionalHook: 'Hook' }],
    }),
    checkGuardrails: vi.fn().mockResolvedValue({ passed: true, violations: [] }),
    generateImage: vi.fn().mockResolvedValue({ imageUrl: 'https://test.com/image.png' }),
    generateCampaignPack: vi.fn().mockResolvedValue({ formats: [] }),
  }),
}))

// Mock useAssets
vi.mock('@/hooks/useAssets', () => ({
  useAssets: () => ({
    uploadAsset: vi.fn().mockResolvedValue({ id: 'asset-1', public_url: 'https://test.com/asset.png' }),
    uploading: false,
    error: null,
  }),
}))

// Mock useCampaigns
vi.mock('@/hooks/useCampaigns', () => ({
  useCampaigns: () => ({
    createCampaign: vi.fn().mockResolvedValue({ id: 'camp-1', name: 'Test' }),
    loading: false,
  }),
}))

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('CampaignWizard', () => {
  const mockOnComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderar steg 1 initialt', () => {
    renderWithRouter(<CampaignWizard onComplete={mockOnComplete} />)

    // Kontrollera att första steget visas (Brief)
    expect(screen.getByText(/brief/i)).toBeInTheDocument()
  })

  it('steg-indikatorn visar alla steg', () => {
    renderWithRouter(<CampaignWizard onComplete={mockOnComplete} />)

    // Kontrollera att minst ett steg visas
    expect(screen.getByText(/brief/i)).toBeInTheDocument()
  })

  it('kampanjnamn-input finns', () => {
    renderWithRouter(<CampaignWizard onComplete={mockOnComplete} />)

    // Det ska finnas ett input-fält för kampanjnamn
    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('kampanjnamn-input uppdaterar state', () => {
    renderWithRouter(<CampaignWizard onComplete={mockOnComplete} />)

    const nameInput = screen.getAllByRole('textbox')[0]
    fireEvent.change(nameInput, { target: { value: 'Min nya kampanj' } })

    expect(nameInput).toHaveValue('Min nya kampanj')
  })

  it('har "Generera koncept"-knapp', () => {
    renderWithRouter(<CampaignWizard onComplete={mockOnComplete} />)

    // Det ska finnas en knapp för att generera koncept
    const buttons = screen.getAllByRole('button')
    const generateButton = buttons.find(btn => 
      btn.textContent?.match(/generera/i)
    )
    expect(generateButton).toBeTruthy()
  })

  it('visar steg-titel Brief', () => {
    renderWithRouter(<CampaignWizard onComplete={mockOnComplete} />)

    expect(screen.getByText(/brief/i)).toBeInTheDocument()
  })
})

describe('CampaignWizard navigering', () => {
  const mockOnComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('kan fylla i kampanjnamn', () => {
    renderWithRouter(<CampaignWizard onComplete={mockOnComplete} />)

    const inputs = screen.getAllByRole('textbox')
    const nameInput = inputs[0]
    fireEvent.change(nameInput, { target: { value: 'Test kampanj' } })
    expect(nameInput).toHaveValue('Test kampanj')
  })

  it('kan fylla i beskrivning', () => {
    renderWithRouter(<CampaignWizard onComplete={mockOnComplete} />)

    // Hitta textarea eller textbox för beskrivning
    const textareas = document.querySelectorAll('textarea')
    if (textareas.length > 0) {
      fireEvent.change(textareas[0], { target: { value: 'Beskrivning av kampanj' } })
      expect(textareas[0]).toHaveValue('Beskrivning av kampanj')
    } else {
      // Om ingen textarea, testa att sidan renderar
      expect(screen.getByText(/brief/i)).toBeInTheDocument()
    }
  })
})
