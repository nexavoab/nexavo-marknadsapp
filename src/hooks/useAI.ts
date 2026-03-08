import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export type AITier = 'none' | 'basic' | 'pro' | 'enterprise'
export type AIFeature = 'copy' | 'compliance' | 'chat' | 'image' | 'planning'

interface AIConfig {
  enabled: boolean
  tier: AITier
  creditsUsed: number
  creditsLimit: number
}

interface UseAIReturn extends AIConfig {
  loading: boolean
  error: Error | null
  hasCredits: boolean
  checkFeatureAccess: (feature: AIFeature) => boolean
  refetch: () => Promise<void>
}

// Feature → tier mapping
const FEATURE_TIER_MAP: Record<AIFeature, AITier[]> = {
  copy: ['basic', 'pro', 'enterprise'],
  compliance: ['basic', 'pro', 'enterprise'],
  chat: ['basic', 'pro', 'enterprise'],
  image: ['pro', 'enterprise'],
  planning: ['pro', 'enterprise'],
}

export function useAI(): UseAIReturn {
  const { appUser } = useAuth()
  const [config, setConfig] = useState<AIConfig>({
    enabled: false,
    tier: 'none',
    creditsUsed: 0,
    creditsLimit: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchAIConfig = useCallback(async () => {
    if (!appUser?.organization_id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('ai_enabled, ai_tier, ai_credits_used, ai_credits_limit')
        .eq('id', appUser.organization_id)
        .single()

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      if (data) {
        setConfig({
          enabled: data.ai_enabled ?? false,
          tier: (data.ai_tier as AITier) ?? 'none',
          creditsUsed: data.ai_credits_used ?? 0,
          creditsLimit: data.ai_credits_limit ?? 0,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch AI config'))
    } finally {
      setLoading(false)
    }
  }, [appUser?.organization_id])

  useEffect(() => {
    fetchAIConfig()
  }, [fetchAIConfig])

  const hasCredits = useMemo(() => {
    if (!config.enabled) return false
    if (config.creditsLimit === 0) return true // Unlimited
    return config.creditsUsed < config.creditsLimit
  }, [config.enabled, config.creditsUsed, config.creditsLimit])

  const checkFeatureAccess = useCallback(
    (feature: AIFeature): boolean => {
      if (!config.enabled) return false
      if (!hasCredits) return false

      const allowedTiers = FEATURE_TIER_MAP[feature]
      return allowedTiers.includes(config.tier)
    },
    [config.enabled, config.tier, hasCredits]
  )

  return {
    ...config,
    loading,
    error,
    hasCredits,
    checkFeatureAccess,
    refetch: fetchAIConfig,
  }
}
