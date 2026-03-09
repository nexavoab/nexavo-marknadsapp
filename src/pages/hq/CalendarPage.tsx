import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Filter } from 'lucide-react'
import { useCampaignSlots, STATUS_CONFIG } from '@/hooks/useCampaignSlots'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { ScheduledPost, CampaignChannel } from '@/types'

const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
const MONTHS = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
]

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

// Status colors for Gantt bars - matches CampaignSlotCompat status types
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  planned: { bg: 'bg-blue-500', text: 'text-white' },
  in_progress: { bg: 'bg-yellow-500', text: 'text-yellow-900' },
  completed: { bg: 'bg-green-500', text: 'text-white' },
  cancelled: { bg: 'bg-gray-400 opacity-50', text: 'text-gray-700' },
}

const CHANNELS = ['facebook', 'instagram', 'google', 'email', 'linkedin'] as const

// WAS-412: Channel colors and abbreviations for scheduled posts
const CHANNEL_CONFIG: Record<CampaignChannel, { abbr: string; bgColor: string; textColor: string }> = {
  facebook: { abbr: 'FB', bgColor: 'bg-blue-500', textColor: 'text-white' },
  instagram: { abbr: 'IG', bgColor: 'bg-pink-500', textColor: 'text-white' },
  linkedin: { abbr: 'LI', bgColor: 'bg-blue-800', textColor: 'text-white' },
  email: { abbr: '✉', bgColor: 'bg-gray-500', textColor: 'text-white' },
  tiktok: { abbr: 'TT', bgColor: 'bg-black', textColor: 'text-white' },
  google: { abbr: 'G', bgColor: 'bg-red-500', textColor: 'text-white' },
  print: { abbr: 'PR', bgColor: 'bg-amber-600', textColor: 'text-white' },
  display: { abbr: 'DI', bgColor: 'bg-purple-500', textColor: 'text-white' },
  print_flyer: { abbr: 'FL', bgColor: 'bg-amber-700', textColor: 'text-white' },
}

// WAS-412: Mock scheduled posts (hardcoded until DB is ready)
const mockScheduledPosts: ScheduledPost[] = [
  {
    id: 'post-1',
    campaign_id: 'camp-1',
    campaign_name: 'Sommarkampanj',
    channel: 'instagram',
    scheduled_date: '2026-03-15',
    status: 'scheduled',
    headline: 'Semestern börjar här 🌞',
    org_id: 'org-1',
  },
  {
    id: 'post-2',
    campaign_id: 'camp-1',
    campaign_name: 'Sommarkampanj',
    channel: 'facebook',
    scheduled_date: '2026-03-15',
    status: 'scheduled',
    headline: 'Boka din drömresa idag',
    org_id: 'org-1',
  },
  {
    id: 'post-3',
    campaign_id: 'camp-2',
    campaign_name: 'Nyhetsbrev Q1',
    channel: 'email',
    scheduled_date: '2026-03-20',
    status: 'draft',
    headline: 'Q1 nyhetsbrev — viktig info',
    org_id: 'org-1',
  },
  {
    id: 'post-4',
    campaign_id: 'camp-1',
    campaign_name: 'Sommarkampanj',
    channel: 'linkedin',
    scheduled_date: '2026-03-18',
    status: 'scheduled',
    headline: 'Karriärtips för sommaren',
    org_id: 'org-1',
  },
  {
    id: 'post-5',
    campaign_id: 'camp-3',
    campaign_name: 'Vårkampanj',
    channel: 'instagram',
    scheduled_date: '2026-03-10',
    status: 'published',
    headline: 'Våren är här! 🌸',
    org_id: 'org-1',
  },
]

