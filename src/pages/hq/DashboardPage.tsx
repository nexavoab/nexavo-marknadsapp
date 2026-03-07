import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Palette, Users, Plus, Megaphone, Download, FolderOpen, Inbox, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { CampaignStatus } from '@/types'

interface DashboardStats {
  activeCampaigns: number | null
  totalDownloads: number | null
  franchiseeCount: number | null
  assetCount: number | null
}

interface RecentCampaign {
  id: string
  name: string
  status: CampaignStatus
  formatCount: number
}

interface AttentionItems {
  pendingApproval: number
  inactiveFranchisees: number
}

const STATUS_STYLES: Record<CampaignStatus, { color: string; icon: string; label: string }> = {
  active: { color: 'text-green-600', icon: '🟢', label: 'aktiv' },
  draft: { color: 'text-yellow-600', icon: '🟡', label: 'utkast' },
  scheduled: { color: 'text-blue-600', icon: '🔵', label: 'schemalagd' },
  completed: { color: 'text-muted-foreground', icon: '✅', label: 'klar' },
  archived: { color: 'text-muted-foreground', icon: '📦', label: 'arkiverad' },
}

function StatCard({ 
  label, 
  value, 
  loading,
  trend,
  trendLabel,
  icon: Icon
}: { 
  label: string
  value: number | null
  loading: boolean
  trend?: 'up' | 'down'
  trendLabel?: string
  icon?: React.ElementType
}) {
  // Show 0 if value is null after loading completes
  const displayValue = loading ? null : (value ?? 0)
  
  return (
    <Card className="p-5 border border-border/60 shadow-sm rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
      {displayValue === null ? (
        <div className="h-8 w-24 bg-muted animate-pulse rounded mb-2" />
      ) : (
        <div className="text-3xl font-bold text-foreground">{displayValue}</div>
      )}
      {trendLabel && (
        <p className={cn(
          'text-xs mt-1 flex items-center gap-1',
          trend === 'up' ? 'text-green-600' : 'text-red-500'
        )}>
          {trend === 'up' ? '↑' : '↓'} {trendLabel}
        </p>
      )}
    </Card>
  )
}

