import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react'

interface KPICardProps {
  label: string
  description: string
  value: number | null
  loading: boolean
  trend?: number // Percentage change, positive = up, negative = down
  trendLabel?: string
  icon?: React.ElementType
  details?: {
    title: string
    content: React.ReactNode
  }
  emptyState?: {
    message: string
    ctaLabel: string
    onAction: () => void
  }
}

export function KPICard({
  label,
  description,
  value,
  loading,
  trend,
  trendLabel = 'vs föregående månad',
  icon: Icon,
  details,
  emptyState,
}: KPICardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const displayValue = loading ? null : (value ?? 0)
  const isZero = displayValue === 0 && emptyState

  // Determine trend direction and styling
  const getTrendConfig = () => {
    if (trend === undefined || trend === null) return null
    if (trend > 0) {
      return {
        icon: TrendingUp,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        prefix: '+',
      }
    }
    if (trend < 0) {
      return {
        icon: TrendingDown,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        prefix: '',
      }
    }
    return {
      icon: Minus,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      prefix: '',
    }
  }

  const trendConfig = getTrendConfig()

  return (
    <>
      <Card
        className={cn(
          'p-5 border border-border/60 shadow-sm rounded-xl transition-all',
          details && 'cursor-pointer hover:border-primary/30 hover:shadow-md'
        )}
        onClick={() => details && setShowDetails(true)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
          {Icon && (
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>

        {displayValue === null ? (
          <div className="h-9 w-28 bg-muted animate-pulse rounded mb-2" />
        ) : isZero ? (
          // Empty state with CTA
          <div className="mt-2">
            <p className="text-sm text-muted-foreground mb-2">
              {emptyState.message}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="group"
              onClick={(e) => {
                e.stopPropagation()
                emptyState.onAction()
              }}
            >
              {emptyState.ctaLabel}
              <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        ) : (
          <>
            <div className="text-3xl font-bold text-foreground mb-1">
              {displayValue.toLocaleString('sv-SE')}
            </div>

            {trendConfig && (
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
                    trendConfig.bgColor,
                    trendConfig.color
                  )}
                >
                  <trendConfig.icon className="h-3 w-3" />
                  {trendConfig.prefix}{Math.abs(trend!)}%
                </div>
                <span className="text-xs text-muted-foreground">{trendLabel}</span>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Details Dialog */}
      {details && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{details.title}</DialogTitle>
              <DialogDescription className="sr-only">
                Detaljerad information om {label}
              </DialogDescription>
            </DialogHeader>
            {details.content}
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
