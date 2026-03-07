import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { mockCampaignSlots, MONTHS_SV, STATUS_CONFIG } from '@/data/mockAnnualPlan'
import type { CampaignSlot } from '@/data/mockAnnualPlan'
import CampaignSlotCard from './CampaignSlotCard'
import SlotDetailPanel from './SlotDetailPanel'

// Each month divided into 2 half-month periods (1-15, 16-end)
const HALF_MONTH_PERIODS = 2
const TOTAL_COLUMNS = 12 * HALF_MONTH_PERIODS // 24 columns

interface GridSlot {
  slot: CampaignSlot
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
  const [selectedSlot, setSelectedSlot] = useState<CampaignSlot | null>(null)
  const currentYear = new Date().getFullYear()

  // Calculate grid positions for all slots
  const gridSlots = useMemo(() => {
    const slots: GridSlot[] = []
    const rowEndCols: number[] = [] // Track where each row ends

    // Sort by start date
    const sorted = [...mockCampaignSlots].sort(
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
  }, [])

  // Max rows needed
  const maxRows = Math.max(1, ...gridSlots.map((g) => g.row + 1))

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

      {/* 12-month Grid */}
      <Card className="p-4 overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Month headers */}
          <div
            className="grid gap-px mb-2"
            style={{ gridTemplateColumns: `repeat(${TOTAL_COLUMNS}, minmax(40px, 1fr))` }}
          >
            {MONTHS_SV.map((month) => (
              <div
                key={month}
                className="col-span-2 text-center text-sm font-semibold text-foreground py-2 bg-muted rounded"
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
          <div className="relative">
            {/* Background grid cells */}
            <div
              className="grid gap-px"
              style={{ gridTemplateColumns: `repeat(${TOTAL_COLUMNS}, minmax(40px, 1fr))` }}
            >
              {Array.from({ length: TOTAL_COLUMNS }).map((_, colIdx) => (
                <div
                  key={colIdx}
                  className="group relative bg-card border border-border rounded min-h-[60px] hover:bg-muted/50 transition-colors"
                  style={{ minHeight: `${maxRows * 32 + 20}px` }}
                >
                  {/* Add button on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-1 rounded bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                      title="Lägg till kampanj"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
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
