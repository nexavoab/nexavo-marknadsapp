/**
 * useBrandGuardian - AI Brand Guardian auto-approve hook
 * 
 * Checks campaign content against brand guardrails before HQ approval.
 * Score thresholds:
 *   ≥85: Auto-approve (green)
 *   70-84: Manual review required (yellow)
 *   <70: Blocked (red)
 */

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Campaign, Brand } from '@/types'

interface Violation {
  guardrail_id: string
  guardrail_name: string
  severity: 'error' | 'warning' | 'info'
  message: string
  details?: string[]
}

interface GuardrailCheckResponse {
  passed: boolean
  has_errors: boolean
  has_warnings: boolean
  violations: Violation[]
  checked_guardrails: number
}

export interface BrandGuardianResult {
  approved: boolean
  score: number
  issues: string[]
  autoApproved: boolean
  blocked: boolean
  violations: Violation[]
}

// Score penalties per violation severity
const SEVERITY_PENALTIES = {
  error: 15,
  warning: 8,
  info: 3,
}

// Score thresholds
export const SCORE_THRESHOLDS = {
  AUTO_APPROVE: 85,  // ≥85 = auto-approve
  MANUAL_MIN: 70,    // 70-84 = manual review
  BLOCKED: 70,       // <70 = blocked
}

/**
 * Calculate score from violations
 * Starts at 100, subtracts penalties per violation severity
 */
function calculateScore(violations: Violation[]): number {
  let score = 100
  
  for (const violation of violations) {
    score -= SEVERITY_PENALTIES[violation.severity] || 5
  }
  
  return Math.max(0, Math.min(100, score))
}

/**
 * Format violations as human-readable issues
 */
function formatIssues(violations: Violation[]): string[] {
  return violations.map(v => {
    const prefix = v.severity === 'error' ? '❌' : v.severity === 'warning' ? '⚠️' : 'ℹ️'
    return `${prefix} ${v.message}`
  })
}

export function useBrandGuardian() {
  const [isChecking, setIsChecking] = useState(false)
  const [lastResult, setLastResult] = useState<BrandGuardianResult | null>(null)

  /**
   * Check campaign content against brand guardrails
   */
  const checkAndApprove = async (
    campaign: Campaign,
    brand: Brand | null
  ): Promise<BrandGuardianResult> => {
    setIsChecking(true)
    
    try {
      // Build content string from campaign fields
      const contentParts = [
        campaign.name,
        campaign.description || '',
        ...(campaign.key_messages || []),
      ].filter(Boolean)
      
      const content = contentParts.join(' | ')
      
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke<GuardrailCheckResponse>(
        'check-brand-guardrails',
        {
          body: {
            brand_id: brand?.id,
            content,
            content_type: 'campaign',
          },
        }
      )
      
      if (error) {
        console.error('[BrandGuardian] Edge function error:', error)
        // Fallback: allow manual approval on error
        return {
          approved: false,
          score: 0,
          issues: [`Edge Function-fel: ${error.message}. Manuell granskning krävs.`],
          autoApproved: false,
          blocked: false,
          violations: [],
        }
      }
      
      const violations = data?.violations ?? []
      const score = calculateScore(violations)
      const autoApproved = score >= SCORE_THRESHOLDS.AUTO_APPROVE
      const blocked = score < SCORE_THRESHOLDS.BLOCKED
      
      const result: BrandGuardianResult = {
        approved: autoApproved,
        score,
        issues: formatIssues(violations),
        autoApproved,
        blocked,
        violations,
      }
      
      setLastResult(result)
      return result
      
    } catch (err) {
      console.error('[BrandGuardian] Unexpected error:', err)
      // Fallback: allow manual approval on error
      return {
        approved: false,
        score: 0,
        issues: [`Oväntat fel: ${err instanceof Error ? err.message : 'Okänt fel'}. Manuell granskning krävs.`],
        autoApproved: false,
        blocked: false,
        violations: [],
      }
    } finally {
      setIsChecking(false)
    }
  }

  /**
   * Get score color based on thresholds
   */
  const getScoreColor = (score: number): 'green' | 'yellow' | 'red' => {
    if (score >= SCORE_THRESHOLDS.AUTO_APPROVE) return 'green'
    if (score >= SCORE_THRESHOLDS.BLOCKED) return 'yellow'
    return 'red'
  }

  /**
   * Get score badge CSS classes
   */
  const getScoreBadgeClasses = (score: number): string => {
    const color = getScoreColor(score)
    switch (color) {
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'red':
        return 'bg-red-100 text-red-800 border-red-200'
    }
  }

  return {
    checkAndApprove,
    isChecking,
    lastResult,
    getScoreColor,
    getScoreBadgeClasses,
    SCORE_THRESHOLDS,
  }
}
