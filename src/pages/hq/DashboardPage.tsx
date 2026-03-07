import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Palette, Users, Plus, Megaphone, Download, FolderOpen } from 'lucide-react'
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

const STATUS_STYLES: Record<CampaignStatus, { color: string; icon: string; label: string }> = {
  active: { color: 'text-green-600', icon: '🟢', label: 'aktiv' },
  draft: { color: 'text-yellow-600', icon: '🟡', label: 'utkast' },
  scheduled: { color: 'text-blue-600', icon: '🔵', label: 'schemalagd' },
  completed: { color: 'text-gray-600', icon: '✅', label: 'klar' },
  archived: { color: 'text-gray-400', icon: '📦', label: 'arkiverad' },
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
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
      {loading || value === null ? (
        <div className="h-8 w-24 bg-gray-200 animate-pulse rounded mb-2" />
      ) : (
        <div className="text-3xl font-bold text-foreground">{value}</div>
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
  const [loading, setLoading] = useState(true)

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
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          God morgon, {appUser?.name?.split(' ')[0] ?? 'Wasim'} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Här är en översikt av din marknadsapp
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

      {/* Recent campaigns */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Senaste kampanjer
        </h2>
        <Card className="divide-y divide-gray-100">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <div className="h-5 w-5 bg-gray-200 animate-pulse rounded" />
                <div className="flex-1">
                  <div className="h-4 w-48 bg-gray-200 animate-pulse rounded mb-1" />
                  <div className="h-3 w-24 bg-gray-100 animate-pulse rounded" />
                </div>
              </div>
            ))
          ) : recentCampaigns.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Inga kampanjer än. Skapa din första!
            </div>
          ) : (
            recentCampaigns.map((campaign) => {
              const style = STATUS_STYLES[campaign.status]
              return (
                <button
                  key={campaign.id}
                  className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => navigate(`/hq/campaigns/${campaign.id}`)}
                >
                  <span className="text-lg">{style.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">
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

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Snabbåtgärder
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate('/hq/campaigns/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Ny kampanj
          </Button>
          <Button variant="outline" onClick={() => navigate('/hq/brand')}>
            <Palette className="w-4 h-4 mr-2" />
            Redigera brand
          </Button>
          <Button variant="outline" onClick={() => navigate('/hq/franchisees')}>
            <Users className="w-4 h-4 mr-2" />
            Franchisees
          </Button>
        </div>
      </div>
    </div>
  )
}
