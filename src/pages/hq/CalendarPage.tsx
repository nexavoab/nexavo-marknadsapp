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

interface GanttCampaign {
  id: string
  name: string
  status: string
  left: number
  width: number
  row: number
  franchiseeCount: number
  budget: number
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

const STATUS_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  active: { bg: 'bg-emerald-500', text: 'text-white', badge: 'bg-emerald-100 text-emerald-800' },
  draft: { bg: 'bg-amber-400', text: 'text-amber-900', badge: 'bg-amber-100 text-amber-800' },
  planned: { bg: 'bg-blue-400', text: 'text-white', badge: 'bg-blue-100 text-blue-800' },
  scheduled: { bg: 'bg-blue-400', text: 'text-white', badge: 'bg-blue-100 text-blue-800' },
  completed: { bg: 'bg-slate-400', text: 'text-white', badge: 'bg-slate-100 text-slate-700' },
  cancelled: { bg: 'bg-gray-300 opacity-50', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-600' },
  archived: { bg: 'bg-gray-300', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-600' },
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktiv',
  draft: 'Utkast',
  planned: 'Planerad',
  scheduled: 'Schemalagd',
  completed: 'Avslutad',
  cancelled: 'Avbruten',
  archived: 'Arkiverad',
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
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month, daysInMonth, 23, 59, 59)
    
    // Parse date string as local date (not UTC)
    const parseLocalDate = (dateStr: string): Date => {
      const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    
    const relevantCampaigns = campaigns.filter((c) => {
      if (!c.start_date) return false
      const start = parseLocalDate(c.start_date)
      const end = c.end_date ? parseLocalDate(c.end_date) : start
      // Campaign overlaps with current month
      return start <= monthEnd && end >= monthStart
    })

    // Sort by start date
    relevantCampaigns.sort((a, b) => {
      const aStart = parseLocalDate(a.start_date!)
      const bStart = parseLocalDate(b.start_date!)
      return aStart.getTime() - bStart.getTime()
    })

    // Assign rows to avoid overlaps
    const result: GanttCampaign[] = []
    const rowEndDays: number[] = []

    relevantCampaigns.forEach((campaign) => {
      const campaignStart = parseLocalDate(campaign.start_date!)
      const campaignEnd = campaign.end_date 
        ? parseLocalDate(campaign.end_date) 
        : campaignStart

      // Calculate overlapping days within this month
      const overlapStartDay = campaignStart < monthStart ? 1 : campaignStart.getDate()
      const overlapEndDay = campaignEnd > monthEnd ? daysInMonth : campaignEnd.getDate()

      // Calculate left and width as percentages
      const left = ((overlapStartDay - 1) / daysInMonth) * 100
      const width = ((overlapEndDay - overlapStartDay + 1) / daysInMonth) * 100

      // Find available row (to avoid vertical overlap)
      let row = 0
      for (let i = 0; i < rowEndDays.length; i++) {
        if (rowEndDays[i] < overlapStartDay) {
          row = i
          break
        }
        row = i + 1
      }
      rowEndDays[row] = overlapEndDay

      // Mock franchisee counts (cycle through: 12, 8, 24, 6, 18)
      const mockFranchiseeCounts = [12, 8, 24, 6, 18]
      const franchiseeCount = mockFranchiseeCounts[result.length % mockFranchiseeCounts.length]

      // Mock budgets
      const mockBudgets = [45000, 30000, 75000, 20000, 55000]
      const budget = mockBudgets[result.length % mockBudgets.length]

      result.push({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        left,
        width,
        row,
        franchiseeCount,
        budget,
      })
    })

    return result
  }, [campaigns, year, month])

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

  // Agenda list for mobile - show campaigns for current month
  const agendaItems = useMemo(() => {
    const parseLocalDate = (dateStr: string): Date => {
      const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59)
    
    return campaigns
      .filter(c => {
        if (!c.start_date) return false
        const start = parseLocalDate(c.start_date)
        const end = c.end_date ? parseLocalDate(c.end_date) : start
        return start <= monthEnd && end >= monthStart
      })
      .sort((a, b) => {
        const aStart = parseLocalDate(a.start_date!)
        const bStart = parseLocalDate(b.start_date!)
        return aStart.getTime() - bStart.getTime()
      })
      .map(c => {
        const start = parseLocalDate(c.start_date!)
        const end = c.end_date ? parseLocalDate(c.end_date) : start
        return { ...c, startDate: start, endDate: end }
      })
  }, [campaigns, year, month])

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

