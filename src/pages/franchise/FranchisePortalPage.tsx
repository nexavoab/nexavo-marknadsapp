import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFranchiseeData } from '@/hooks/useFranchiseeData'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Megaphone, ChevronRight, FolderOpen, Calendar } from 'lucide-react'
import type { Campaign, CampaignStatus, CampaignChannel } from '@/types'

type FilterTab = 'all' | 'active' | 'pending'

const CHANNEL_ICONS: Record<CampaignChannel, string> = {
  facebook: '📘',
  instagram: '📸',
  linkedin: '💼',
  tiktok: '🎵',
  google: '🔍',
  print: '🖨️',
  display: '📺',
  email: '📧',
}

const STATUS_CONFIG: Record<CampaignStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  draft: { variant: 'secondary', label: 'Utkast' },
  scheduled: { variant: 'secondary', label: 'Schemalagd' },
  active: { variant: 'default', label: 'Aktiv' },
  completed: { variant: 'secondary', label: 'Avslutad' },
  archived: { variant: 'secondary', label: 'Arkiverad' },
  approved: { variant: 'default', label: 'Godkänd' },
  rejected: { variant: 'destructive', label: 'Avvisad' },
  pending_approval: { variant: 'outline', label: 'Väntande' },
}

export default function FranchisePortalPage() {
  const navigate = useNavigate()
  const { campaigns, loading, error } = useFranchiseeData()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const filteredCampaigns = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return campaigns.filter((c) => 
          c.status === 'active' || c.status === 'approved'
        )
      case 'pending':
        return campaigns.filter((c) => 
          c.status === 'draft' || 
          c.status === 'pending_approval' ||
          c.status === 'scheduled'
        )
      default:
        return campaigns
    }
  }, [campaigns, activeTab])

  const counts = useMemo(() => ({
    all: campaigns.length,
    active: campaigns.filter((c) => c.status === 'active' || c.status === 'approved').length,
    pending: campaigns.filter((c) => 
      c.status === 'draft' || c.status === 'pending_approval' || c.status === 'scheduled'
    ).length,
  }), [campaigns])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">📢 Kampanjportal</h1>
          <p className="text-muted-foreground mt-1">Hantera och granska kampanjer</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card rounded-xl border border-border p-6 animate-pulse"
            >
              <div className="h-6 bg-muted rounded w-3/4 mb-3" />
              <div className="h-4 bg-muted/60 rounded w-full mb-2" />
              <div className="h-4 bg-muted/60 rounded w-2/3 mb-4" />
              <div className="h-8 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
          <Megaphone className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Något gick fel</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">📢 Kampanjportal</h1>
        <p className="text-muted-foreground mt-1">Hantera och granska kampanjer</p>
      </div>

      {/* Filter tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            Alla
            <Badge variant="secondary" className="ml-1 text-xs">
              {counts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            Aktiva
            <Badge variant="secondary" className="ml-1 text-xs">
              {counts.active}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            Väntande godkännande
            <Badge variant="secondary" className="ml-1 text-xs">
              {counts.pending}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredCampaigns.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
            <FolderOpen className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {activeTab === 'all' 
              ? 'Inga kampanjer just nu'
              : activeTab === 'active'
              ? 'Inga aktiva kampanjer'
              : 'Inga väntande kampanjer'}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {activeTab === 'all'
              ? 'Ditt HQ förbereder nytt material. Kom tillbaka snart!'
              : activeTab === 'active'
              ? 'Det finns inga aktiva kampanjer att visa just nu.'
              : 'Det finns inga kampanjer som väntar på godkännande.'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onClick={() => navigate(`/portal/campaign/${campaign.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface CampaignCardProps {
  campaign: Campaign
  onClick: () => void
}

function CampaignCard({ campaign, onClick }: CampaignCardProps) {
  const statusConfig = STATUS_CONFIG[campaign.status] || { variant: 'secondary', label: campaign.status }

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1">
            {campaign.name}
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={statusConfig.variant}>
              {statusConfig.label}
            </Badge>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
        {campaign.description && (
          <CardDescription className="line-clamp-2">
            {campaign.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {/* Channel icons */}
        <div className="flex flex-wrap gap-2 mb-3">
          {campaign.channels.map((channel) => (
            <Badge 
              key={channel} 
              variant="secondary" 
              className="text-xs"
              title={channel}
            >
              {CHANNEL_ICONS[channel] || '📢'} {channel}
            </Badge>
          ))}
        </div>

        {/* Date range */}
        {(campaign.start_date || campaign.end_date) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {campaign.start_date && (
              <span>{new Date(campaign.start_date).toLocaleDateString('sv-SE')}</span>
            )}
            {campaign.start_date && campaign.end_date && <span>–</span>}
            {campaign.end_date && (
              <span>{new Date(campaign.end_date).toLocaleDateString('sv-SE')}</span>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end">
          <span className="text-sm font-medium text-primary group-hover:underline">
            Visa detaljer →
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
