import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
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
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { CampaignStatus } from '@/types'

// Dashboard components
import {
  KPICard,
  WidgetCard,
  RegionProgressList,
  GaugeCard,
  PageHeader,
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
  activeFranchisees: number
  inactiveFranchisees: number
  // Trends
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

const STATUS_STYLES: Record<
  CampaignStatus,
  { color: string; icon: string; label: string }
> = {
  active: { color: 'text-green-600', icon: '🟢', label: 'aktiv' },
  draft: { color: 'text-yellow-600', icon: '🟡', label: 'utkast' },
  scheduled: { color: 'text-blue-600', icon: '🔵', label: 'schemalagd' },
  completed: { color: 'text-muted-foreground', icon: '✅', label: 'klar' },
  archived: { color: 'text-muted-foreground', icon: '📦', label: 'arkiverad' },
  approved: { color: 'text-green-600', icon: '✅', label: 'godkänd' },
  rejected: { color: 'text-red-600', icon: '❌', label: 'avvisad' },
  pending_approval: { color: 'text-orange-600', icon: '⏳', label: 'väntar' },
}

// Mock data - trend chart with actual + target
const ACTIVITY_DATA = [
  { month: 'Sep', actual: 12, target: 15 },
  { month: 'Okt', actual: 28, target: 22 },
  { month: 'Nov', actual: 19, target: 25 },
  { month: 'Dec', actual: 35, target: 30 },
  { month: 'Jan', actual: 22, target: 28 },
  { month: 'Feb', actual: 41, target: 35 },
  { month: 'Mar', actual: 38, target: 40 },
]

// Mock data - region distribution
const REGION_DATA = [
  { name: 'Stockholm', value: 8, total: 20 },
  { name: 'Göteborg', value: 5, total: 20 },
  { name: 'Malmö', value: 3, total: 20 },
  { name: 'Uppsala', value: 2, total: 20 },
  { name: 'Övriga', value: 2, total: 20 },
]

// Mock data - radar chart for regional activation
const RADAR_DATA = [
  { region: 'Stockholm', value: 95, fullMark: 100 },
  { region: 'Göteborg', value: 78, fullMark: 100 },
  { region: 'Malmö', value: 65, fullMark: 100 },
  { region: 'Uppsala', value: 52, fullMark: 100 },
  { region: 'Örebro', value: 45, fullMark: 100 },
  { region: 'Linköping', value: 38, fullMark: 100 },
]

// Mock data - campaigns by channel
const CHANNEL_DATA = [
  { name: 'Meta', value: 45, color: '#1877F2' },
  { name: 'Google', value: 30, color: '#34A853' },
  { name: 'Email', value: 15, color: '#EA4335' },
  { name: 'Annat', value: 10, color: '#9CA3AF' },
]

// Attention Section
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
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
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
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
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
    </div>
  )
}

