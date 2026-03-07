/**
 * Campaigns List Page
 * Visar alla kampanjer med möjlighet att skapa nya
 */

import { useState, useEffect, useRef } from 'react'
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
  Loader2,
  AlertCircle,
  MoreHorizontal,
  Pencil,
  Copy,
  Archive,
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
  google: '🔍',
  print: '🖨️',
  display: '🖥️',
}

export default function CampaignsPage() {
  const navigate = useNavigate()
  const { fetchCampaigns } = useCampaigns()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
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
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Kampanjer</h1>
        <Button onClick={() => navigate('/hq/campaigns/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Ny kampanj
        </Button>
      </div>

      {/* Empty State */}
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
      ) : (
        /* Campaign Grid */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onClick={() => navigate(`/hq/campaigns/${campaign.id}`)}
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
  onEdit: () => void
  onDuplicate: () => void
  onArchive: () => void
}

function CampaignCard({ campaign, onClick, onEdit, onDuplicate, onArchive }: CampaignCardProps) {
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
