import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Megaphone,
  Users,
  Download,
  FolderOpen,
  Inbox,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Plus,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { toast } from 'sonner'
import type { CampaignStatus } from '@/types'

// Dashboard components
import {
  KPICard,
  WidgetCard,
  RankedList,
  OnboardingChecklist,
  useOnboardingState,
  createDefaultOnboardingSteps,
  QuickActions,
  createContextualQuickActions,
} from '@/components/dashboard'

interface DashboardStats {
  activeCampaigns: number | null
  totalDownloads: number | null
  franchiseeCount: number | null
  assetCount: number | null
  // Trends (percentage change vs last month)
  campaignsTrend: number
  downloadsTrend: number
  franchiseeTrend: number
  assetTrend: number
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

interface FranchiseeActivity {
  id: string
  name: string
  campaignCount: number
  activityScore: number
}

interface PendingAction {
  id: string
  name: string
  type: 'campaign' | 'asset'
  daysWaiting: number
}

const STATUS_STYLES: Record<
  CampaignStatus,
  { color: string; icon: string; label: string }
> = {
  active: { color: 'text-green-600', icon: '🟢', label: 'aktiv' },
  draft: { color: 'text-yellow-600', icon: '🟡', label: 'utkast' },
  scheduled: { color: 'text-blue-600', icon: '🔵', label: 'schemalagd' },
  completed: { color: 'text-muted-foreground', icon: '✅', label: 'klar' },
  archived: { color: 'text-muted-foreground', icon: '📦', label: 'arkiverad' },
}

// Mock data for demo purposes (will be replaced with real data)
const MOCK_ACTIVITY_DATA = [
  { month: 'Sep', downloads: 12, prevDownloads: 8, campaigns: 2 },
  { month: 'Okt', downloads: 28, prevDownloads: 15, campaigns: 3 },
  { month: 'Nov', downloads: 19, prevDownloads: 22, campaigns: 2 },
  { month: 'Dec', downloads: 35, prevDownloads: 28, campaigns: 4 },
  { month: 'Jan', downloads: 22, prevDownloads: 18, campaigns: 3 },
  { month: 'Feb', downloads: 41, prevDownloads: 35, campaigns: 5 },
  { month: 'Mar', downloads: 38, prevDownloads: 30, campaigns: 4 },
]

const MOCK_FRANCHISEE_ACTIVITY: FranchiseeActivity[] = [
  { id: '1', name: 'Stockholm City', campaignCount: 12, activityScore: 95 },
  { id: '2', name: 'Göteborg Centrum', campaignCount: 8, activityScore: 78 },
  { id: '3', name: 'Malmö Syd', campaignCount: 6, activityScore: 65 },
  { id: '4', name: 'Uppsala Nord', campaignCount: 4, activityScore: 52 },
  { id: '5', name: 'Örebro Väst', campaignCount: 2, activityScore: 35 },
]

const MOCK_PENDING_ACTIONS: PendingAction[] = [
  { id: '1', name: 'Sommarkampanj 2025', type: 'campaign', daysWaiting: 3 },
  { id: '2', name: 'Höstkollektion', type: 'campaign', daysWaiting: 1 },
]

// Attention Section Component
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
            <p className="text-sm text-green-700">
              Inga åtgärder krävs just nu
            </p>
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
        <h3 className="font-medium text-amber-900">Behöver din uppmärksamhet</h3>
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
                <strong>{pendingApproval}</strong> kampanj
                {pendingApproval !== 1 ? 'er' : ''} väntar på godkännande
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
                <strong>{inactiveFranchisees}</strong> franchisetagare har ej
                aktiverat kampanj
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        )}
      </div>
    </Card>
  )
}