export default function CalendarPage() {
  const navigate = useNavigate()
  const { slotsCompat: campaigns, loading } = useCampaignSlots()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const days = useMemo(() => getMonthDays(year, month), [year, month])

  // Filter campaigns by selected channels
  const filteredCampaigns = useMemo(() => {
    if (selectedChannels.length === 0) return campaigns
    return campaigns.filter(c => {
      const channel = c.channels?.[0] ?? 'facebook'
      return selectedChannels.includes(channel)
    })
  }, [campaigns, selectedChannels])

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
    
    const relevantCampaigns = filteredCampaigns.filter((c) => {
      if (!c.startDate) return false
      const start = parseLocalDate(c.startDate)
      const end = c.endDate ? parseLocalDate(c.endDate) : start
      // Campaign overlaps with current month
      return start <= monthEnd && end >= monthStart
    })

    // Sort by start date
    relevantCampaigns.sort((a, b) => {
      const aStart = parseLocalDate(a.startDate)
      const bStart = parseLocalDate(b.startDate)
      return aStart.getTime() - bStart.getTime()
    })

    // Assign rows to avoid overlaps
    const result: GanttCampaign[] = []
    const rowEndDays: number[] = []

    relevantCampaigns.forEach((campaign) => {
      const campaignStart = parseLocalDate(campaign.startDate)
      const campaignEnd = campaign.endDate 
        ? parseLocalDate(campaign.endDate) 
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

      // Use real data from campaign_slots (franchiseeCount from hook or default)
      const franchiseeCount = campaign.franchiseeCount ?? 0
      const budget = campaign.budget ?? 0

      result.push({
        id: campaign.id,
        name: campaign.title,
        status: campaign.status,
        left,
        width,
        row,
        franchiseeCount,
        budget,
      })
    })

    return result
  }, [filteredCampaigns, year, month])

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

  const toggleChannel = (channel: string) => {
    setSelectedChannels(prev => 
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    )
  }

  const handleDateClick = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return
    setSelectedDate(date)
    setShowNewCampaignDialog(true)
  }

  const handleCreateCampaign = () => {
    if (selectedDate) {
      const dateStr = formatDateKey(selectedDate)
      navigate(`/hq/campaigns/new?date=${dateStr}`)
    }
    setShowNewCampaignDialog(false)
  }

  // WAS-412: Group scheduled posts by date for calendar display
  const postsByDate = useMemo(() => {
    const grouped: Record<string, ScheduledPost[]> = {}
    mockScheduledPosts.forEach((post) => {
      const dateKey = post.scheduled_date
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(post)
    })
    return grouped
  }, [])

  // Agenda list for mobile - show campaigns for current month
  const agendaItems = useMemo(() => {
    const parseLocalDate = (dateStr: string): Date => {
      const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59)
    
    return filteredCampaigns
      .filter(c => {
        if (!c.startDate) return false
        const start = parseLocalDate(c.startDate)
        const end = c.endDate ? parseLocalDate(c.endDate) : start
        return start <= monthEnd && end >= monthStart
      })
      .sort((a, b) => {
        const aStart = parseLocalDate(a.startDate)
        const bStart = parseLocalDate(b.startDate)
        return aStart.getTime() - bStart.getTime()
      })
      .map(c => {
        const start = parseLocalDate(c.startDate)
        const end = c.endDate ? parseLocalDate(c.endDate) : start
        return { ...c, startDateParsed: start, endDateParsed: end }
      })
  }, [filteredCampaigns, year, month])

  return (
    <div className="p-4 md:p-8 space-y-6 w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kalender</h1>
          <p className="text-muted-foreground mt-1">
            Översikt över kampanjer per månad.
          </p>
        </div>
        <Button onClick={() => navigate('/hq/campaigns/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Ny kampanj
        </Button>
      </div>

      {/* Channel Filter */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span>Filtrera kanal:</span>
          </div>
          {CHANNELS.map(channel => {
            const isSelected = selectedChannels.includes(channel)
            return (
              <button
                key={channel}
                onClick={() => toggleChannel(channel)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  isSelected 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background border-border hover:border-primary/50'
                }`}
              >
                {channel.charAt(0).toUpperCase() + channel.slice(1)}
              </button>
            )
          })}
          {selectedChannels.length > 0 && (
            <button
              onClick={() => setSelectedChannels([])}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Rensa filter
            </button>
          )}
        </div>
      </Card>

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
                const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.planned
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
                        {campaign.title}
                      </h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bgClass} text-white`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatMobileDate(campaign.startDateParsed)}
                      {campaign.endDateParsed.getTime() !== campaign.startDateParsed.getTime() && (
                        <> → {formatMobileDate(campaign.endDateParsed)}</>
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
      <Card className="hidden md:block p-4 max-w-full">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
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
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500 inline-block"/>Pågår</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block"/>Planerad</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block"/>Avslutad</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                  const postsForDay = postsByDate[dateKey] || []
                  const postCount = postsForDay.length

                  return (
                    <div
                      key={idx}
                      onClick={() => handleDateClick(day.date, day.isCurrentMonth)}
                      className={`
                        group min-h-[60px] md:min-h-[100px] p-1 relative
                        border-r border-b border-border
                        ${day.isCurrentMonth ? 'bg-card cursor-pointer hover:bg-muted/50' : 'bg-muted/50'}
                        ${isToday ? 'ring-2 ring-inset ring-primary' : ''}
                        transition-colors
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-medium ${
                            day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {day.date.getDate()}
                        </span>
                        {/* WAS-412: Post count badge */}
                        {postCount > 0 && day.isCurrentMonth && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                            {postCount} inlägg
                          </span>
                        )}
                      </div>
                      
                      {/* WAS-412: Scheduled post chips */}
                      {day.isCurrentMonth && postsForDay.length > 0 && (
                        <div className="mt-1 space-y-0.5 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                          {postsForDay.slice(0, 3).map((post) => {
                            const channelConfig = CHANNEL_CONFIG[post.channel] || CHANNEL_CONFIG.facebook
                            const statusIcon = post.status === 'draft' ? '📝' : post.status === 'published' ? '✅' : ''
                            
                            return (
                              <Popover key={post.id}>
                                <PopoverTrigger asChild>
                                  <button
                                    className={`
                                      w-full flex items-center gap-1 px-1 py-0.5 rounded text-[10px]
                                      ${channelConfig.bgColor} ${channelConfig.textColor}
                                      hover:opacity-80 transition-opacity cursor-pointer
                                      truncate text-left
                                    `}
                                  >
                                    <span className="font-bold flex-shrink-0">[{channelConfig.abbr}]</span>
                                    <span className="truncate">{post.headline || post.campaign_name}</span>
                                    {statusIcon && <span className="flex-shrink-0">{statusIcon}</span>}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-3" side="right" align="start">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${channelConfig.bgColor} ${channelConfig.textColor}`}>
                                        {channelConfig.abbr}
                                      </span>
                                      <span className="text-xs text-muted-foreground capitalize">{post.channel}</span>
                                    </div>
                                    <h4 className="font-semibold text-sm">{post.headline || 'Inget headline'}</h4>
                                    <div className="text-xs text-muted-foreground space-y-1">
                                      <p><strong>Kampanj:</strong> {post.campaign_name}</p>
                                      <p><strong>Datum:</strong> {new Date(post.scheduled_date).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                      <p><strong>Status:</strong> {post.status === 'draft' ? '📝 Utkast' : post.status === 'scheduled' ? '📅 Schemalagd' : '✅ Publicerad'}</p>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )
                          })}
                          {postsForDay.length > 3 && (
                            <span className="text-[10px] text-muted-foreground pl-1">
                              +{postsForDay.length - 3} till
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Hover "+" indicator for empty cells */}
                      {day.isCurrentMonth && postsForDay.length === 0 && (
                        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-primary text-2xl font-light pointer-events-none">
                          +
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Gantt campaign bands overlay */}
              {hasCampaignsThisMonth && (
                <div className="absolute inset-0 pointer-events-none">
                  {ganttCampaigns.map((campaign) => {
                    const colors = STATUS_COLORS[campaign.status] || STATUS_COLORS.planned
                    const statusConfig = STATUS_CONFIG[campaign.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.planned
                    const rowOffset = 24 + campaign.row * 22 // Start below date number
                    const isCancelled = campaign.status === 'cancelled'
                    const isInProgress = campaign.status === 'in_progress'

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
                          title={`${campaign.name} · Status: ${statusConfig.label}`}
                          className={`
                            w-full py-0.5 px-2 rounded-sm text-xs font-medium
                            hover:scale-[1.02] transition-all cursor-pointer
                            shadow-sm flex items-center gap-1
                            ${colors.bg} ${colors.text}
                            ${isCancelled ? 'opacity-50' : 'hover:opacity-90'}
                          `}
                        >
                          {/* In-progress status indicator - pulsing dot */}
                          {isInProgress && (
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-200 flex-shrink-0 animate-pulse" />
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
          </div>
        )}
      </Card>

      {/* New Campaign Dialog */}
      <Dialog open={showNewCampaignDialog} onOpenChange={setShowNewCampaignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Skapa kampanj</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Vill du skapa en ny kampanj med startdatum{' '}
              <strong>
                {selectedDate?.toLocaleDateString('sv-SE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </strong>
              ?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowNewCampaignDialog(false)}>
                Avbryt
              </Button>
              <Button onClick={handleCreateCampaign}>
                <Plus className="w-4 h-4 mr-2" />
                Skapa kampanj
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
