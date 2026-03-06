import { describe, it, expect } from 'vitest'
import { adaptBrandForAI } from '@/lib/brandContextAdapter'
import type { Brand } from '@/types'

const mockBrand: Brand = {
  id: 'brand-1',
  organization_id: 'org-1',
  name: 'TestBrand',
  tone_traits: { formality: 0.8, modernity: 0.6, emotion: 0.3, volume: 0.7 },
  colors: { primary: '#2563EB', secondary: '#1E40AF' },
  logos: { primary_url: 'https://test.com/logo.png', min_size_px: 24, safe_zone_percent: 10 },
  typography: { heading_font: 'Inter', body_font: 'Inter' },
  imagery: { forbidden_styles: ['cartoon'], example_urls: [] },
  forbidden_words: ['billig', 'gratis'],
  required_disclaimers: [],
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
}

describe('adaptBrandForAI', () => {
  it('mappar brand_id korrekt', () => {
    const result = adaptBrandForAI(mockBrand)
    expect(result.brand_id).toBe('brand-1')
  })

  it('mappar name korrekt', () => {
    const result = adaptBrandForAI(mockBrand)
    expect(result.name).toBe('TestBrand')
  })

  it('mappar tone_traits korrekt', () => {
    const result = adaptBrandForAI(mockBrand)
    expect(result.tone_of_voice.traits.formality).toBe(0.8)
    expect(result.tone_of_voice.traits.modernity).toBe(0.6)
  })

  it('bygger tone description för formell ton', () => {
    const result = adaptBrandForAI(mockBrand)
    expect(result.tone_of_voice.description).toContain('formell')
  })

  it('mappar primärfärg korrekt', () => {
    const result = adaptBrandForAI(mockBrand)
    expect(result.visual.primary_color).toBe('#2563EB')
  })

  it('mappar logo_url korrekt', () => {
    const result = adaptBrandForAI(mockBrand)
    expect(result.visual.logo_url).toBe('https://test.com/logo.png')
  })

  it('mappar forbidden_words till guardrails', () => {
    const result = adaptBrandForAI(mockBrand)
    expect(result.guardrails.forbidden_words).toContain('billig')
    expect(result.guardrails.forbidden_words).toContain('gratis')
  })

  it('hanterar saknade optional fält', () => {
    const brandMinimal: Brand = { ...mockBrand, colors: { primary: '#000' } }
    const result = adaptBrandForAI(brandMinimal)
    expect(result.visual.secondary_color).toBeUndefined()
    expect(result.visual.accent_color).toBeUndefined()
  })
})
