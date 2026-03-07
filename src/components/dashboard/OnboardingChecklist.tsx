import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  Users,
  Megaphone,
  Palette,
  Link,
  Check,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'

interface OnboardingStep {
  id: string
  label: string
  description: string
  icon: React.ElementType
  completed: boolean
  action: () => void
  actionLabel: string
}

interface OnboardingChecklistProps {
  steps: OnboardingStep[]
  onDismiss?: () => void
}

const STORAGE_KEY = 'nexavo_onboarding_completed'
const DISMISSED_KEY = 'nexavo_onboarding_dismissed'

export function useOnboardingState() {
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (stored) {
      try {
        setCompletedSteps(JSON.parse(stored))
      } catch {
        // Invalid JSON, reset
      }
    }
    if (dismissed === 'true') {
      setIsDismissed(true)
    }
  }, [])

  const markComplete = (stepId: string) => {
    setCompletedSteps((prev) => {
      const updated = [...prev, stepId]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const dismiss = () => {
    setIsDismissed(true)
    localStorage.setItem(DISMISSED_KEY, 'true')
  }

  return { completedSteps, markComplete, isDismissed, dismiss }
}

export function OnboardingChecklist({
  steps,
  onDismiss,
}: OnboardingChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const completedCount = steps.filter((s) => s.completed).length
  const progress = (completedCount / steps.length) * 100
  const allComplete = completedCount === steps.length

  if (allComplete) {
    return null
  }

  return (
    <Card className="p-4 border-primary/20 bg-primary/5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">
              Kom igång med Nexavo
            </h3>
            <span className="text-xs text-muted-foreground">
              {completedCount}/{steps.length} klara
            </span>
          </div>
          <Progress value={progress} className="h-1.5 mt-2" />
        </div>
        <div className="flex items-center gap-1 ml-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-2 mt-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg transition-colors',
                step.completed
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-background border border-border hover:border-primary/30'
              )}
            >
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                  step.completed
                    ? 'bg-green-100 text-green-600'
                    : 'bg-primary/10 text-primary'
                )}
              >
                {step.completed ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <step.icon className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.completed
                      ? 'text-green-700 line-through'
                      : 'text-foreground'
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {step.description}
                </p>
              </div>
              {!step.completed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={step.action}
                  className="shrink-0"
                >
                  {step.actionLabel}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// Default steps factory
export function createDefaultOnboardingSteps(
  completedSteps: string[],
  actions: {
    onInviteFranchisee: () => void
    onCreateCampaign: () => void
    onCompleteBrand: () => void
    onConnectIntegration: () => void
  },
  state: {
    hasFranchisees: boolean
    hasCampaigns: boolean
    hasBrand: boolean
    hasIntegration: boolean
  }
): OnboardingStep[] {
  return [
    {
      id: 'invite-franchisee',
      label: 'Bjud in franchisetagare',
      description: 'Lägg till din första franchisetagare',
      icon: Users,
      completed: state.hasFranchisees || completedSteps.includes('invite-franchisee'),
      action: actions.onInviteFranchisee,
      actionLabel: 'Bjud in',
    },
    {
      id: 'create-campaign',
      label: 'Skapa din första kampanj',
      description: 'Skapa marknadsföringsmaterial',
      icon: Megaphone,
      completed: state.hasCampaigns || completedSteps.includes('create-campaign'),
      action: actions.onCreateCampaign,
      actionLabel: 'Skapa',
    },
    {
      id: 'complete-brand',
      label: 'Komplettera varumärke',
      description: 'Lägg till logotyp och färger',
      icon: Palette,
      completed: state.hasBrand || completedSteps.includes('complete-brand'),
      action: actions.onCompleteBrand,
      actionLabel: 'Redigera',
    },
    {
      id: 'connect-integration',
      label: 'Anslut integration',
      description: 'Koppla ihop med dina verktyg',
      icon: Link,
      completed: state.hasIntegration || completedSteps.includes('connect-integration'),
      action: actions.onConnectIntegration,
      actionLabel: 'Anslut',
    },
  ]
}