// Empty State Component
function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onAction,
}: {
  icon: React.ElementType
  title: string
  description: string
  ctaLabel: string
  onAction: () => void
}) {
  return (
    <div className="py-8 text-center flex flex-col items-center gap-3">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <Button onClick={onAction} className="mt-2">
        <Plus className="h-4 w-4 mr-2" />
        {ctaLabel}
      </Button>
    </div>
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
    campaignsTrend: 0,
    downloadsTrend: 0,
    franchiseeTrend: 0,
    assetTrend: 0,
  })
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([])
  const [attentionItems, setAttentionItems] = useState<AttentionItems>({
    pendingApproval: 0,
    inactiveFranchisees: 0,
  })
  const [loading, setLoading] = useState(true)

  // Onboarding state
  const { completedSteps, isDismissed, dismiss } =
    useOnboardingState()

  // Context for quick actions and onboarding
  const context = {
    hasFranchisees: (stats.franchiseeCount ?? 0) > 0,
    hasCampaigns: (stats.activeCampaigns ?? 0) > 0,
    hasBrand: true, // TODO: Check from organization data
    hasIntegration: false, // TODO: Check from integrations
  }

  // Quick actions
  const quickActions = createContextualQuickActions(navigate, context)

  // Onboarding steps
  const onboardingSteps = createDefaultOnboardingSteps(
    completedSteps,
    {
      onInviteFranchisee: () => navigate('/hq/franchisees'),
      onCreateCampaign: () => navigate('/hq/campaigns/new'),
      onCompleteBrand: () => navigate('/hq/brand'),
      onConnectIntegration: () => navigate('/hq/settings'),
    },
    context
  )

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
        const totalDownloads =
          downloadsRes.data?.reduce(
            (sum, a) => sum + (a.download_count || 0),
            0
          ) ?? 0

        // Calculate mock trends (in real app, compare with previous period)
        const mockTrends = {
          campaignsTrend: 12,
          downloadsTrend: 23,
          franchiseeTrend: 8,
          assetTrend: 15,
        }

        setStats({
          activeCampaigns: activeCampaignsRes.count ?? 0,
          totalDownloads,
          franchiseeCount: franchiseesRes.count ?? 0,
          assetCount: assetsRes.count ?? 0,
          ...mockTrends,
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

          const countMap = (allAssets ?? []).reduce(
            (acc, a) => {
              if (a.campaign_id) acc[a.campaign_id] = (acc[a.campaign_id] || 0) + 1
              return acc
            },
            {} as Record<string, number>
          )

          const campaignsWithCounts = campaignsRes.data.map((c) => ({
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

  // Export handlers
  const handleExportCSV = (widgetName: string) => {
    toast.info(`Exporterar ${widgetName} som CSV...`)
    // TODO: Implement CSV export
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-foreground">
          God morgon, {appUser?.name?.split(' ')[0] ?? 'Wasim'} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Här är en översikt av din marknadsapp
        </p>
      </div>

      {/* 1. Attention Section (needs action) */}
      {!loading && (
        <AttentionSection
          pendingApproval={attentionItems.pendingApproval}
          inactiveFranchisees={attentionItems.inactiveFranchisees}
          onViewCampaigns={() => navigate('/hq/campaigns')}
          onViewFranchisees={() => navigate('/hq/franchisees')}
        />
      )}

      {/* Quick Actions - right under attention */}
      {!loading && <QuickActions actions={quickActions} className="mt-4" />}

      {/* Onboarding Checklist (for new users) */}
      {!loading && !isDismissed && (
        <OnboardingChecklist steps={onboardingSteps} onDismiss={dismiss} />
      )}

      {/* 2. KPI Row - clear reading order */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Aktiva kampanjer"
          description="Pågående kampanjer just nu"
          value={stats.activeCampaigns}
          loading={loading}
          icon={Megaphone}
          trend={stats.campaignsTrend}
          trendLabel="vs föregående månad"
          emptyState={{
            message: 'Inga aktiva kampanjer',
            ctaLabel: 'Skapa nu',
            onAction: () => navigate('/hq/campaigns/new'),
          }}
          details={{
            title: 'Kampanjöversikt',
            content: (
              <div className="space-y-2 text-sm">
                <p>Aktiva: {stats.activeCampaigns ?? 0}</p>
                <p>Utkast: {attentionItems.pendingApproval}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/hq/campaigns')}
                >
                  Se alla kampanjer
                </Button>
              </div>
            ),
          }}
        />
        <KPICard
          label="Franchisetagare"
          description="Aktiva partners i nätverket"
          value={stats.franchiseeCount}
          loading={loading}
          icon={Users}
          trend={stats.franchiseeTrend}
          trendLabel="vs föregående månad"
          emptyState={{
            message: 'Inga franchisetagare ännu',
            ctaLabel: 'Bjud in',
            onAction: () => navigate('/hq/franchisees'),
          }}
        />
        <KPICard
          label="Nedladdningar"
          description="Totalt antal materialuttag"
          value={stats.totalDownloads}
          loading={loading}
          icon={Download}
          trend={stats.downloadsTrend}
          trendLabel="vs föregående månad"
        />
        <KPICard
          label="Material"
          description="Tillgängliga i materialbanken"
          value={stats.assetCount}
          loading={loading}
          icon={FolderOpen}
          trend={stats.assetTrend}
          trendLabel="vs föregående månad"
          emptyState={{
            message: 'Ingen material ännu',
            ctaLabel: 'Ladda upp',
            onAction: () => navigate('/hq/assets'),
          }}
        />
      </div>

      {/* 3. Trend Section - what has changed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Line chart - trend over time (2/3 width) */}
        <WidgetCard
          title="Kampanjaktivitet"
          subtitle="Nedladdningar per månad, senaste 7 månader vs föregående period"
          className="lg:col-span-2"
          onExportCSV={() => handleExportCSV('Kampanjaktivitet')}
          onViewAll={() => navigate('/hq/analytics')}
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={MOCK_ACTIVITY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="downloads"
                stroke="oklch(0.60 0.18 252)"
                strokeWidth={2}
                dot={false}
                name="Denna period"
              />
              <Line
                type="monotone"
                dataKey="prevDownloads"
                stroke="oklch(0.60 0.18 252)"
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeOpacity={0.5}
                dot={false}
                name="Föregående period"
              />
            </LineChart>
          </ResponsiveContainer>
        </WidgetCard>

        {/* Bar chart - downloads per campaign (1/3 width) */}
        <WidgetCard
          title="Nedladdningar per kategori"
          subtitle="Fördelning senaste 30 dagarna"
          onExportCSV={() => handleExportCSV('Nedladdningar per kategori')}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={[
                { name: 'Sociala medier', value: 45 },
                { name: 'Print', value: 32 },
                { name: 'Digital annons', value: 28 },
                { name: 'Skyltning', value: 18 },
              ]}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 11 }}
                width={90}
              />
              <Tooltip
                contentStyle={{
                  fontSize: '12px',
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" fill="oklch(0.60 0.18 252)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </WidgetCard>
      </div>

      {/* 4. Distribution Section - segments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Kampanjstatus donut */}
        <WidgetCard
          title="Kampanjstatus"
          subtitle="Fördelning av alla kampanjer"
          onExportCSV={() => handleExportCSV('Kampanjstatus')}
        >
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Aktiva', value: stats.activeCampaigns ?? 2 },
                  { name: 'Utkast', value: attentionItems.pendingApproval || 3 },
                  { name: 'Klara', value: 1 },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                dataKey="value"
              >
                {[
                  'oklch(0.60 0.18 252)',
                  'oklch(0.75 0.15 85)',
                  'oklch(0.70 0.15 160)',
                ].map((color, i) => (
                  <Cell key={i} fill={color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontSize: '12px',
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </WidgetCard>

        {/* Mest aktiva franchisetagare - WAS-387 */}
        <WidgetCard
          title="Mest aktiva franchisetagare"
          subtitle="Baserat på kampanjaktivitet senaste 30 dagarna"
          onExportCSV={() => handleExportCSV('Franchisetagare aktivitet')}
          onViewAll={() => navigate('/hq/franchisees')}
        >
          <RankedList
            items={MOCK_FRANCHISEE_ACTIVITY.map((f) => ({
              id: f.id,
              name: f.name,
              value: f.activityScore,
              subtext: `${f.campaignCount} kampanjer`,
              badge:
                f.activityScore >= 80
                  ? { label: 'Topp', variant: 'success' as const }
                  : undefined,
            }))}
            loading={loading}
            emptyMessage="Inga franchisetagare ännu"
            valueLabel="%"
            onItemClick={(item) =>
              navigate(`/hq/franchisees/${item.id}`)
            }
          />
        </WidgetCard>

        {/* Väntar åtgärd - WAS-387 */}
        <WidgetCard
          title="Väntar åtgärd"
          subtitle="Kampanjer och material som väntar på godkännande"
          onViewAll={() => navigate('/hq/campaigns?status=draft')}
        >
          {MOCK_PENDING_ACTIONS.length === 0 ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Inget väntar på godkännande
              </p>
            </div>
          ) : (
            <RankedList
              items={MOCK_PENDING_ACTIONS.map((p) => ({
                id: p.id,
                name: p.name,
                value: p.daysWaiting,
                subtext: p.type === 'campaign' ? 'Kampanj' : 'Material',
                badge:
                  p.daysWaiting >= 3
                    ? { label: 'Försenad', variant: 'warning' as const }
                    : undefined,
              }))}
              loading={loading}
              emptyMessage="Inget att godkänna"
              valueLabel=" dagar"
              showRank={false}
              onItemClick={(item) =>
                navigate(`/hq/campaigns/${item.id}`)
              }
            />
          )}
        </WidgetCard>
      </div>

      {/* 5. Recent campaigns list */}
      <WidgetCard
        title="Senaste kampanjer"
        subtitle="De 5 senast skapade kampanjerna"
        onViewAll={() => navigate('/hq/campaigns')}
      >
        {loading ? (
          // Loading skeleton
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="py-3 flex items-center gap-4">
                <div className="h-5 w-5 bg-muted animate-pulse rounded" />
                <div className="flex-1">
                  <div className="h-4 w-48 bg-muted animate-pulse rounded mb-1" />
                  <div className="h-3 w-24 bg-muted/60 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : recentCampaigns.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Inga kampanjer än"
            description="Skapa din första kampanj för att komma igång"
            ctaLabel="Skapa kampanj"
            onAction={() => navigate('/hq/campaigns/new')}
          />
        ) : (
          <div className="divide-y divide-border">
            {recentCampaigns.map((campaign) => {
              const style = STATUS_STYLES[campaign.status]
              return (
                <button
                  key={campaign.id}
                  className="w-full py-3 flex items-center gap-4 hover:bg-muted/50 transition-colors text-left rounded-lg px-2 -mx-2"
                  onClick={() => navigate(`/hq/campaigns/${campaign.id}`)}
                >
                  <span className="text-lg">{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {campaign.name}
                    </div>
                    <div className={`text-sm ${style.color}`}>
                      {style.label} · {campaign.formatCount} format
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </WidgetCard>

      {/* 6. System status - compact footer */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6 text-sm">
            {[
              { label: 'API', ok: true },
              { label: 'Bildgenerering', ok: true },
              { label: 'Lagring', ok: true },
              { label: 'E-post', ok: true },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    s.ok ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Alla system fungerar normalt
          </p>
        </div>
      </Card>
    </div>
  )
}