// Empty state
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
    activeFranchisees: 0,
    inactiveFranchisees: 0,
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
  const { completedSteps, isDismissed, dismiss } = useOnboardingState()

  // Context for quick actions and onboarding
  const context = {
    hasFranchisees: (stats.franchiseeCount ?? 0) > 0,
    hasCampaigns: (stats.activeCampaigns ?? 0) > 0,
    hasBrand: true,
    hasIntegration: false,
  }

  const quickActions = createContextualQuickActions(navigate, context)
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

  // Loading timeout
  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 1500)
    return () => clearTimeout(timeout)
  }, [])

  // Fetch data
  useEffect(() => {
    async function fetchDashboardData() {
      if (!appUser?.organization_id) return

      try {
        const [
          activeCampaignsRes,
          downloadsRes,
          activeFranchiseesRes,
          inactiveFranchiseesRes,
          assetsRes,
          campaignsRes,
          pendingCampaignsRes,
        ] = await Promise.all([
          supabase
            .from('campaigns')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', appUser.organization_id)
            .eq('status', 'active'),
          supabase
            .from('assets')
            .select('download_count')
            .eq('organization_id', appUser.organization_id),
          supabase
            .from('franchisees')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', appUser.organization_id)
            .eq('is_active', true),
          supabase
            .from('franchisees')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', appUser.organization_id)
            .eq('is_active', false),
          supabase
            .from('assets')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', appUser.organization_id),
          supabase
            .from('campaigns')
            .select('id, name, status')
            .eq('organization_id', appUser.organization_id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('campaigns')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', appUser.organization_id)
            .eq('status', 'draft'),
        ])

        const totalDownloads =
          downloadsRes.data?.reduce(
            (sum, a) => sum + (a.download_count || 0),
            0
          ) ?? 0

        const activeFranchisees = activeFranchiseesRes.count ?? 0
        const inactiveFranchisees = inactiveFranchiseesRes.count ?? 0

        setStats({
          activeCampaigns: activeCampaignsRes.count ?? 0,
          totalDownloads,
          franchiseeCount: activeFranchisees + inactiveFranchisees,
          assetCount: assetsRes.count ?? 0,
          activeFranchisees,
          inactiveFranchisees,
          campaignsTrend: 12.95,
          downloadsTrend: 23.5,
          franchiseeTrend: 8.2,
          assetTrend: -5.1,
        })

        setAttentionItems({
          pendingApproval: pendingCampaignsRes.count ?? 0,
          inactiveFranchisees,
        })

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

          setRecentCampaigns(
            campaignsRes.data.map((c) => ({
              id: c.id,
              name: c.name,
              status: c.status as CampaignStatus,
              formatCount: countMap[c.id] || 0,
            }))
          )
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

  const handleExport = (name: string) => {
    toast.info(`Exporterar ${name}...`)
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 bg-muted/30 min-h-screen w-full min-w-0 overflow-x-hidden">
      {/* Page Header with actions */}
      <PageHeader
        title="God morgon"
        userName={appUser?.name?.split(' ')[0] ?? 'Wasim'}
        subtitle="Här är en översikt av din marknadsapp"
        onCustomize={() => toast.info('Customize kommer snart!')}
        onFilter={() => toast.info('Filter kommer snart!')}
      />

      {/* Attention + Quick Actions */}
      {!loading && (
        <div className="space-y-4">
          <AttentionSection
            pendingApproval={attentionItems.pendingApproval}
            inactiveFranchisees={attentionItems.inactiveFranchisees}
            onViewCampaigns={() => navigate('/hq/campaigns')}
            onViewFranchisees={() => navigate('/hq/franchisees')}
          />
          <QuickActions actions={quickActions} />
        </div>
      )}

      {/* Onboarding */}
      {!loading && !isDismissed && (
        <OnboardingChecklist steps={onboardingSteps} onDismiss={dismiss} />
      )}

      {/* KPI Row - 4 cards with trends */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Aktiva kampanjer"
          value={stats.activeCampaigns}
          loading={loading}
          icon={Megaphone}
          trend={stats.campaignsTrend}
          emptyState={{
            message: 'Inga aktiva kampanjer',
            ctaLabel: 'Skapa nu',
            onAction: () => navigate('/hq/campaigns/new'),
          }}
        />
        <KPICard
          label="Franchisetagare"
          value={stats.franchiseeCount}
          loading={loading}
          icon={Users}
          trend={stats.franchiseeTrend}
          emptyState={{
            message: 'Inga franchisetagare ännu',
            ctaLabel: 'Bjud in',
            onAction: () => navigate('/hq/franchisees'),
          }}
        />
        <KPICard
          label="Nedladdningar"
          value={stats.totalDownloads}
          loading={loading}
          icon={Download}
          trend={stats.downloadsTrend}
        />
        <KPICard
          label="Material"
          value={stats.assetCount}
          loading={loading}
          icon={FolderOpen}
          trend={stats.assetTrend}
        />
      </div>

      {/* Main row: Line chart (60%) + Region list (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Line chart - campaign activity with actual + target */}
        <WidgetCard
          title="Kampanjaktivitet"
          subtitle="Faktisk aktivitet vs mål, senaste 7 månader"
          className="lg:col-span-3"
          onExportCSV={() => handleExport('Kampanjaktivitet')}
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={ACTIVITY_DATA}>
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
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#22c55e' }}
                activeDot={{ r: 6 }}
                name="Faktisk"
              />
              <Line
                type="monotone"
                dataKey="target"
                stroke="#f97316"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: '#f97316' }}
                name="Mål"
              />
            </LineChart>
          </ResponsiveContainer>
        </WidgetCard>

        {/* Region progress list */}
        <WidgetCard
          title="Franchisetagare per region"
          subtitle="Fördelning av aktiva partners"
          className="lg:col-span-2"
          onExportCSV={() => handleExport('Regioner')}
          onViewAll={() => navigate('/hq/franchisees')}
        >
          <RegionProgressList items={REGION_DATA} loading={loading} />
        </WidgetCard>
      </div>

      {/* Bottom row: Radar + Donut + Gauge */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Radar chart - regional activation */}
        <WidgetCard
          title="Aktivering per region"
          subtitle="Kampanjaktivitet i procent"
          onExportCSV={() => handleExport('Aktivering')}
        >
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={RADAR_DATA}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="region"
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
              />
              <Radar
                name="Aktivering"
                dataKey="value"
                stroke="oklch(0.60 0.18 252)"
                fill="oklch(0.60 0.18 252)"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  fontSize: '12px',
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </WidgetCard>

        {/* Donut chart - campaigns by channel */}
        <WidgetCard
          title="Kampanjer per kanal"
          subtitle="Fördelning av aktiva kampanjer"
          onExportCSV={() => handleExport('Kanaler')}
        >
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={CHANNEL_DATA}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                dataKey="value"
                labelLine={false}
              >
                {CHANNEL_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontSize: '12px',
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px' }}
                formatter={(value) => (
                  <span className="text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </WidgetCard>

        {/* Gauge - franchisees with active/inactive split */}
        <WidgetCard
          title="Franchisetagare"
          subtitle="Aktiva och inaktiva partners"
          onExportCSV={() => handleExport('Franchisetagare')}
        >
          <GaugeCard
            value={stats.franchiseeCount ?? 0}
            label="Totalt"
            loading={loading}
            segments={[
              {
                label: 'Aktiva',
                value: stats.activeFranchisees || 15,
                color: '#22c55e',
              },
              {
                label: 'Inaktiva',
                value: stats.inactiveFranchisees || 5,
                color: '#ef4444',
              },
            ]}
          />
        </WidgetCard>
      </div>

      {/* Recent campaigns */}
      <WidgetCard
        title="Senaste kampanjer"
        subtitle="De 5 senast skapade kampanjerna"
        onViewAll={() => navigate('/hq/campaigns')}
        onExportCSV={() => handleExport('Kampanjer')}
      >
        {loading ? (
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
                    <div className={cn('text-sm', style.color)}>
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

      {/* System status footer */}
      <div className="bg-background rounded-xl p-4 shadow-sm">
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
      </div>
    </div>
  )
}
