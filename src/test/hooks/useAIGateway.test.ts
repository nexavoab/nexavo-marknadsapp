import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAIGateway, callAIGateway } from '@/hooks/useAIGateway'
import { supabase } from '@/lib/supabase'
import type { BrandContextForAI } from '@/lib/brandContextAdapter'

const mockBrandContext: BrandContextForAI = {
  brand_id: 'brand-1',
  name: 'TestBrand',
  positioning: {
    statement: 'Test statement',
    target_audience: 'Test audience',
    unique_value: 'Test value',
  },
  tone_of_voice: {
    traits: { formality: 0.5, modernity: 0.5, emotion: 0.5, volume: 0.5 },
    description: 'Test tone',
  },
  visual: {
    primary_color: '#2563EB',
    logo_url: 'https://test.com/logo.png',
    font_heading: 'Inter',
    font_body: 'Inter',
  },
  guardrails: {
    forbidden_words: [],
    required_disclaimers: [],
    forbidden_image_styles: [],
  },
}

describe('useAIGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateConcept()', () => {
    it('anropar supabase.functions.invoke("generate-concept")', async () => {
      const mockResponse = {
        concepts: [
          {
            headline: 'Test headline',
            subheadline: 'Test sub',
            keyMessage: 'Key',
            visualDirection: 'Visual',
            emotionalHook: 'Hook',
          },
        ],
      }
      
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      })

      const { result } = renderHook(() => useAIGateway())

      let response
      await act(async () => {
        response = await result.current.generateConcept({
          brandContext: mockBrandContext,
          campaignBrief: 'Test brief',
          targetChannels: ['facebook'],
        })
      })

      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-concept', {
        body: {
          brandContext: mockBrandContext,
          campaignBrief: 'Test brief',
          targetChannels: ['facebook'],
        },
      })
      expect(response).toEqual(mockResponse)
    })
  })

  describe('checkGuardrails()', () => {
    it('anropar supabase.functions.invoke("check-brand-guardrails")', async () => {
      const mockResponse = {
        passed: true,
        has_errors: false,
        has_warnings: false,
        violations: [],
      }
      
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      })

      const { result } = renderHook(() => useAIGateway())

      let response
      await act(async () => {
        response = await result.current.checkGuardrails({
          content: 'Test content',
          brandContext: mockBrandContext,
        })
      })

      expect(supabase.functions.invoke).toHaveBeenCalledWith('check-brand-guardrails', {
        body: {
          content: 'Test content',
          brandContext: mockBrandContext,
        },
      })
      expect(response).toEqual(mockResponse)
    })
  })

  describe('generateImage()', () => {
    it('anropar supabase.functions.invoke("generate-image")', async () => {
      const mockResponse = {
        imageUrl: 'https://test.com/image.png',
        revisedPrompt: 'Revised prompt',
      }
      
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      })

      const { result } = renderHook(() => useAIGateway())

      let response
      await act(async () => {
        response = await result.current.generateImage({
          prompt: 'A beautiful storefront',
          brandContext: mockBrandContext,
          format: 'facebook_feed',
        })
      })

      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-image', {
        body: expect.objectContaining({
          prompt: 'A beautiful storefront',
          format: 'facebook_feed',
        }),
      })
      expect(response).toEqual(mockResponse)
    })
  })

  describe('error handling', () => {
    it('kastar Error vid invoke-fel', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Function error' },
      })

      const { result } = renderHook(() => useAIGateway())

      await expect(
        result.current.generateConcept({
          brandContext: mockBrandContext,
          campaignBrief: 'Test',
          targetChannels: [],
        })
      ).rejects.toThrow('AI Gateway error: Function error')
    })
  })
})

describe('callAIGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returnerar data vid lyckad invoke', async () => {
    const mockData = { result: 'success' }
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: mockData,
      error: null,
    })

    const result = await callAIGateway('test-function', { key: 'value' })

    expect(supabase.functions.invoke).toHaveBeenCalledWith('test-function', {
      body: { key: 'value' },
    })
    expect(result).toEqual(mockData)
  })

  it('kastar Error vid invoke-fel', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { message: 'Network failure' },
    })

    await expect(callAIGateway('test-function', {})).rejects.toThrow(
      'AI Gateway error: Network failure'
    )
  })
})
