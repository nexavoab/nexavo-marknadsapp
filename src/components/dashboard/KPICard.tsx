import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface KPICardProps {
  label: string
  value: number | null
  loading: boolean
  trend?: number // Percentage change
  trendLabel?: string
  icon?: React.ElementType
  format?: 'number' | 'currency' | 'percent'
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
  value,
  loading,
  trend,
  trendLabel = 'Compared to last month',
  icon: Icon,
  format = 'number',
  details,
  emptyState,
}: KPICardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const displayValue = loading ? null : (value ?? 0)
  const isZero = displayValue === 0 && emptyState

  // Format value
  const formatValue = (val: number) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(val)
    }
    if (format === 'percent') {
      return `${val}%`
    }
    return val.toLocaleString('sv-SE')
  }

  // Trend config
  const isPositive = trend !== undefined && trend > 0
  const isNegative = trend !== undefined && trend < 0

  return (
    <>
      <div
        className={cn(
          'bg-background rounded-xl p-5 shadow-sm transition-all',
          details && 'cursor-pointer hover:shadow-md'
        )}
        onClick={() => details && setShowDetails(true)}
      >
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          {Icon && (
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-4.5 w-4.5 text-primary" />
            </div>
          )}
        </div>

        {displayValue === null ? (
          <div className="h-9 w-28 bg-muted animate-pulse rounded mb-2" />
        ) : isZero ? (
          <div className="mt-1">
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
            <div className="text-3xl font-bold text-foreground mb-2">
              {formatValue(displayValue)}
            </div>

            {trend !== undefined && (
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
                    isPositive && 'bg-green-100 text-green-700',
                    isNegative && 'bg-red-100 text-red-600',
                    !isPositive && !isNegative && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isPositive && <TrendingUp className="h-3 w-3" />}
                  {isNegative && <TrendingDown className="h-3 w-3" />}
                  {isPositive && '+'}
                  {Math.abs(trend).toFixed(2)}%
                </span>
                <span className="text-xs text-muted-foreground">{trendLabel}</span>
              </div>
            )}
          </>
        )}
      </div>

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
