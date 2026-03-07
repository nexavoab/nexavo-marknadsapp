/**
 * Compliance Report Page
 * WAS-378: Franchisee-aktivering per kampanj + CSV-export
 */

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  mockComplianceData,
  type ComplianceStatus,
} from '@/data/mockCompliance'
import {
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  ShieldCheck,
  ChevronDown,
  Bell,
} from 'lucide-react'

const STATUS_CONFIG: Record<
  ComplianceStatus,
  { icon: typeof CheckCircle2; label: string; className: string }
> = {
  activated: {
    icon: CheckCircle2,
    label: 'Aktiverad',
    className: 'text-emerald-600',
  },
  pending: {
    icon: Clock,
    label: 'Väntar',
    className: 'text-yellow-600',
  },
  skipped: {
    icon: XCircle,
    label: 'Hoppade över',
    className: 'text-red-500',
  },
}

export default function CompliancePage() {
  const { campaigns, franchisees } = mockComplianceData
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    campaigns[0]?.id ?? ''
  )
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId)

  // Calculate stats for the selected campaign
  const stats = useMemo(() => {
    const activated = franchisees.filter(
      (f) => f.campaignStatus[selectedCampaignId] === 'activated'
    ).length
    const pending = franchisees.filter(
      (f) => f.campaignStatus[selectedCampaignId] === 'pending'
    ).length
    const skipped = franchisees.filter(
      (f) => f.campaignStatus[selectedCampaignId] === 'skipped'
    ).length
    const total = franchisees.length
    const percentage = total > 0 ? Math.round((activated / total) * 100) : 0

    return { activated, pending, skipped, total, percentage }
  }, [selectedCampaignId, franchisees])

  // Calculate total stats across ALL campaigns
  const totalStats = useMemo(() => {
    let totalActivated = 0
    let totalPending = 0
    let totalEntries = 0

    franchisees.forEach((f) => {
      campaigns.forEach((c) => {
        const status = f.campaignStatus[c.id]
        if (status === 'activated') totalActivated++
        if (status === 'pending') totalPending++
        totalEntries++
      })
    })

    const activationRate = totalEntries > 0
      ? Math.round((totalActivated / totalEntries) * 100)
      : 0

    return { totalActivated, totalPending, activationRate }
  }, [franchisees, campaigns])

  // Handle remind button click
  const handleRemind = (franchiseeId: string) => {
    const franchisee = franchisees.find((f) => f.id === franchiseeId)
    if (franchisee) {
      toast.success(`Påminnelse skickad till ${franchisee.name}`)
    }
  }

  // Generate CSV content
  const generateCSV = () => {
    const headers = ['Franchisee', 'Kampanj', 'Status', 'Aktiverat']
    const rows = franchisees.map((f) => {
      const status = f.campaignStatus[selectedCampaignId]
      const statusLabel = STATUS_CONFIG[status]?.label ?? status
      const activatedAt = f.activatedAt[selectedCampaignId] ?? ''
      return [f.name, selectedCampaign?.name ?? '', statusLabel, activatedAt]
    })

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')

    return csvContent
  }

  const handleExport = () => {
    const csvContent = generateCSV()
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `compliance-${selectedCampaign?.name?.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Kampanjräckvidd</h1>
            <p className="text-muted-foreground text-sm">
              Följ upp franchisee-aktivering per kampanj
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Ladda ner CSV
        </Button>
      </div>

      {/* KPI Summary Header */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{totalStats.totalActivated}</div>
          <div className="text-sm text-muted-foreground">Aktiverade totalt</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-500">{totalStats.totalPending}</div>
          <div className="text-sm text-muted-foreground">Väntar på svar</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{totalStats.activationRate}%</div>
          <div className="text-sm text-muted-foreground">Aktiveringsgrad</div>
        </div>
      </div>

      {/* Campaign Filter */}
      <div className="mb-6">
        <div className="relative inline-block">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium">{selectedCampaign?.name}</span>
            <span className="text-muted-foreground text-sm">
              ({selectedCampaign?.period})
            </span>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-muted-foreground transition-transform',
                dropdownOpen && 'rotate-180'
              )}
            />
          </button>
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
              {campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  onClick={() => {
                    setSelectedCampaignId(campaign.id)
                    setDropdownOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-2 text-left hover:bg-muted transition-colors',
                    campaign.id === selectedCampaignId && 'bg-muted'
                  )}
                >
                  <span className="font-medium">{campaign.name}</span>
                  <span className="text-muted-foreground text-sm">
                    {campaign.period}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Visar aktivering för vald kampanj. Välj en annan kampanj för att se dess status.
        </p>
      </div>

      {/* Progress Overview */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Franchisees aktiverade
            </p>
            <p className="text-3xl font-bold">
              {stats.activated}
              <span className="text-muted-foreground text-lg font-normal">
                /{stats.total}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-emerald-600">
              {stats.percentage}%
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-4 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>

        {/* Status Summary */}
        <div className="flex gap-6 mt-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm">
              <span className="font-medium">{stats.activated}</span> aktiverade
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <span className="text-sm">
              <span className="font-medium">{stats.pending}</span> väntar
            </span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm">
              <span className="font-medium">{stats.skipped}</span> hoppade över
            </span>
          </div>
        </div>
      </div>

      {/* Franchisee Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                Franchisee
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                Aktiverat
              </th>
            </tr>
          </thead>
          <tbody>
            {franchisees.map((franchisee) => {
              const status = franchisee.campaignStatus[selectedCampaignId] ?? 'pending'
              const config = STATUS_CONFIG[status]
              const StatusIcon = config.icon
              const activatedAt = franchisee.activatedAt[selectedCampaignId]

              return (
                <tr
                  key={franchisee.id}
                  className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-medium">{franchisee.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={cn('w-5 h-5', config.className)} />
                      <span className={config.className}>{config.label}</span>
                      {(status === 'pending' || status === 'skipped') && (
                        <button
                          onClick={() => handleRemind(franchisee.id)}
                          className="text-xs text-primary hover:underline ml-2 flex items-center gap-1"
                        >
                          <Bell className="w-3 h-3" />
                          Påminn
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {activatedAt
                      ? new Date(activatedAt).toLocaleDateString('sv-SE')
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
