import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { useCampaignSlots, STATUS_CONFIG, MONTHS_SV } from '@/hooks/useCampaignSlots'
import type { CampaignSlotCompat } from '@/hooks/useCampaignSlots'
import CampaignSlotCard from './CampaignSlotCard'
import SlotDetailPanel from './SlotDetailPanel'
import { Loader2, AlertCircle, CalendarDays } from 'lucide-react'

// Each month divided into 2 half-month periods (1-15, 16-end)
const HALF_MONTH_PERIODS = 2
const TOTAL_COLUMNS = 12 * HALF_MONTH_PERIODS // 24 columns

interface GridSlot {
  slot: CampaignSlotCompat
  startCol: number // 0-indexed
  colSpan: number
  row: number
}

function getHalfMonthIndex(dateStr: string): number {
  const date = new Date(dateStr)
  const month = date.getMonth() // 0-11
  const day = date.getDate()
  // First half (1-15) = month * 2, Second half (16+) = month * 2 + 1
  return month * 2 + (day > 15 ? 1 : 0)
}

export default function AnnualPlanPage() {
  const { slotsCompat, loading, error } = useCampaignSlots()
  const [selectedSlot, setSelectedSlot] = useState<CampaignSlotCompat | null>(null)
  const currentYear = new Date().getFullYear()

  // Calculate grid positions for all slots
  const gridSlots = useMemo(() => {
    const slots: GridSlot[] = []
    const rowEndCols: number[] = [] // Track where each row ends

    // Sort by start date
    const sorted = [...slotsCompat].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )

    sorted.forEach((slot) => {
      const startCol = getHalfMonthIndex(slot.startDate)
      const endCol = getHalfMonthIndex(slot.endDate)
      const colSpan = Math.max(1, endCol - startCol + 1)

      // Find available row (no overlap)
      let row = 0
      for (let i = 0; i < rowEndCols.length; i++) {
        if (rowEndCols[i] < startCol) {
          row = i
          break
        }
        row = i + 1
      }
      rowEndCols[row] = startCol + colSpan - 1

      slots.push({ slot, startCol, colSpan, row })
    })

    return slots
  }, [slotsCompat])

  // Max rows needed
  const maxRows = Math.max(1, ...gridSlots.map((g) => g.row + 1))

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <span className="text-destructive">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Årshjul</h1>
        <p className="text-muted-foreground mt-1">
          Översikt över alla kampanjer under {currentYear}.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${config.bgClass}`} />
            <span className="text-sm text-muted-foreground">{config.label}</span>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {slotsCompat.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <CalendarDays className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Inga kampanjslots ännu</h2>
            <p className="text-muted-foreground max-w-md">
              Skapa din första kampanjslot för att börja planera årshjulet.
            </p>
          </div>
        </Card>
      ) : (
        /* 12-month Grid */
        <Card className="p-4 overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Month headers */}
            <div
              className="grid gap-px mb-2 font-sans"
              style={{ gridTemplateColumns: `repeat(${TOTAL_COLUMNS}, minmax(40px, 1fr))` }}
            >
              {MONTHS_SV.map((month) => (
                <div
                  key={month}
                  className="col-span-2 text-center text-sm font-semibold text-foreground py-2 bg-muted rounded border-b-2 border-border"
                  style={{ gridColumn: `span 2` }}
                >
                  {month}
                </div>
              ))}
            </div>

            {/* Half-month labels */}
            <div
              className="grid gap-px mb-1"
              style={{ gridTemplateColumns: `repeat(${TOTAL_COLUMNS}, minmax(40px, 1fr))` }}
            >
              {MONTHS_SV.flatMap((_, monthIdx) => [
                <div
                  key={`${monthIdx}-1`}
                  className="text-center text-xs text-muted-foreground py-1"
                >
                  1-15
                </div>,
                <div
                  key={`${monthIdx}-2`}
                  className="text-center text-xs text-muted-foreground py-1"
                >
                  16+
                </div>
              ])}
            </div>

            {/* Grid with slots */}
            <div className="relative font-sans">
              {/* Background grid cells */}
              <div
                className="grid gap-px"
                style={{ gridTemplateColumns: `repeat(${TOTAL_COLUMNS}, minmax(40px, 1fr))` }}
              >
                {Array.from({ length: TOTAL_COLUMNS }).map((_, colIdx) => (
                  <div
                    key={colIdx}
                    className={`group relative border border-border rounded min-h-[60px] cursor-pointer hover:bg-muted/30 transition-colors ${
                      colIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                    }`}
                    style={{ minHeight: `${maxRows * 32 + 20}px` }}
                  >
                    {/* Hover "+" indicator */}
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground text-xl font-light transition-opacity">
                      +
                    </span>
                  </div>
                ))}
              </div>

              {/* Campaign slots overlay */}
              <div
                className="absolute inset-0 grid gap-px pointer-events-none"
                style={{ gridTemplateColumns: `repeat(${TOTAL_COLUMNS}, minmax(40px, 1fr))` }}
              >
                {gridSlots.map(({ slot, startCol, colSpan, row }) => (
                  <div
                    key={slot.id}
                    className="pointer-events-auto"
                    style={{
                      gridColumn: `${startCol + 1} / span ${colSpan}`,
                      marginTop: `${8 + row * 28}px`
                    }}
                  >
                    <CampaignSlotCard
                      slot={slot}
                      onClick={() => setSelectedSlot(slot)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Detail Panel */}
      {selectedSlot && (
        <SlotDetailPanel
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </div>
  )
}