      {/* Mobile Agenda View */}
      <div className="md:hidden">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">
                {MONTHS[month]} {year}
              </h2>
              <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs">
                Idag
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : agendaItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                <CalendarDays className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                Inga kampanjer
              </h3>
              <p className="text-xs text-muted-foreground">
                {MONTHS[month]} {year}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {agendaItems.map((campaign) => {
                const colors = STATUS_COLORS[campaign.status] || STATUS_COLORS.draft
                const statusLabel = STATUS_LABELS[campaign.status] || campaign.status
                const formatMobileDate = (date: Date) => 
                  date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })

                return (
                  <button
                    key={campaign.id}
                    onClick={() => navigate(`/hq/campaigns/${campaign.id}`)}
                    className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all bg-card"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-medium text-foreground text-sm truncate">
                        {campaign.name}
                      </h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatMobileDate(campaign.startDate)}
                      {campaign.endDate.getTime() !== campaign.startDate.getTime() && (
                        <> → {formatMobileDate(campaign.endDate)}</>
                      )}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Desktop Calendar View */}
      <Card className="hidden md:block p-4 overflow-x-auto">
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

        {/* Status Legend */}
        <div className="flex gap-4 text-xs text-muted-foreground mb-3 px-4">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block"/>Aktiv</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400 inline-block"/>Planerad</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block"/>Utkast</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="min-w-[600px]">
            {/* Month + Year header */}
            <div className="border-b border-border pb-2 mb-0">
              <h3 className="text-base font-bold text-foreground">
                {MONTHS[month]} {year}
              </h3>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-l border-t border-border">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2 border-r border-b border-border bg-muted/30"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid with Gantt bands */}
            <div className="relative">
              {/* Day cells */}
              <div className="grid grid-cols-7 border-l border-border">
                {days.map((day, idx) => {
                  const dateKey = formatDateKey(day.date)
                  const isToday = dateKey === today

                  return (
                    <div
                      key={idx}
                      className={`
                        group min-h-[60px] md:min-h-[80px] p-1 relative
                        border-r border-b border-border
                        ${day.isCurrentMonth ? 'bg-card' : 'bg-muted/50'}
                        ${isToday ? 'ring-2 ring-inset ring-primary' : ''}
                      `}
                    >
                      <div
                        className={`text-sm font-medium ${
                          day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {day.date.getDate()}
                      </div>
                      {/* Hover "+" indicator for empty cells */}
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground text-lg pointer-events-none">
                        +
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Gantt campaign bands overlay */}
              {hasCampaignsThisMonth && (
                <div className="absolute inset-0 pointer-events-none">
                  {ganttCampaigns.map((campaign) => {
                    const colors = STATUS_COLORS[campaign.status] || STATUS_COLORS.draft
                    const rowOffset = 24 + campaign.row * 22 // Start below date number
                    const isCancelled = campaign.status === 'cancelled'
                    const isActive = campaign.status === 'active'

                    return (
                      <div
                        key={campaign.id}
                        className="group/tooltip absolute pointer-events-auto"
                        style={{
                          left: `${campaign.left}%`,
                          width: `${campaign.width}%`,
                          top: `${rowOffset}px`,
                        }}
                      >

                        {/* Gantt bar - all info visible without hover */}
                        <button
                          onClick={() => navigate(`/hq/campaigns/${campaign.id}`)}
                          title={`${campaign.name} · Status: ${campaign.status}`}
                          className={`
                            w-full py-0.5 px-2 rounded-sm text-xs font-medium
                            hover:scale-[1.02] transition-all cursor-pointer
                            shadow-sm flex items-center gap-1
                            ${colors.bg} ${colors.text}
                            ${isCancelled ? 'opacity-50' : 'hover:opacity-90'}
                          `}
                        >
                          {/* Active status indicator - green dot */}
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 flex-shrink-0" />
                          )}
                          {/* Cancelled indicator */}
                          {isCancelled && (
                            <span className="flex-shrink-0">❌</span>
                          )}
                          <span className={`truncate ${isCancelled ? 'line-through' : ''}`}>
                            {campaign.name}
                          </span>
                          <span className="opacity-75 whitespace-nowrap">· {campaign.franchiseeCount}st</span>
                          <span className="opacity-60 whitespace-nowrap hidden sm:inline">· {campaign.budget.toLocaleString('sv-SE')} kr</span>
                        </button>
                      </div>
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
