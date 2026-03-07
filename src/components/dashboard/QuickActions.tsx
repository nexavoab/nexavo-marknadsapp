import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Users,
  Palette,
  Plus,
  FileText,
} from 'lucide-react'

interface QuickAction {
  id: string
  label: string
  icon: React.ElementType
  onClick: () => void
  variant?: 'default' | 'primary'
  highlight?: boolean
}

interface QuickActionsProps {
  actions: QuickAction[]
  className?: string
}

export function QuickActions({ actions, className }: QuickActionsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {actions.map((action) => (
        <Button
          key={action.id}
          variant={action.variant === 'primary' ? 'default' : 'outline'}
          size="sm"
          onClick={action.onClick}
          className={cn(
            'gap-2',
            action.highlight &&
              'border-primary text-primary hover:bg-primary/10'
          )}
        >
          <action.icon className="h-4 w-4" />
          {action.label}
        </Button>
      ))}
    </div>
  )
}

// Factory function to create context-aware quick actions
export function createContextualQuickActions(
  navigate: (path: string) => void,
  context: {
    hasFranchisees: boolean
    hasCampaigns: boolean
    hasBrand: boolean
  }
): QuickAction[] {
  const actions: QuickAction[] = []

  // Priority actions based on context
  if (!context.hasFranchisees) {
    actions.push({
      id: 'invite-franchisee',
      label: 'Bjud in franchisetagare',
      icon: Users,
      onClick: () => navigate('/hq/franchisees'),
      variant: 'primary',
      highlight: true,
    })
  }

  if (!context.hasBrand) {
    actions.push({
      id: 'complete-brand',
      label: 'Komplettera varumärke',
      icon: Palette,
      onClick: () => navigate('/hq/brand'),
      variant: 'primary',
      highlight: true,
    })
  }

  // Always available actions
  actions.push({
    id: 'new-campaign',
    label: 'Ny kampanj',
    icon: Plus,
    onClick: () => navigate('/hq/campaigns/new'),
    variant: context.hasCampaigns ? 'default' : 'primary',
  })

  actions.push({
    id: 'view-assets',
    label: 'Materialbank',
    icon: FileText,
    onClick: () => navigate('/hq/assets'),
  })

  if (context.hasFranchisees) {
    actions.push({
      id: 'manage-franchisees',
      label: 'Franchisetagare',
      icon: Users,
      onClick: () => navigate('/hq/franchisees'),
    })
  }

  return actions
}
