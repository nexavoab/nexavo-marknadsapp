import type { ReactNode } from 'react'
import { useAI, type AIFeature } from '@/hooks/useAI'
import { AIUpsellBanner } from './AIUpsellBanner'
import { AILoadingState } from './AILoadingState'

interface AIFeatureGateProps {
  feature: AIFeature
  fallback?: ReactNode
  children: ReactNode
}

export function AIFeatureGate({ feature, fallback, children }: AIFeatureGateProps) {
  const { checkFeatureAccess, loading } = useAI()

  if (loading) {
    return <AILoadingState />
  }

  const hasAccess = checkFeatureAccess(feature)

  if (!hasAccess) {
    return <>{fallback ?? <AIUpsellBanner feature={feature} />}</>
  }

  return <>{children}</>
}
