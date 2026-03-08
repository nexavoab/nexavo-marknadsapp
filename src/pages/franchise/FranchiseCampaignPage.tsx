import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFranchiseeData } from '@/hooks/useFranchiseeData'
import { DeviceMockup, getFormatDisplayName } from '@/components/campaign/DeviceMockup'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Campaign, Asset, TemplateFormat } from '@/types'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Phone,
  MapPin,
  User,
  Loader2,
} from 'lucide-react'

interface LocalCustomization {
  phone: string
  city: string
  contactName: string
}

const CHANNEL_ICONS: Record<string, string> = {
  facebook: '📘',
  instagram: '📸',
  linkedin: '💼',
  tiktok: '🎵',
  google: '🔍',
  print: '🖨️',
  display: '📺',
  email: '📧',
}

export default function FranchiseCampaignPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchCampaignById, fetchCampaignAssets, updateCampaignStatus } = useFranchiseeData()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectComment, setRejectComment] = useState('')
  
  // Local customization state
  const [customization, setCustomization] = useState<LocalCustomization>({
    phone: '',
    city: '',
    contactName: '',
  })

  // Selected format for preview
  const [selectedFormat, setSelectedFormat] = useState<TemplateFormat | null>(null)

  useEffect(() => {
    if (!id) return

    async function loadData() {
      setLoading(true)
      try {
        const [campaignData, assetsData] = await Promise.all([
          fetchCampaignById(id!),
          fetchCampaignAssets(id!),
        ])
        setCampaign(campaignData)
        setAssets(assetsData)
        
        // Set first asset's format as default
        if (assetsData.length > 0 && assetsData[0].format) {
          setSelectedFormat(assetsData[0].format)
        }
      } catch (err) {
        console.error('Failed to load campaign:', err)
        toast.error('Kunde inte ladda kampanjdata')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, fetchCampaignById, fetchCampaignAssets])

  async function handleApprove() {
    if (!campaign) return
    
    setIsApproving(true)
    try {
      const success = await updateCampaignStatus(campaign.id, 'approved')
      if (success) {
        setCampaign({ ...campaign, status: 'approved' })
        toast.success('Kampanj godkänd!', {
          description: 'Kampanjen är nu godkänd och redo för publicering.',
        })
      } else {
        toast.error('Kunde inte godkänna kampanjen')
      }
    } catch (err) {
      console.error('Failed to approve:', err)
      toast.error('Ett fel uppstod vid godkännande')
    } finally {
      setIsApproving(false)
    }
  }

  async function handleReject() {
    if (!campaign) return
    
    setIsRejecting(true)
    try {
      const success = await updateCampaignStatus(campaign.id, 'rejected')
      if (success) {
        setCampaign({ ...campaign, status: 'rejected' })
        // Store comment locally (would be saved to DB in production)
        console.log('Rejection comment:', rejectComment)
        toast.success('Kampanj avvisad', {
          description: rejectComment 
            ? `Kommentar: ${rejectComment}` 
            : 'Kampanjen har markerats som avvisad.',
        })
        setRejectDialogOpen(false)
        setRejectComment('')
      } else {
        toast.error('Kunde inte avvisa kampanjen')
      }
    } catch (err) {
      console.error('Failed to reject:', err)
      toast.error('Ett fel uppstod vid avvisning')
    } finally {
      setIsRejecting(false)
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      draft: { variant: 'secondary', label: 'Utkast' },
      active: { variant: 'default', label: 'Aktiv' },
      approved: { variant: 'default', label: 'Godkänd' },
      rejected: { variant: 'destructive', label: 'Avvisad' },
      pending_approval: { variant: 'outline', label: 'Väntar godkännande' },
      scheduled: { variant: 'secondary', label: 'Schemalagd' },
      completed: { variant: 'secondary', label: 'Avslutad' },
    }
    const config = variants[status] || { variant: 'secondary', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // Get selected asset for preview
  const selectedAsset = assets.find((a) => a.format === selectedFormat) || assets[0]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <EmptyState
        icon="📂"
        title="Kampanj hittades inte"
        description="Kampanjen du letar efter kunde inte hittas."
        action={{
          label: 'Tillbaka till portalen',
          onClick: () => navigate('/portal'),
        }}
      />
    )
  }

  const canApproveOrReject = campaign.status !== 'approved' && campaign.status !== 'rejected'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/portal')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Tillbaka
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
            {getStatusBadge(campaign.status)}
          </div>
          {campaign.description && (
            <p className="text-muted-foreground mt-1">{campaign.description}</p>
          )}
        </div>
      </div>

      {/* Channels */}
      <div className="flex flex-wrap gap-2">
        {campaign.channels.map((channel) => (
          <Badge key={channel} variant="outline" className="text-sm">
            {CHANNEL_ICONS[channel] || '📢'} {channel}
          </Badge>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Ad Preview */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Annonsförhandsvisning</h2>
          
          {/* Format selector */}
          {assets.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {assets
                .filter((a) => a.format)
                .map((asset) => (
                  <Button
                    key={asset.id}
                    variant={selectedFormat === asset.format ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFormat(asset.format!)}
                  >
                    {getFormatDisplayName(asset.format!)}
                  </Button>
                ))}
            </div>
          )}

          {/* Device mockup with preview */}
          <div className="flex justify-center py-8 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl">
            {selectedAsset && selectedFormat ? (
              <DeviceMockup
                format={selectedFormat}
                imageUrl={selectedAsset.public_url || selectedAsset.thumbnail_url}
              >
                {/* Overlay with local customization */}
                <div className="absolute bottom-4 left-4 right-4 bg-black/70 rounded-lg p-3 text-white text-xs space-y-1">
                  {customization.contactName && (
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3" />
                      <span>{customization.contactName}</span>
                    </div>
                  )}
                  {customization.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      <span>{customization.city}</span>
                    </div>
                  )}
                  {customization.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      <span>{customization.phone}</span>
                    </div>
                  )}
                </div>
              </DeviceMockup>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <p>Inget material tillgängligt för förhandsvisning</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Local customization + Actions */}
        <div className="space-y-6">
          {/* Local customization fields */}
          <div className="bg-card rounded-lg border border-border p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Lokal anpassning</h3>
            <p className="text-sm text-muted-foreground">
              Anpassa annonsen med din lokala information. Ändringarna visas direkt i förhandsvisningen.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contactName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Kontaktnamn
                </Label>
                <Input
                  id="contactName"
                  placeholder="t.ex. Anna Andersson"
                  value={customization.contactName}
                  onChange={(e) =>
                    setCustomization((prev) => ({ ...prev, contactName: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Stad
                </Label>
                <Input
                  id="city"
                  placeholder="t.ex. Stockholm"
                  value={customization.city}
                  onChange={(e) =>
                    setCustomization((prev) => ({ ...prev, city: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefon
                </Label>
                <Input
                  id="phone"
                  placeholder="t.ex. 08-123 456 78"
                  value={customization.phone}
                  onChange={(e) =>
                    setCustomization((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Approve/Reject actions */}
          {canApproveOrReject && (
            <div className="bg-card rounded-lg border border-border p-6 space-y-4">
              <h3 className="font-semibold text-foreground">Granska kampanj</h3>
              <p className="text-sm text-muted-foreground">
                Granska materialet och godkänn eller avvisa kampanjen.
              </p>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isApproving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Godkänn
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={isRejecting}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Avvisa
                </Button>
              </div>
            </div>
          )}

          {/* Status message if already approved/rejected */}
          {!canApproveOrReject && (
            <div className={`rounded-lg border p-6 ${
              campaign.status === 'approved' 
                ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-3">
                {campaign.status === 'approved' ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-800 dark:text-green-200">
                        Kampanj godkänd
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Denna kampanj har godkänts och är redo för publicering.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-red-600" />
                    <div>
                      <h3 className="font-semibold text-red-800 dark:text-red-200">
                        Kampanj avvisad
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Denna kampanj har avvisats. Kontakta HQ för mer information.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avvisa kampanj</DialogTitle>
            <DialogDescription>
              Ange en kommentar för varför du avvisar kampanjen. Detta hjälper HQ att förstå problemet.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectComment">Kommentar</Label>
              <textarea
                id="rejectComment"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Beskriv varför du avvisar kampanjen..."
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false)
                setRejectComment('')
              }}
            >
              Avbryt
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting}
            >
              {isRejecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Avvisa kampanj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
