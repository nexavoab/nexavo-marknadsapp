/**
 * Brand Context Adapter
 * Mappar vår Brand-typ till det format som Supabase edge functions förväntar sig
 */

import type { Brand, ToneTraits } from '@/types'

export interface BrandContextForAI {
  brand_id: string
  name: string
  positioning: {
    statement: string
    target_audience: string
    unique_value: string
  }
  tone_of_voice: {
    traits: {
      formality: number
      modernity: number
      emotion: number
      volume: number
    }
    description: string
  }
  visual: {
    primary_color: string
    secondary_color?: string
    accent_color?: string
    logo_url: string
    font_heading: string
    font_body: string
    imagery_style?: string
  }
  guardrails: {
    forbidden_words: string[]
    required_disclaimers: string[]
    forbidden_image_styles: string[]
  }
}

/**
 * Adapterar en Brand till BrandContextForAI-formatet för edge functions
 */
export function adaptBrandForAI(brand: Brand): BrandContextForAI {
  return {
    brand_id: brand.id,
    name: brand.name,
    positioning: {
      statement: `${brand.name} är ett varumärke som erbjuder kvalitativa tjänster.`,
      target_audience: 'Franchisekedjans kunder',
      unique_value: brand.name,
    },
    tone_of_voice: {
      traits: brand.tone_traits,
      description: buildToneDescription(brand.tone_traits),
    },
    visual: {
      primary_color: brand.colors.primary,
      secondary_color: brand.colors.secondary ?? undefined,
      accent_color: brand.colors.accent ?? undefined,
      logo_url: brand.logos.primary_url,
      font_heading: brand.typography.heading_font,
      font_body: brand.typography.body_font,
      imagery_style: brand.imagery.style_description ?? undefined,
    },
    guardrails: {
      forbidden_words: brand.forbidden_words,
      required_disclaimers: brand.required_disclaimers,
      forbidden_image_styles: brand.imagery.forbidden_styles,
    },
  }
}

/**
 * Bygger en läsbar beskrivning av tonaliteten baserat på traits
 */
function buildToneDescription(traits: ToneTraits): string {
  const parts: string[] = []

  if (traits.formality > 0.6) parts.push('formell')
  else if (traits.formality < 0.4) parts.push('avslappnad')

  if (traits.modernity > 0.6) parts.push('modern')
  else if (traits.modernity < 0.4) parts.push('klassisk')

  if (traits.emotion > 0.6) parts.push('varm och personlig')
  else if (traits.emotion < 0.4) parts.push('saklig')

  if (traits.volume > 0.6) parts.push('tydlig och bestämd')
  else if (traits.volume < 0.4) parts.push('subtil')

  return parts.length > 0
    ? `Tonen är ${parts.join(', ')}.`
    : 'Balanserad och professionell ton.'
}
