import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFranchiseeData } from '@/hooks/useFranchiseeData'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Megaphone, ChevronRight, FolderOpen, Calendar, Lock, User } from 'lucide-react'
import type { Campaign, CampaignStatus, CampaignChannel, Franchisee } from '@/types'

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
  print_flyer: '🖨️',
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
  const { appUser } = useAuth()
  const { campaigns, loading, error } = useFranchiseeData()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [franchisee, setFranchisee] = useState<Franchisee | null>(null)
  const [upcomingCampaigns, setUpcomingCampaigns] = useState<Campaign[]>([])

  // Fetch franchisee profile
  useEffect(() => {
    async function fetchFranchiseeProfile() {
      if (!appUser?.franchisee_id || !appUser?.organization_id) return
      
      const { data } = await supabase
        .from('franchisees')
        .select('id, name, region, address')
        .eq('id', appUser.franchisee_id)
        .eq('organization_id', appUser.organization_id)
        .single()
      
      if (data) setFranchisee(data as Franchisee)
    }
    fetchFranchiseeProfile()
  }, [appUser?.franchisee_id, appUser?.organization_id])

  // Fetch upcoming campaigns (draft/planned, not yet hq_approved)
  useEffect(() => {
    async function fetchUpcomingCampaigns() {
      if (!appUser?.organization_id) return
      
      const { data } = await supabase
        .from('campaigns')
        .select('id, name, description, status, channels, start_date, end_date, created_at')
        .eq('organization_id', appUser.organization_id)
        .in('status', ['draft', 'scheduled'])
        .eq('hq_approved', false)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (data) setUpcomingCampaigns(data as Campaign[])
    }
    fetchUpcomingCampaigns()
  }, [appUser?.organization_id])

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
      {/* Profile Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-5 border border-primary/20">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {franchisee?.name || appUser?.name || 'Välkommen!'}
            </h2>
            {franchisee?.address?.city && (
              <p className="text-sm text-muted-foreground">{franchisee.address.city}</p>
            )}
            {franchisee?.region && !franchisee?.address?.city && (
              <p className="text-sm text-muted-foreground">{franchisee.region}</p>
            )}
          </div>
        </div>
      </div>

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

      {/* Upcoming campaigns section */}
      {upcomingCampaigns.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-muted-foreground">Snart tillgängligt</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {upcomingCampaigns.map((campaign) => (
              <Card 
                key={campaign.id} 
                className="relative overflow-hidden cursor-not-allowed"
              >
                {/* Lock overlay */}
                <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center">
                  <div className="bg-muted rounded-full p-3">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg text-muted-foreground line-clamp-1">
                      {campaign.name}
                    </CardTitle>
                    <Badge variant="outline" className="text-muted-foreground">
                      Förbereds
                    </Badge>
                  </div>
                  {campaign.description && (
                    <CardDescription className="line-clamp-2">
                      {campaign.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {campaign.channels.map((channel) => (
                      <Badge 
                        key={channel} 
                        variant="secondary" 
                        className="text-xs opacity-50"
                      >
                        {CHANNEL_ICONS[channel] || '📢'} {channel}
                      </Badge>
                    ))}
                  </div>
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
                </CardContent>
              </Card>
            ))}
          </div>
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
