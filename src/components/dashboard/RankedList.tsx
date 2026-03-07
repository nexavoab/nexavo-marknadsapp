import { cn } from '@/lib/utils'

interface RankedItem {
  id: string
  name: string
  value: number
  subtext?: string
  badge?: {
    label: string
    variant: 'default' | 'success' | 'warning' | 'danger'
  }
}

interface RankedListProps {
  items: RankedItem[]
  loading?: boolean
  emptyMessage?: string
  valueLabel?: string
  onItemClick?: (item: RankedItem) => void
  showRank?: boolean
}

const badgeVariants = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
}

export function RankedList({
  items,
  loading = false,
  emptyMessage = 'Inga poster att visa',
  valueLabel,
  onItemClick,
  showRank = true,
}: RankedListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-6 w-6 bg-muted animate-pulse rounded" />
            <div className="flex-1">
              <div className="h-4 w-32 bg-muted animate-pulse rounded mb-1" />
              <div className="h-3 w-20 bg-muted/60 animate-pulse rounded" />
            </div>
            <div className="h-5 w-8 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <button
          key={item.id}
          className={cn(
            'w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors',
            onItemClick
              ? 'hover:bg-muted/60 cursor-pointer'
              : 'cursor-default'
          )}
          onClick={() => onItemClick?.(item)}
          disabled={!onItemClick}
        >
          {showRank && (
            <div
              className={cn(
                'h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
                index === 0
                  ? 'bg-amber-100 text-amber-700'
                  : index === 1
                  ? 'bg-slate-200 text-slate-700'
                  : index === 2
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {index + 1}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {item.name}
            </p>
            {item.subtext && (
              <p className="text-xs text-muted-foreground truncate">
                {item.subtext}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {item.badge && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium',
                  badgeVariants[item.badge.variant]
                )}
              >
                {item.badge.label}
              </span>
            )}
            <span className="text-sm font-semibold text-foreground">
              {item.value}
              {valueLabel && (
                <span className="text-xs text-muted-foreground ml-0.5">
                  {valueLabel}
                </span>
              )}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}
