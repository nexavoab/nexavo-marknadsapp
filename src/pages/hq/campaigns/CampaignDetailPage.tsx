/**
 * Campaign Detail Page
 * Visar detaljer för en enskild kampanj
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useAssets } from '@/hooks/useAssets'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Campaign, Asset, CampaignStatus } from '@/types'
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Calendar,
  Download,
  Archive,
  Play,
  Pause,
} from 'lucide-react'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: 'Utkast', className: 'bg-muted text-muted-foreground' },
  scheduled: { label: 'Schemalagd', className: 'bg-yellow-100 text-yellow-800' },
  active: { label: 'Aktiv', className: 'bg-green-100 text-green-800' },
  completed: { label: 'Avslutad', className: 'bg-blue-100 text-blue-800' },
  archived: { label: 'Arkiverad', className: 'bg-muted text-muted-foreground' },
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchCampaign, updateCampaignStatus } = useCampaigns()
  const { fetchAssets } = useAssets()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) loadCampaign(id)
  }, [id])

  async function loadCampaign(campaignId: string) {
    try {
      setLoading(true)
      const [campaignData, assetsData] = await Promise.all([
        fetchCampaign(campaignId),
        fetchAssets(campaignId),
      ])

      if (!campaignData) {
        setError('Kampanjen hittades inte')
        return
      }

      setCampaign(campaignData)
      setAssets(assetsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ladda kampanj')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: CampaignStatus) => {
    if (!campaign) return

    try {
      await updateCampaignStatus(campaign.id, newStatus)
      setCampaign({ ...campaign, status: newStatus })
      toast.success(`Status ändrad till ${STATUS_CONFIG[newStatus].label}`)
    } catch (err) {
      toast.error('Kunde inte ändra status')
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="p-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/hq/campaigns')} className="mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Tillbaka
        </Button>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <span className="text-destructive">{error || 'Kampanjen hittades inte'}</span>
        </div>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[campaign.status]

  return (
    <div className="p-8">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/hq/campaigns')} className="mb-6">
        <ChevronLeft className="w-4 h-4 mr-1" />
        Tillbaka till kampanjer
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge className={cn('text-sm', statusConfig.className)}>
              {statusConfig.label}
            </Badge>
          </div>
          {campaign.description && (
            <p className="text-muted-foreground">{campaign.description}</p>
          )}
          {(campaign.start_date || campaign.end_date) && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {campaign.start_date && new Date(campaign.start_date).toLocaleDateString('sv-SE')}
              {campaign.end_date && ` → ${new Date(campaign.end_date).toLocaleDateString('sv-SE')}`}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {campaign.status === 'draft' && (
            <Button onClick={() => handleStatusChange('active')}>
              <Play className="w-4 h-4 mr-1" />
              Aktivera
            </Button>
          )}
          {campaign.status === 'active' && (
            <Button variant="outline" onClick={() => handleStatusChange('completed')}>
              <Pause className="w-4 h-4 mr-1" />
              Avsluta
            </Button>
          )}
          {campaign.status !== 'archived' && (
            <Button variant="ghost" onClick={() => handleStatusChange('archived')}>
              <Archive className="w-4 h-4 mr-1" />
              Arkivera
            </Button>
          )}
        </div>
      </div>

      {/* Assets Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Material ({assets.length})</h2>
        {assets.length === 0 ? (
          <div className="bg-muted rounded-lg p-8 text-center text-muted-foreground">
            Inga assets kopplade till denna kampanj ännu.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ Asset Card ============

interface AssetCardProps {
  asset: Asset
}

function AssetCard({ asset }: AssetCardProps) {
  const isImage = asset.type === 'image' || asset.type === 'composite'

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Preview */}
      {isImage && asset.public_url ? (
        <div className="aspect-video bg-muted relative">
          <img
            src={asset.public_url}
            alt={asset.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video bg-muted flex items-center justify-center">
          <span className="text-4xl">📄</span>
        </div>
      )}

      {/* Info */}
      <div className="p-4">
        <h3 className="font-medium truncate">{asset.name}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {asset.format || asset.type}
          </span>
          {asset.public_url && (
            <a
              href={asset.public_url}
              download
              className="text-primary hover:text-primary/80"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
