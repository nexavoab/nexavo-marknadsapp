/**
 * AI Gateway Hook
 * Wrapper för Supabase edge functions som hanterar AI-operationer
 */

import { supabase } from '@/lib/supabase'
import type { BrandContextForAI } from '@/lib/brandContextAdapter'

/**
 * Anropar en Supabase edge function med typat svar
 */
export async function callAIGateway<T>(functionName: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
  })

  if (error) {
    throw new Error(`AI Gateway error: ${error.message}`)
  }

  return data as T
}

// ============ Response Types ============

export interface ConceptResponse {
  concepts: Array<{
    headline: string
    subheadline: string
    keyMessage: string
    visualDirection: string
    emotionalHook: string
  }>
}

export interface CampaignPackResponse {
  brief: Record<string, string>
  concept: Record<string, string>
  formats: Array<{
    type: string
    copy: string
    headline: string
    cta: string
    image_prompt: string
    character_count: number
  }>
}

export interface ImageResponse {
  imageUrl: string
  revisedPrompt: string
}

export interface GuardrailsResponse {
  passed: boolean
  has_errors: boolean
  has_warnings: boolean
  violations: Array<{
    type: string
    found: string
    severity: 'critical' | 'high' | 'medium' | 'low'
    suggestion: string
  }>
}

// ============ Payload Types ============

export interface GenerateConceptPayload {
  brandContext: BrandContextForAI
  campaignBrief: string
  targetChannels: string[]
}

export interface GenerateCampaignPackPayload {
  brandContext: BrandContextForAI
  concept: Record<string, unknown>
  formats: string[]
}

export interface GenerateImagePayload {
  prompt: string
  brandContext: BrandContextForAI
  format: string
  size?: '1024x1024' | '1792x1024' | '1024x1792'
}

export interface CheckGuardrailsPayload {
  content: string
  brandContext: BrandContextForAI
}

// ============ Hook ============

export function useAIGateway() {
  /**
   * Genererar kampanjkoncept baserat på brand context och brief
   * Edge function: generate-concept
   */
  async function generateConcept(payload: GenerateConceptPayload): Promise<ConceptResponse> {
    return callAIGateway<ConceptResponse>('generate-concept', payload as unknown as Record<string, unknown>)
  }

  /**
   * Genererar komplett kampanjpaket med copy för olika format
   * Edge function: generate-campaign-pack
   */
  async function generateCampaignPack(payload: GenerateCampaignPackPayload): Promise<CampaignPackResponse> {
    return callAIGateway<CampaignPackResponse>('generate-campaign-pack', payload as unknown as Record<string, unknown>)
  }

  /**
   * Genererar en bild baserat på prompt och brand context
   * Edge function: generate-image
   */
  async function generateImage(payload: GenerateImagePayload): Promise<ImageResponse> {
    return callAIGateway<ImageResponse>('generate-image', payload as unknown as Record<string, unknown>)
  }

  /**
   * Kontrollerar innehåll mot brand guardrails (förbjudna ord, etc.)
   * Edge function: check-brand-guardrails
   */
  async function checkGuardrails(payload: CheckGuardrailsPayload): Promise<GuardrailsResponse> {
    return callAIGateway<GuardrailsResponse>('check-brand-guardrails', payload as unknown as Record<string, unknown>)
  }

  return {
    generateConcept,
    generateCampaignPack,
    generateImage,
    checkGuardrails,
    // Exponera även den generiska funktionen för custom calls
    callAIGateway,
  }
}
