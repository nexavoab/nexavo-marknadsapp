/**
 * Campaign Detail Page
 * Visar detaljer för en enskild kampanj med edit, duplicate och archive
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCampaigns, type CampaignUpdateData } from '@/hooks/useCampaigns'
import { useAssets } from '@/hooks/useAssets'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Campaign, Asset, CampaignStatus, CampaignChannel } from '@/types'
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Calendar,
  Download,
  Archive,
  Play,
  Pause,
  Layers,
  Image,
  Pencil,
  Copy,
  X,
  Save,
  User,
  MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { LocalVariantsTab } from '@/components/campaigns/LocalVariantsTab'

type TabType = 'assets' | 'variants'

const STATUS_CONFIG: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: 'Utkast', className: 'bg-muted text-muted-foreground' },
  scheduled: { label: 'Schemalagd', className: 'bg-yellow-100 text-yellow-800' },
  active: { label: 'Aktiv', className: 'bg-green-100 text-green-800' },
  completed: { label: 'Avslutad', className: 'bg-blue-100 text-blue-800' },
  archived: { label: 'Arkiverad', className: 'bg-muted text-muted-foreground' },
  approved: { label: 'Godkänd', className: 'bg-green-100 text-green-800' },
  rejected: { label: 'Avvisad', className: 'bg-red-100 text-red-800' },
  pending_approval: { label: 'Väntar', className: 'bg-orange-100 text-orange-800' },
}

const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  google: 'Google',
  print: 'Print',
  display: 'Display',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  email: 'E-post',
  print_flyer: 'Flyer',
}

const ALL_CHANNELS: CampaignChannel[] = ['facebook', 'instagram', 'google', 'print', 'display', 'linkedin', 'tiktok', 'email', 'print_flyer']
const ALL_STATUSES: CampaignStatus[] = ['draft', 'scheduled', 'active', 'completed', 'archived']

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchCampaign, updateCampaign, updateCampaignStatus, duplicateCampaign, archiveCampaign } = useCampaigns()
  const { fetchAssets } = useAssets()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('assets')

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<CampaignUpdateData>({})
  const [isSaving, setIsSaving] = useState(false)

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

  const handleOpenEdit = () => {
    if (!campaign) return
    setEditForm({
      name: campaign.name,
      description: campaign.description || '',
      status: campaign.status,
      channels: campaign.channels,
      start_date: campaign.start_date || '',
      end_date: campaign.end_date || '',
      target_persona: campaign.target_persona || null,
      key_messages: campaign.key_messages || [],
    })
    setIsEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!campaign) return

    setIsSaving(true)
    try {
      const updated = await updateCampaign(campaign.id, editForm)
      setCampaign(updated)
      setIsEditOpen(false)
      toast.success('Kampanjen har uppdaterats')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte spara ändringar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDuplicate = async () => {
    if (!campaign) return

    try {
      const newCampaign = await duplicateCampaign(campaign.id)
      toast.success(`Kampanjen har duplicerats som "${newCampaign.name}"`)
      navigate(`/hq/campaigns/${newCampaign.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte duplicera kampanjen')
    }
  }

  const handleArchive = async () => {
    if (!campaign) return

    try {
      await archiveCampaign(campaign.id)
      setCampaign({ ...campaign, status: 'archived' })
      toast.success('Kampanjen har arkiverats')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte arkivera kampanjen')
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
          {/* Channels */}
          {campaign.channels && campaign.channels.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              {campaign.channels.map((channel) => (
                <Badge key={channel} variant="outline" className="text-xs">
                  {CHANNEL_LABELS[channel] || channel}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenEdit}>
            <Pencil className="w-4 h-4 mr-1" />
            Redigera
          </Button>
          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="w-4 h-4 mr-1" />
            Duplicera
          </Button>
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
            <Button variant="ghost" onClick={handleArchive}>
              <Archive className="w-4 h-4 mr-1" />
              Arkivera
            </Button>
          )}
        </div>
      </div>

      {/* Target Persona & Key Messages Section */}
      {(campaign.target_persona || (campaign.key_messages && campaign.key_messages.length > 0)) && (
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          {/* Target Persona */}
          {campaign.target_persona && Object.keys(campaign.target_persona).length > 0 && (
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium">Målgrupp / Persona</h3>
              </div>
              <div className="space-y-2 text-sm">
                {Object.entries(campaign.target_persona).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                    <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Messages */}
          {campaign.key_messages && campaign.key_messages.length > 0 && (
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium">Nyckelbudskap</h3>
              </div>
              <ul className="space-y-2 text-sm">
                {campaign.key_messages.map((message, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-1 border-b border-border">
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2',
              activeTab === 'assets'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setActiveTab('assets')}
          >
            <Image className="w-4 h-4" />
            Material ({assets.length})
          </button>
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2',
              activeTab === 'variants'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setActiveTab('variants')}
          >
            <Layers className="w-4 h-4" />
            Lokala varianter
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'assets' && (
        <div>
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
      )}

      {activeTab === 'variants' && (
        <LocalVariantsTab campaignId={campaign.id} assets={assets} />
      )}

      {/* Edit Modal */}
      {isEditOpen && (
        <EditCampaignModal
          editForm={editForm}
          setEditForm={setEditForm}
          onSave={handleSaveEdit}
          onClose={() => setIsEditOpen(false)}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}

// ============ Edit Campaign Modal ============

interface EditCampaignModalProps {
  editForm: CampaignUpdateData
  setEditForm: React.Dispatch<React.SetStateAction<CampaignUpdateData>>
  onSave: () => void
  onClose: () => void
  isSaving: boolean
}

function EditCampaignModal({ editForm, setEditForm, onSave, onClose, isSaving }: EditCampaignModalProps) {
  const handleChannelToggle = (channel: CampaignChannel) => {
    const current = editForm.channels || []
    const newChannels = current.includes(channel)
      ? current.filter((c) => c !== channel)
      : [...current, channel]
    setEditForm({ ...editForm, channels: newChannels })
  }

  const handleKeyMessagesChange = (value: string) => {
    // Split by newlines and filter empty
    const messages = value.split('\n').filter((m) => m.trim())
    setEditForm({ ...editForm, key_messages: messages })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Redigera kampanj</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Namn</label>
            <Input
              value={editForm.name || ''}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Kampanjnamn"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Beskrivning</label>
            <textarea
              className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm"
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Beskrivning av kampanjen"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              value={editForm.status || 'draft'}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value as CampaignStatus })}
            >
              {ALL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_CONFIG[status].label}
                </option>
              ))}
            </select>
          </div>

          {/* Channels */}
          <div>
            <label className="block text-sm font-medium mb-2">Kanaler</label>
            <div className="flex flex-wrap gap-2">
              {ALL_CHANNELS.map((channel) => (
                <button
                  key={channel}
                  type="button"
                  className={cn(
                    'px-3 py-1 rounded-full text-sm border transition-colors',
                    (editForm.channels || []).includes(channel)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-muted'
                  )}
                  onClick={() => handleChannelToggle(channel)}
                >
                  {CHANNEL_LABELS[channel]}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Startdatum</label>
              <Input
                type="date"
                value={editForm.start_date || ''}
                onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value || null })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slutdatum</label>
              <Input
                type="date"
                value={editForm.end_date || ''}
                onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value || null })}
              />
            </div>
          </div>

          {/* Key Messages */}
          <div>
            <label className="block text-sm font-medium mb-1">Nyckelbudskap (ett per rad)</label>
            <textarea
              className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm"
              value={(editForm.key_messages || []).join('\n')}
              onChange={(e) => handleKeyMessagesChange(e.target.value)}
              placeholder="Skriv ett nyckelbudskap per rad"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Avbryt
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Sparar...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Spara
              </>
            )}
          </Button>
        </div>
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
