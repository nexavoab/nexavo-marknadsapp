import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCampaigns } from '@/hooks/useCampaigns'
import { supabase } from '@/lib/supabase'

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    appUser: { id: 'user-1', organization_id: 'org-1', role: 'hq_admin' },
  }),
}))

describe('useCampaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchCampaigns() filtrerar på organization_id', async () => {
    const mockCampaigns = [
      { id: 'camp-1', name: 'Kampanj 1', organization_id: 'org-1' },
      { id: 'camp-2', name: 'Kampanj 2', organization_id: 'org-1' },
    ]
    
    const orderMock = vi.fn().mockResolvedValue({ data: mockCampaigns, error: null })
    const eqMock = vi.fn().mockReturnValue({ order: orderMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never)

    const { result } = renderHook(() => useCampaigns())

    let campaigns
    await act(async () => {
      campaigns = await result.current.fetchCampaigns()
    })

    expect(supabase.from).toHaveBeenCalledWith('campaigns')
    expect(selectMock).toHaveBeenCalledWith('*')
    expect(eqMock).toHaveBeenCalledWith('organization_id', 'org-1')
    expect(campaigns).toEqual(mockCampaigns)
  })

  it('createCampaign() sätter status "draft"', async () => {
    const newCampaign = { id: 'new-camp', name: 'Ny kampanj', status: 'draft' }
    
    const singleMock = vi.fn().mockResolvedValue({ data: newCampaign, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const insertMock = vi.fn().mockReturnValue({ select: selectMock })
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as never)

    const { result } = renderHook(() => useCampaigns())

    let campaign
    await act(async () => {
      campaign = await result.current.createCampaign({
        name: 'Ny kampanj',
        channels: ['facebook'],
      })
    })

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ny kampanj',
        status: 'draft',
        organization_id: 'org-1',
        created_by: 'user-1',
      })
    )
    expect(campaign).toEqual(newCampaign)
  })

  it('updateCampaignStatus() uppdaterar korrekt', async () => {
    const eqOrgMock = vi.fn().mockResolvedValue({ error: null })
    const eqIdMock = vi.fn().mockReturnValue({ eq: eqOrgMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock })
    vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as never)

    const { result } = renderHook(() => useCampaigns())

    await act(async () => {
      await result.current.updateCampaignStatus('camp-1', 'active')
    })

    expect(supabase.from).toHaveBeenCalledWith('campaigns')
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', updated_at: expect.any(String) })
    )
    expect(eqIdMock).toHaveBeenCalledWith('id', 'camp-1')
    expect(eqOrgMock).toHaveBeenCalledWith('organization_id', 'org-1')
  })

  it('fetchCampaign() hämtar enskild kampanj', async () => {
    const mockCampaign = { id: 'camp-1', name: 'Kampanj 1' }
    
    const singleMock = vi.fn().mockResolvedValue({ data: mockCampaign, error: null })
    const eqOrgMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqIdMock = vi.fn().mockReturnValue({ eq: eqOrgMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqIdMock })
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never)

    const { result } = renderHook(() => useCampaigns())

    let campaign
    await act(async () => {
      campaign = await result.current.fetchCampaign('camp-1')
    })

    expect(eqIdMock).toHaveBeenCalledWith('id', 'camp-1')
    expect(campaign).toEqual(mockCampaign)
  })

  it('fetchCampaign() returnerar null om ej hittad', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    const eqOrgMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqIdMock = vi.fn().mockReturnValue({ eq: eqOrgMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqIdMock })
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never)

    const { result } = renderHook(() => useCampaigns())

    let campaign
    await act(async () => {
      campaign = await result.current.fetchCampaign('nonexistent')
    })

    expect(campaign).toBeNull()
  })
})
