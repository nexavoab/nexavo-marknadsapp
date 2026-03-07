import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight } from 'lucide-react'


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

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  // Get the day of week for first day (0 = Sunday, adjust for Monday start)
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const days: { date: Date; isCurrentMonth: boolean }[] = []

  // Days from previous month
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d, isCurrentMonth: false })
  }

  // Days of current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }

  // Days from next month to fill the grid
  const remaining = 42 - days.length // 6 rows * 7 days
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
  }

  return days
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  draft: 'bg-yellow-400',
  scheduled: 'bg-blue-500',
  completed: 'bg-gray-400',
  archived: 'bg-gray-300',
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

  // Map dates to campaigns
  const campaignsByDate = useMemo(() => {
    const map: Record<string, CalendarCampaign[]> = {}
    
    campaigns.forEach((c) => {
      if (c.start_date) {
        const key = c.start_date.split('T')[0]
        if (!map[key]) map[key] = []
        map[key].push(c)
      }
      if (c.end_date && c.end_date !== c.start_date) {
        const key = c.end_date.split('T')[0]
        if (!map[key]) map[key] = []
        // Avoid duplicates
        if (!map[key].find(x => x.id === c.id)) {
          map[key].push(c)
        }
      }
    })

    return map
  }, [campaigns])

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
    <div className="p-8 space-y-6">
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
      <Card className="p-4">
        <div className="flex items-center justify-between mb-6">
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
          <>
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

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                const dateKey = formatDateKey(day.date)
                const dayCampaigns = campaignsByDate[dateKey] || []
                const isToday = dateKey === today

                return (
                  <div
                    key={idx}
                    className={`
                      min-h-[80px] p-1 border rounded-md
                      ${day.isCurrentMonth ? 'bg-card' : 'bg-muted'}
                      ${isToday ? 'border-primary border-2' : 'border-border'}
                    `}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${
                        day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {day.date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayCampaigns.slice(0, 2).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => navigate(`/hq/campaigns/${c.id}`)}
                          className={`
                            w-full text-left text-xs px-1 py-0.5 rounded truncate
                            text-white hover:opacity-80 transition-opacity
                            ${STATUS_COLORS[c.status] || 'bg-gray-500'}
                          `}
                          title={c.name}
                        >
                          {c.name}
                        </button>
                      ))}
                      {dayCampaigns.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayCampaigns.length - 2} till
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
