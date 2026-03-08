/**
 * Campaigns List Page
 * Visar alla kampanjer med möjlighet att skapa nya
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCampaigns } from '@/hooks/useCampaigns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Campaign, CampaignStatus, CampaignChannel } from '@/types'
import {
  Plus,
  Megaphone,
  Calendar,
  AlertCircle,
  MoreHorizontal,
  Pencil,
  Copy,
  Archive,
  Search,
  ArrowUpDown,
  Eye,
} from 'lucide-react'

const STATUS_STYLES: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: 'Utkast', className: 'bg-gray-100 text-gray-700' },
  scheduled: { label: 'Schemalagd', className: 'bg-yellow-100 text-yellow-800' },
  active: { label: 'Aktiv', className: 'bg-green-100 text-green-800' },
  completed: { label: 'Avslutad', className: 'bg-blue-100 text-blue-800' },
  archived: { label: 'Arkiverad', className: 'bg-gray-100 text-gray-500' },
}

const CHANNEL_ICONS: Record<CampaignChannel, string> = {
  facebook: '📘',
  instagram: '📸',
  linkedin: '💼',
  google: '🔍',
  print: '🖨️',
  display: '🖥️',
}

type StatusFilter = 'all' | 'active' | 'scheduled' | 'completed'
type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc'

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Alla' },
  { value: 'active', label: 'Aktiv' },
  { value: 'scheduled', label: 'Planerad' },
  { value: 'completed', label: 'Avslutad' },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Nyast först' },
  { value: 'oldest', label: 'Äldst först' },
  { value: 'name-asc', label: 'Namn A-Ö' },
  { value: 'name-desc', label: 'Namn Ö-A' },
]

export default function CampaignsPage() {
  const navigate = useNavigate()
  const { fetchCampaigns } = useCampaigns()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadCampaigns()
  }, [])

  async function loadCampaigns() {
    try {
      setLoading(true)
      const data = await fetchCampaigns()
      setCampaigns(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ladda kampanjer')
    } finally {
      setLoading(false)
    }
  }

  const handleDuplicate = (campaign: Campaign) => {
    toast.success(`Kampanj "${campaign.name}" duplicerad`)
  }

  const handleArchive = (campaign: Campaign) => {
    toast.success(`Kampanj "${campaign.name}" arkiverad`)
  }

  // Close sort menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false)
      }
    }
    if (showSortMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSortMenu])

  // Filter and sort campaigns
  const filteredCampaigns = useMemo(() => {
    let result = [...campaigns]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(c => c.name.toLowerCase().includes(query))
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'scheduled') {
        result = result.filter(c => c.status === 'scheduled' || c.status === 'draft')
      } else {
        result = result.filter(c => c.status === statusFilter)
      }
    }

    // Sorting
    switch (sortOption) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
        break
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name, 'sv'))
        break
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name, 'sv'))
        break
    }

    return result
  }, [campaigns, searchQuery, statusFilter, sortOption])

  // Skeleton card for loading state
  const SkeletonCard = () => (
    <div className="bg-card rounded-xl border border-border p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 w-40 bg-muted rounded" />
        <div className="h-5 w-16 bg-muted rounded-full" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 w-full bg-muted/70 rounded" />
        <div className="h-4 w-3/4 bg-muted/70 rounded" />
      </div>
      <div className="flex gap-2 mb-3">
        <div className="h-6 w-6 bg-muted rounded" />
        <div className="h-6 w-6 bg-muted rounded" />
      </div>
      <div className="h-3 w-24 bg-muted/50 rounded" />
    </div>
  )

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        </div>
        {/* Search skeleton */}
        <div className="h-11 w-full bg-muted rounded-lg mb-4 animate-pulse" />
        {/* Filters skeleton */}
        <div className="flex justify-between mb-6">
          <div className="h-10 w-64 bg-muted rounded-lg animate-pulse" />
          <div className="h-10 w-28 bg-muted rounded animate-pulse" />
        </div>
        {/* Grid skeleton */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
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
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Kampanjer</h1>
        <Button onClick={() => navigate('/hq/campaigns/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Ny kampanj
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Sök kampanjer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Status tabs and sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status filter tabs */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const count = tab.value === 'all'
                ? campaigns.length
                : tab.value === 'scheduled'
                  ? campaigns.filter(c => c.status === 'scheduled' || c.status === 'draft').length
                  : campaigns.filter(c => c.status === tab.value).length
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5',
                    statusFilter === tab.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                  {statusFilter === tab.value && count > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 text-xs bg-primary text-primary-foreground rounded-full px-1">
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Sort dropdown */}
          <div ref={sortMenuRef} className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-2"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="hidden sm:inline">
                {SORT_OPTIONS.find(o => o.value === sortOption)?.label}
              </span>
              <span className="sm:hidden">Sortera</span>
            </Button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortOption(option.value)
                      setShowSortMenu(false)
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors',
                      sortOption === option.value && 'bg-muted font-medium'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results count */}
      {campaigns.length > 0 && (
        <p className="text-sm text-muted-foreground mb-4">
          Visar {filteredCampaigns.length} av {campaigns.length} kampanjer
        </p>
      )}

      {/* Empty State (no campaigns at all) */}
      {campaigns.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Megaphone className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Inga kampanjer ännu</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Skapa din första kampanj och låt AI hjälpa dig generera professionellt
            marknadsföringsmaterial på några minuter.
          </p>
          <Button size="lg" onClick={() => navigate('/hq/campaigns/new')}>
            <Plus className="w-5 h-5 mr-2" />
            Skapa din första kampanj
          </Button>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        /* No results from filter */
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Inga träffar</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Inga kampanjer matchar "{searchQuery || statusFilter}"
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('all')
            }}
          >
            Rensa filter
          </Button>
        </div>
      ) : (
        /* Campaign Grid */
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onClick={() => navigate(`/hq/campaigns/${campaign.id}`)}
              onView={() => navigate(`/hq/campaigns/${campaign.id}`)}
              onEdit={() => navigate(`/hq/campaigns/${campaign.id}/edit`)}
              onDuplicate={() => handleDuplicate(campaign)}
              onArchive={() => handleArchive(campaign)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============ Campaign Card ============

interface CampaignCardProps {
  campaign: Campaign
  onClick: () => void
  onView: () => void
  onEdit: () => void
  onDuplicate: () => void
  onArchive: () => void
}

function CampaignCard({ campaign, onClick, onView, onEdit, onDuplicate, onArchive }: CampaignCardProps) {
  const statusConfig = STATUS_STYLES[campaign.status]
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('sv-SE', {
      month: 'short',
      day: 'numeric',
    })
  }

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(!menuOpen)
  }

  const handleAction = (action: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    action()
  }

  return (
    <div
      onClick={onClick}
      className="relative text-left bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/50 transition-all group cursor-pointer"
    >
      {/* Quick actions button */}
      <div ref={menuRef} className="absolute top-3 right-3 z-10">
        <button
          onClick={handleMenuClick}
          className={cn(
            'p-1.5 rounded-md transition-all',
            'opacity-0 group-hover:opacity-100',
            'hover:bg-muted',
            menuOpen && 'opacity-100 bg-muted'
          )}
          aria-label="Kampanjåtgärder"
        >
          <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
            <button
              onClick={handleAction(onView)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
            >
              <Eye className="w-4 h-4 text-muted-foreground" />
              Visa
            </button>
            <button
              onClick={handleAction(onEdit)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
            >
              <Pencil className="w-4 h-4 text-muted-foreground" />
              Redigera
            </button>
            <button
              onClick={handleAction(onDuplicate)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
            >
              <Copy className="w-4 h-4 text-muted-foreground" />
              Duplicera
            </button>
            <button
              onClick={handleAction(onArchive)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors text-orange-600"
            >
              <Archive className="w-4 h-4" />
              Arkivera
            </button>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-3 pr-8">
        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
          {campaign.name}
        </h3>
        <Badge className={cn('text-xs', statusConfig.className)}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Description */}
      {campaign.description && (
        <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
          {campaign.description}
        </p>
      )}

      {/* Channels */}
      {campaign.channels.length > 0 && (
        <div className="flex gap-1 mb-3">
          {campaign.channels.map((channel) => (
            <span
              key={channel}
              className="text-lg"
              title={channel}
            >
              {CHANNEL_ICONS[channel]}
            </span>
          ))}
        </div>
      )}

      {/* Dates */}
      {(campaign.start_date || campaign.end_date) && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>
            {formatDate(campaign.start_date)}
            {campaign.end_date && ` → ${formatDate(campaign.end_date)}`}
          </span>
        </div>
      )}
    </div>
  )
}