function AttentionSection({
  pendingApproval,
  inactiveFranchisees,
  onViewCampaigns,
  onViewFranchisees,
}: {
  pendingApproval: number
  inactiveFranchisees: number
  onViewCampaigns: () => void
  onViewFranchisees: () => void
}) {
  const hasItems = pendingApproval > 0 || inactiveFranchisees > 0

  if (!hasItems) {
    return (
      <Card className="p-4 border-green-200 bg-green-50/50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-green-900">Allt ser bra ut! ✓</h3>
            <p className="text-sm text-green-700">Inga åtgärder krävs just nu</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 border-amber-200 bg-amber-50/50">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertCircle className="h-5 w-5 text-amber-600" />
        </div>
        <h3 className="font-medium text-amber-900">Behöver uppmärksamhet</h3>
      </div>
      <div className="space-y-2">
        {pendingApproval > 0 && (
          <button
            onClick={onViewCampaigns}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-white border border-amber-200 hover:border-amber-300 hover:shadow-sm transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <Megaphone className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-foreground">
                <strong>{pendingApproval}</strong> kampanj{pendingApproval !== 1 ? 'er' : ''} väntar på godkännande
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        )}
        {inactiveFranchisees > 0 && (
          <button
            onClick={onViewFranchisees}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-white border border-amber-200 hover:border-amber-300 hover:shadow-sm transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-foreground">
                <strong>{inactiveFranchisees}</strong> franchisetagare ej aktiverad{inactiveFranchisees !== 1 ? 'e' : ''}
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        )}
      </div>
    </Card>
  )
}

export default function DashboardPage() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    activeCampaigns: null,
    totalDownloads: null,
    franchiseeCount: null,
    assetCount: null,
  })
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([])
  const [attentionItems, setAttentionItems] = useState<AttentionItems>({
    pendingApproval: 0,
    inactiveFranchisees: 0,
  })
  const [loading, setLoading] = useState(true)

  // Max 1.5s skeleton loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 1500)
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    async function fetchDashboardData() {
      if (!appUser?.organization_id) return

      try {
        // Fetch all stats in parallel
        const [
          activeCampaignsRes,
          downloadsRes,
          franchiseesRes,
          assetsRes,
          campaignsRes,
          pendingCampaignsRes,
          inactiveFranchiseesRes,
        ] = await Promise.all([
          // Active campaigns count
          supabase
            .from('campaigns')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', appUser.organization_id)
            .eq('status', 'active'),
          // Total downloads
          supabase
            .from('assets')
            .select('download_count')
            .eq('organization_id', appUser.organization_id),
          // Active franchisees count
          supabase
            .from('franchisees')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', appUser.organization_id)
            .eq('is_active', true),
          // Total assets count
          supabase
            .from('assets')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', appUser.organization_id),
          // Recent campaigns with asset counts
          supabase
            .from('campaigns')
            .select('id, name, status')
            .eq('organization_id', appUser.organization_id)
            .order('created_at', { ascending: false })
            .limit(5),
          // Campaigns pending approval (draft status)
          supabase
            .from('campaigns')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', appUser.organization_id)
            .eq('status', 'draft'),
          // Inactive franchisees
          supabase
            .from('franchisees')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', appUser.organization_id)
            .eq('is_active', false),
        ])

        // Calculate total downloads
        const totalDownloads = downloadsRes.data?.reduce(
          (sum, a) => sum + (a.download_count || 0),
          0
        ) ?? 0

        setStats({
          activeCampaigns: activeCampaignsRes.count ?? 0,
          totalDownloads,
          franchiseeCount: franchiseesRes.count ?? 0,
          assetCount: assetsRes.count ?? 0,
        })

        // Set attention items
        setAttentionItems({
          pendingApproval: pendingCampaignsRes.count ?? 0,
          inactiveFranchisees: inactiveFranchiseesRes.count ?? 0,
        })

        // Fetch format counts efficiently (no N+1)
        if (campaignsRes.data) {
          const { data: allAssets } = await supabase
            .from('assets')
            .select('campaign_id')
            .eq('organization_id', appUser.organization_id)

          const countMap = (allAssets ?? []).reduce((acc, a) => {
            if (a.campaign_id) acc[a.campaign_id] = (acc[a.campaign_id] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          const campaignsWithCounts = campaignsRes.data.map(c => ({
            id: c.id,
            name: c.name,
            status: c.status as CampaignStatus,
            formatCount: countMap[c.id] || 0,
          }))
          setRecentCampaigns(campaignsWithCounts)
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
        toast.error('Kunde inte ladda dashboard-data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [appUser?.organization_id])

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          God morgon, {appUser?.name?.split(' ')[0] ?? 'Wasim'} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Här är en översikt av din marknadsapp
        </p>
      </div>

      {/* Attention Section */}
      {!loading && (
        <AttentionSection
          pendingApproval={attentionItems.pendingApproval}
          inactiveFranchisees={attentionItems.inactiveFranchisees}
          onViewCampaigns={() => navigate('/hq/campaigns')}
          onViewFranchisees={() => navigate('/hq/franchisees')}
        />
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Aktiva kampanjer"
          value={stats.activeCampaigns}
          loading={loading}
          icon={Megaphone}
          trend="up"
          trendLabel="vs förra månaden"
        />
        <StatCard
          label="Franchisetagare"
          value={stats.franchiseeCount}
          loading={loading}
          icon={Users}
          trend="up"
          trendLabel="aktiva"
        />
        <StatCard
          label="Nedladdningar"
          value={stats.totalDownloads}
          loading={loading}
          icon={Download}
          trendLabel="senaste 30 dagarna"
        />
        <StatCard
          label="Material"
          value={stats.assetCount}
          loading={loading}
          icon={FolderOpen}
          trendLabel="tillgängliga"
        />
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Revenue Over Time — 2/3 bredd på desktop */}
        <div className="col-span-1 lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Kampanjaktivitet</h3>
                <p className="text-xs text-muted-foreground">Nedladdningar per månad</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={[
                { month: 'Sep', nedladdningar: 12, kampanjer: 2 },
                { month: 'Okt', nedladdningar: 28, kampanjer: 3 },
                { month: 'Nov', nedladdningar: 19, kampanjer: 2 },
                { month: 'Dec', nedladdningar: 35, kampanjer: 4 },
                { month: 'Jan', nedladdningar: 22, kampanjer: 3 },
                { month: 'Feb', nedladdningar: 41, kampanjer: 5 },
                { month: 'Mar', nedladdningar: 38, kampanjer: 4 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="nedladdningar" stroke="oklch(0.60 0.18 252)" strokeWidth={2} dot={false} name="Nedladdningar" />
                <Line type="monotone" dataKey="kampanjer" stroke="oklch(0.60 0.22 295)" strokeWidth={2} dot={false} name="Kampanjer" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Franchisetagare per region — 1/3 bredd på desktop */}
        <div className="col-span-1 lg:col-span-1">
          <Card className="p-6 h-full">
            <h3 className="font-semibold text-foreground mb-1">Franchisetagare</h3>
            <p className="text-xs text-muted-foreground mb-4">Per region</p>
            <div className="space-y-3">
              {[
                { region: 'Stockholm', count: 4, pct: 33 },
                { region: 'Göteborg', count: 3, pct: 25 },
                { region: 'Malmö', count: 2, pct: 17 },
                { region: 'Uppsala', count: 2, pct: 17 },
                { region: 'Övriga', count: 1, pct: 8 },
              ].map(r => (
                <div key={r.region}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground">{r.region}</span>
                    <span className="text-muted-foreground font-medium">{r.count}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${r.pct}%`, backgroundColor: 'oklch(0.60 0.18 252)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom row: 3 kolumner */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Kampanjstatus donut */}
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-1">Kampanjstatus</h3>
          <p className="text-xs text-muted-foreground mb-3">Fördelning</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Aktiva', value: 2 },
                  { name: 'Utkast', value: 3 },
                  { name: 'Klara', value: 1 },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                dataKey="value"
              >
                {['oklch(0.60 0.18 252)', 'oklch(0.60 0.22 295)', 'oklch(0.70 0.15 160)'].map((color, i) => (
                  <Cell key={i} fill={color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: '12px', backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Snabbåtgärder */}
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Snabbåtgärder</h3>
          <div className="space-y-2">
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/hq/campaigns/new')}>
              <Plus className="h-4 w-4 mr-2" /> Ny kampanj
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/hq/brand')}>
              <Palette className="h-4 w-4 mr-2" /> Redigera brand
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/hq/franchisees')}>
              <Users className="h-4 w-4 mr-2" /> Franchisetagare
            </Button>
          </div>
        </Card>

        {/* Systemstatus */}
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Systemstatus</h3>
          <div className="space-y-3">
            {[
              { label: 'API', status: 'Online', ok: true },
              { label: 'Bildgenerering', status: 'Online', ok: true },
              { label: 'Lagring', status: 'Online', ok: true },
              { label: 'E-post', status: 'Online', ok: true },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{s.label}</span>
                <span className={`flex items-center gap-1 font-medium ${s.ok ? 'text-green-600' : 'text-red-500'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent campaigns */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Senaste kampanjer
        </h2>
        <Card className="divide-y divide-border">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <div className="h-5 w-5 bg-muted animate-pulse rounded" />
                <div className="flex-1">
                  <div className="h-4 w-48 bg-muted animate-pulse rounded mb-1" />
                  <div className="h-3 w-24 bg-muted/60 animate-pulse rounded" />
                </div>
              </div>
            ))
          ) : recentCampaigns.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
              <Inbox className="h-10 w-10 text-muted-foreground/50" />
              <span>Inga kampanjer än</span>
            </div>
          ) : (
            recentCampaigns.map((campaign) => {
              const style = STATUS_STYLES[campaign.status]
              return (
                <button
                  key={campaign.id}
                  className="w-full p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => navigate(`/hq/campaigns/${campaign.id}`)}
                >
                  <span className="text-lg">{style.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      {campaign.name}
                    </div>
                    <div className={`text-sm ${style.color}`}>
                      {style.label} · {campaign.formatCount} format
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </Card>
      </div>

    </div>
  )
}
