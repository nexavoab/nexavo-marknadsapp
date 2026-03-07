interface RegionItem {
  name: string
  value: number
  total: number
  color?: string
}

interface RegionProgressListProps {
  items: RegionItem[]
  loading?: boolean
  showPercentage?: boolean
}

export function RegionProgressList({
  items,
  loading = false,
  showPercentage = true,
}: RegionProgressListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-2 bg-muted animate-pulse rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  const maxValue = Math.max(...items.map((i) => i.value), 1)

  return (
    <div className="space-y-4">
      {items.map((item, idx) => {
        const percentage = (item.value / item.total) * 100
        const barWidth = (item.value / maxValue) * 100

        return (
          <div key={item.name} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      item.color ||
                      [
                        'oklch(0.60 0.18 252)',
                        'oklch(0.65 0.20 145)',
                        'oklch(0.70 0.15 50)',
                        'oklch(0.55 0.22 295)',
                        'oklch(0.60 0.15 200)',
                      ][idx % 5],
                  }}
                />
                <span className="font-medium text-foreground">{item.name}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="font-semibold text-foreground">{item.value}</span>
                {showPercentage && (
                  <span className="text-xs w-12 text-right">
                    {percentage.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor:
                    item.color ||
                    [
                      'oklch(0.60 0.18 252)',
                      'oklch(0.65 0.20 145)',
                      'oklch(0.70 0.15 50)',
                      'oklch(0.55 0.22 295)',
                      'oklch(0.60 0.15 200)',
                    ][idx % 5],
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
