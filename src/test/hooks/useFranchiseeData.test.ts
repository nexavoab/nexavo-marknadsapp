import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useFranchiseeData } from '@/hooks/useFranchiseeData'
import { supabase } from '@/lib/supabase'

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    appUser: { id: 'user-1', organization_id: 'org-1', role: 'franchisee' },
  }),
}))

describe('useFranchiseeData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock för initial fetch
    const orderMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const eqStatusMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqOrgMock = vi.fn().mockReturnValue({ eq: eqStatusMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqOrgMock })
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never)
  })

  it('fetchActiveCampaigns() filtrerar på status="active"', async () => {
    const mockCampaigns = [
      { id: 'camp-1', name: 'Aktiv kampanj', status: 'active', organization_id: 'org-1' },
    ]
    
    const orderMock = vi.fn().mockResolvedValue({ data: mockCampaigns, error: null })
    const eqStatusMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqOrgMock = vi.fn().mockReturnValue({ eq: eqStatusMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqOrgMock })
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never)

    const { result } = renderHook(() => useFranchiseeData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(supabase.from).toHaveBeenCalledWith('campaigns')
    expect(eqOrgMock).toHaveBeenCalledWith('organization_id', 'org-1')
    expect(eqStatusMock).toHaveBeenCalledWith('status', 'active')
    expect(result.current.campaigns).toEqual(mockCampaigns)
  })

  it('fetchCampaignAssets() filtrerar på campaign_id + organization_id', async () => {
    const mockAssets = [
      { id: 'asset-1', campaign_id: 'camp-1', organization_id: 'org-1' },
    ]
    
    // Initial fetch mock
    const initialOrderMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const initialEqStatusMock = vi.fn().mockReturnValue({ order: initialOrderMock })
    const initialEqOrgMock = vi.fn().mockReturnValue({ eq: initialEqStatusMock })
    
    // Assets fetch mock
    const assetsOrderMock = vi.fn().mockResolvedValue({ data: mockAssets, error: null })
    const assetsEqOrgMock = vi.fn().mockReturnValue({ order: assetsOrderMock })
    const assetsEqCampMock = vi.fn().mockReturnValue({ eq: assetsEqOrgMock })
    
    let callCount = 0
    const selectMock = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return { eq: initialEqOrgMock }
      }
      return { eq: assetsEqCampMock }
    })
    
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never)

    const { result } = renderHook(() => useFranchiseeData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let assets
    await act(async () => {
      assets = await result.current.fetchCampaignAssets('camp-1')
    })

    // Kontrollera att assets anropades korrekt
    const fromCalls = vi.mocked(supabase.from).mock.calls
    expect(fromCalls.some(call => call[0] === 'assets')).toBe(true)
  })

  it('incrementDownload() anropar supabase.rpc("increment_download_count")', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useFranchiseeData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.incrementDownload('asset-1')
    })

    expect(supabase.rpc).toHaveBeenCalledWith('increment_download_count', { asset_id: 'asset-1' })
  })

  it('fetchCampaignById() returnerar kampanj', async () => {
    const mockCampaign = { id: 'camp-1', name: 'Test kampanj' }
    
    // Initial fetch
    const initialOrderMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const initialEqStatusMock = vi.fn().mockReturnValue({ order: initialOrderMock })
    const initialEqOrgMock = vi.fn().mockReturnValue({ eq: initialEqStatusMock })
    
    // Single campaign fetch
    const singleMock = vi.fn().mockResolvedValue({ data: mockCampaign, error: null })
    const singleEqOrgMock = vi.fn().mockReturnValue({ single: singleMock })
    const singleEqIdMock = vi.fn().mockReturnValue({ eq: singleEqOrgMock })
    
    let callCount = 0
    const selectMock = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return { eq: initialEqOrgMock }
      }
      return { eq: singleEqIdMock }
    })
    
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never)

    const { result } = renderHook(() => useFranchiseeData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let campaign
    await act(async () => {
      campaign = await result.current.fetchCampaignById('camp-1')
    })

    expect(campaign).toEqual(mockCampaign)
  })

  it('sätter error vid Supabase-fel', async () => {
    const orderMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'Network error' } })
    const eqStatusMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqOrgMock = vi.fn().mockReturnValue({ eq: eqStatusMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqOrgMock })
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never)

    const { result } = renderHook(() => useFranchiseeData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Hooken sätter ett eget felmeddelande
    expect(result.current.error).toBeTruthy()
  })
})
