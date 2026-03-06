/**
 * Campaigns List Page
 * Visar alla kampanjer med möjlighet att skapa nya
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCampaigns } from '@/hooks/useCampaigns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Campaign, CampaignStatus, CampaignChannel } from '@/types'
import {
  Plus,
  Megaphone,
  Calendar,
  Loader2,
  AlertCircle,
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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
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
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Megaphone className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Inga kampanjer ännu</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
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
}

function CampaignCard({ campaign, onClick }: CampaignCardProps) {
  const statusConfig = STATUS_STYLES[campaign.status]

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('sv-SE', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-blue-300 transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">
          {campaign.name}
        </h3>
        <Badge className={cn('text-xs', statusConfig.className)}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Description */}
      {campaign.description && (
        <p className="text-gray-500 text-sm line-clamp-2 mb-4">
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
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Calendar className="w-3 h-3" />
          <span>
            {formatDate(campaign.start_date)}
            {campaign.end_date && ` → ${formatDate(campaign.end_date)}`}
          </span>
        </div>
      )}
    </button>
  )
}
