import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
const MONTHS = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
]

interface CalendarCampaign {
  id: string
  name: string
  status: string
  start_date: string | null
  end_date: string | null
}

interface GanttCampaign extends CalendarCampaign {
  startCol: number
  span: number
  row: number
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const days: { date: Date; isCurrentMonth: boolean }[] = []

  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d, isCurrentMonth: false })
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }

  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
  }

  return days
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-green-500', text: 'text-white' },
  draft: { bg: 'bg-yellow-400', text: 'text-yellow-900' },
  scheduled: { bg: 'bg-blue-500', text: 'text-white' },
  completed: { bg: 'bg-gray-400', text: 'text-white' },
  archived: { bg: 'bg-gray-300', text: 'text-gray-700' },
}

export default function CalendarPage() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<CalendarCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    async function fetchCampaigns() {
      if (!appUser?.organization_id) return

      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select('id, name, status, start_date, end_date')
          .eq('organization_id', appUser.organization_id)

        if (error) throw error
        setCampaigns(data || [])
      } catch (err) {
        console.error('Failed to fetch campaigns:', err)
        toast.error('Kunde inte hämta kampanjer')
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [appUser?.organization_id])

  const days = useMemo(() => getMonthDays(year, month), [year, month])

  // Calculate Gantt-style campaign bands
  const ganttCampaigns = useMemo(() => {
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0)
    
    const relevantCampaigns = campaigns.filter((c) => {
      if (!c.start_date) return false
      const start = new Date(c.start_date)
      const end = c.end_date ? new Date(c.end_date) : start
      // Campaign overlaps with current month
      return start <= monthEnd && end >= monthStart
    })

    // Sort by start date
    relevantCampaigns.sort((a, b) => {
      const aStart = new Date(a.start_date!)
      const bStart = new Date(b.start_date!)
      return aStart.getTime() - bStart.getTime()
    })

    // Assign rows to avoid overlaps
    const result: GanttCampaign[] = []
    const rowEndDates: Date[] = []

    relevantCampaigns.forEach((campaign) => {
      const start = new Date(campaign.start_date!)
      const end = campaign.end_date ? new Date(campaign.end_date) : start

      // Find grid position
      const dayIndex = days.findIndex(
        (d) => formatDateKey(d.date) === campaign.start_date!.split('T')[0]
      )
      
      // Calculate span within visible grid
      let startCol = dayIndex >= 0 ? dayIndex : 0
      let endIndex = days.findIndex(
        (d) => formatDateKey(d.date) === (campaign.end_date || campaign.start_date)!.split('T')[0]
      )
      
      // Handle campaigns that start before or end after visible grid
      if (start < days[0].date) {
        startCol = 0
      }
      if (endIndex < 0 || end > days[days.length - 1].date) {
        endIndex = days.length - 1
      }

      const span = Math.max(1, endIndex - startCol + 1)

      // Find available row
      let row = 0
      for (let i = 0; i < rowEndDates.length; i++) {
        if (rowEndDates[i] < start) {
          row = i
          break
        }
        row = i + 1
      }
      rowEndDates[row] = end

      result.push({
        ...campaign,
        startCol,
        span,
        row,
      })
    })

    return result
  }, [campaigns, days, year, month])

  // Check if there are any campaigns for current month
  const hasCampaignsThisMonth = ganttCampaigns.length > 0

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const today = formatDateKey(new Date())

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kalender</h1>
          <p className="text-muted-foreground mt-1">
            Översikt över kampanjer per månad.
          </p>
        </div>
      </div>

      {/* Calendar navigation */}
      <Card className="p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-6 min-w-[600px]">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">
              {MONTHS[month]} {year}
            </h2>
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Idag
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="min-w-[600px]">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid with Gantt bands */}
            <div className="relative">
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, idx) => {
                  const dateKey = formatDateKey(day.date)
                  const isToday = dateKey === today

                  return (
                    <div
                      key={idx}
                      className={`
                        min-h-[60px] md:min-h-[80px] p-1 border rounded-md relative
                        ${day.isCurrentMonth ? 'bg-card' : 'bg-muted/50'}
                        ${isToday ? 'border-primary border-2' : 'border-border'}
                      `}
                    >
                      <div
                        className={`text-sm font-medium ${
                          day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {day.date.getDate()}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Gantt campaign bands overlay */}
              {hasCampaignsThisMonth && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="grid grid-cols-7 gap-1 h-full">
                    {days.map((_, idx) => (
                      <div key={idx} className="relative" />
                    ))}
                  </div>
                  {ganttCampaigns.map((campaign) => {
                    const colors = STATUS_COLORS[campaign.status] || STATUS_COLORS.draft
                    const rowOffset = 24 + campaign.row * 22 // Start below date number
                    const colWidth = 100 / 7
                    const gapAdjustment = 0.15 // Account for gap-1 (4px)

                    return (
                      <button
                        key={campaign.id}
                        onClick={() => navigate(`/hq/campaigns/${campaign.id}`)}
                        className={`
                          absolute pointer-events-auto
                          h-5 rounded px-1.5 text-xs font-medium truncate
                          hover:opacity-80 hover:scale-[1.02] transition-all cursor-pointer
                          shadow-sm
                          ${colors.bg} ${colors.text}
                        `}
                        style={{
                          left: `calc(${campaign.startCol * colWidth}% + ${campaign.startCol * gapAdjustment}%)`,
                          width: `calc(${campaign.span * colWidth}% - ${gapAdjustment}%)`,
                          top: `${rowOffset}px`,
                        }}
                        title={`${campaign.name} (${campaign.status})`}
                      >
                        {campaign.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Empty state for no campaigns */}
            {!hasCampaignsThisMonth && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <CalendarDays className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">
                  Inga kampanjer denna period
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Det finns inga kampanjer schemalagda för {MONTHS[month]} {year}.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
