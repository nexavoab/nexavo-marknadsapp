import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useBrand } from '@/hooks/useBrand'
import { supabase } from '@/lib/supabase'

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    appUser: { id: 'user-1', organization_id: 'org-1', role: 'hq_admin' },
  }),
}))

describe('useBrand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchBrand() anropar supabase.from("brands").select().eq().single()', async () => {
    const mockBrand = { id: 'brand-1', name: 'TestBrand', organization_id: 'org-1' }
    const singleMock = vi.fn().mockResolvedValue({ data: mockBrand, error: null })
    const eqMock = vi.fn().mockReturnValue({ single: singleMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never)

    const { result } = renderHook(() => useBrand())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(supabase.from).toHaveBeenCalledWith('brands')
    expect(selectMock).toHaveBeenCalledWith('*')
    expect(eqMock).toHaveBeenCalledWith('organization_id', 'org-1')
    expect(singleMock).toHaveBeenCalled()
    expect(result.current.brand).toEqual(mockBrand)
  })

  it('saveBrand() kallar INSERT om ingen brand finns', async () => {
    // Först returnera ingen brand
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    const eqMock = vi.fn().mockReturnValue({ single: singleMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    
    // Mock för insert
    const insertSingleMock = vi.fn().mockResolvedValue({ data: { id: 'new-brand', name: 'NewBrand' }, error: null })
    const insertSelectMock = vi.fn().mockReturnValue({ single: insertSingleMock })
    const insertMock = vi.fn().mockReturnValue({ select: insertSelectMock })
    
    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      insert: insertMock,
    } as never)

    const { result } = renderHook(() => useBrand())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Ingen brand vid start
    expect(result.current.brand).toBe(null)

    // Anropa saveBrand
    await act(async () => {
      await result.current.saveBrand({ name: 'NewBrand' })
    })

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'NewBrand', organization_id: 'org-1' })
    )
  })

  it('saveBrand() kallar UPDATE om brand redan finns', async () => {
    const existingBrand = { id: 'brand-1', name: 'OldBrand', organization_id: 'org-1' }
    const singleMock = vi.fn().mockResolvedValue({ data: existingBrand, error: null })
    const eqMock = vi.fn().mockReturnValue({ single: singleMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    
    // Mock för update
    const updateSingleMock = vi.fn().mockResolvedValue({ data: { ...existingBrand, name: 'UpdatedBrand' }, error: null })
    const updateSelectMock = vi.fn().mockReturnValue({ single: updateSingleMock })
    const updateEqMock = vi.fn().mockReturnValue({ select: updateSelectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock })
    
    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      update: updateMock,
    } as never)

    const { result } = renderHook(() => useBrand())

    await waitFor(() => {
      expect(result.current.brand).toEqual(existingBrand)
    })

    await act(async () => {
      await result.current.saveBrand({ name: 'UpdatedBrand' })
    })

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'UpdatedBrand', updated_at: expect.any(String) })
    )
    expect(updateEqMock).toHaveBeenCalledWith('id', 'brand-1')
  })

  it('error state sätts vid Supabase-fel', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
    const eqMock = vi.fn().mockReturnValue({ single: singleMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never)

    const { result } = renderHook(() => useBrand())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Hooken hanterar felet och sätter error (antingen meddelande eller fallback)
    expect(result.current.error).toBeTruthy()
    expect(result.current.brand).toBe(null)
  })
})
