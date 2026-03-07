interface GaugeCardProps {
  value: number
  label: string
  segments: {
    label: string
    value: number
    color: string
  }[]
  loading?: boolean
}

export function GaugeCard({
  value,
  label,
  segments,
  loading = false,
}: GaugeCardProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <div className="h-20 w-20 bg-muted animate-pulse rounded-full mb-4" />
        <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2" />
        <div className="h-3 w-32 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center py-4">
      {/* Large centered value */}
      <div className="relative mb-4">
        <div className="text-5xl font-bold text-foreground">{value}</div>
        <p className="text-sm text-muted-foreground text-center mt-1">{label}</p>
      </div>

      {/* Progress bar showing split */}
      <div className="w-full h-3 bg-muted rounded-full overflow-hidden flex mb-4">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(segment.value / total) * 100}%`,
              backgroundColor: segment.color,
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-muted-foreground">{segment.label}</span>
            <span className="font-semibold text-foreground">{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
