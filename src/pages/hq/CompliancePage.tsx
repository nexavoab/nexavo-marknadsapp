/**
 * Compliance Report Page
 * WAS-378: Franchisee-aktivering per kampanj + CSV-export
 * WAS-395: RUT/ROT disclaimers, forbidden words, påminn-dialog
 */

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  mockComplianceData,
  type ComplianceStatus,
} from '@/data/mockCompliance'
import { useBrandContext } from '@/contexts/BrandContext'
import {
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  ShieldCheck,
  ChevronDown,
  Bell,
  AlertTriangle,
  Percent,
  Ban,
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

interface ReminderState {
  isOpen: boolean
  franchiseeId: string | null
  franchiseeName: string | null
}

export default function CompliancePage() {
  const { campaigns, franchisees } = mockComplianceData
  const { brand, loading: brandLoading } = useBrandContext()
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    campaigns[0]?.id ?? ''
  )
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [reminderState, setReminderState] = useState<ReminderState>({
    isOpen: false,
    franchiseeId: null,
    franchiseeName: null,
  })
  const [reminderSending, setReminderSending] = useState(false)

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

  // Open reminder dialog
  const openReminderDialog = (franchiseeId: string) => {
    const franchisee = franchisees.find((f) => f.id === franchiseeId)
    if (franchisee) {
      setReminderState({
        isOpen: true,
        franchiseeId,
        franchiseeName: franchisee.name,
      })
    }
  }

  // Confirm and send reminder
  const confirmReminder = async () => {
    if (!reminderState.franchiseeId || !reminderState.franchiseeName) return

    setReminderSending(true)
    
    // Simulate API call - in production this would actually send a reminder
    await new Promise((resolve) => setTimeout(resolve, 800))
    
    const timestamp = new Date().toLocaleString('sv-SE', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
    
    // Log the reminder (could be saved to database in production)
    console.log(`[${timestamp}] Påminnelse skickad till ${reminderState.franchiseeName} (${reminderState.franchiseeId})`)
    
    toast.success(
      `Påminnelse skickad till ${reminderState.franchiseeName}`,
      { description: `Registrerad ${timestamp}` }
    )
    
    setReminderSending(false)
    setReminderState({ isOpen: false, franchiseeId: null, franchiseeName: null })
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
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Kampanjräckvidd</h1>
            <p className="text-muted-foreground text-sm">
              Följ upp franchisee-aktivering per kampanj
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto">
          <Download className="w-4 h-4 mr-2" />
          Ladda ner CSV
        </Button>
      </div>

      {/* RUT/ROT Disclaimers Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Percent className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-emerald-800">RUT-avdrag</h3>
                <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded">50%</span>
              </div>
              <p className="text-sm text-emerald-700 mt-1">
                Rutavdrag gäller för hushållsnära tjänster som städning, trädgårdsarbete och barnpassning. 
                Kunden får 50% skattereduktion på arbetskostnaden (max 75 000 kr/år).
              </p>
              <div className="mt-2 p-2 bg-emerald-100 rounded text-xs text-emerald-800">
                <strong>Viktigt:</strong> Inkludera alltid "Pris efter RUT-avdrag" i marknadsföring för RUT-berättigade tjänster.
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Percent className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-blue-800">ROT-avdrag</h3>
                <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded">30%</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Rotavdrag gäller för reparation, underhåll och om- och tillbyggnad av bostäder. 
                Kunden får 30% skattereduktion på arbetskostnaden (max 50 000 kr/år).
              </p>
              <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-800">
                <strong>Viktigt:</strong> Ange tydligt vilka tjänster som är ROT-berättigade och att materialkostnad ej ingår.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forbidden Words Section */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Ban className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-amber-800 mb-2">Förbjudna ord i marknadsföring</h3>
            <p className="text-sm text-amber-700 mb-3">
              Följande ord/fraser får inte användas i kampanjmaterial. De kan vara vilseledande, 
              juridiskt problematiska eller inkonsistenta med varumärkets tonalitet.
            </p>
            {brandLoading ? (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Clock className="w-4 h-4 animate-spin" />
                Laddar förbjudna ord...
              </div>
            ) : brand?.forbidden_words && brand.forbidden_words.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {brand.forbidden_words.map((word, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 bg-amber-100 border border-amber-300 text-amber-800 text-sm px-3 py-1 rounded-full"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {word}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-amber-600 italic">
                Inga förbjudna ord konfigurerade för detta varumärke. 
                Konfigurera i Varumärkesidentitet → Tonalitet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Summary Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
        <div className="relative inline-block w-full sm:w-auto">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-between gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors w-full sm:w-auto"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium truncate">{selectedCampaign?.name}</span>
              <span className="text-muted-foreground text-sm hidden sm:inline">
                ({selectedCampaign?.period})
              </span>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-muted-foreground transition-transform flex-shrink-0',
                dropdownOpen && 'rotate-180'
              )}
            />
          </button>
          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 sm:right-auto mt-1 w-full sm:w-64 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
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
                  <span className="font-medium truncate">{campaign.name}</span>
                  <span className="text-muted-foreground text-sm flex-shrink-0 ml-2">
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
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Franchisees aktiverade
            </p>
            <p className="text-2xl sm:text-3xl font-bold">
              {stats.activated}
              <span className="text-muted-foreground text-lg font-normal">
                /{stats.total}
              </span>
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-3xl sm:text-4xl font-bold text-emerald-600">
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
        <div className="flex flex-wrap gap-4 sm:gap-6 mt-4">
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

      {/* Franchisee Table - Mobile Cards / Desktop Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Desktop Table */}
        <table className="w-full hidden sm:table">
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
                          onClick={() => openReminderDialog(franchisee.id)}
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

        {/* Mobile Cards */}
        <div className="sm:hidden divide-y divide-border">
          {franchisees.map((franchisee) => {
            const status = franchisee.campaignStatus[selectedCampaignId] ?? 'pending'
            const config = STATUS_CONFIG[status]
            const StatusIcon = config.icon
            const activatedAt = franchisee.activatedAt[selectedCampaignId]

            return (
              <div key={franchisee.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{franchisee.name}</span>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon className={cn('w-4 h-4', config.className)} />
                    <span className={cn('text-sm', config.className)}>{config.label}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {activatedAt
                      ? `Aktiverad ${new Date(activatedAt).toLocaleDateString('sv-SE')}`
                      : 'Ej aktiverad'}
                  </span>
                  {(status === 'pending' || status === 'skipped') && (
                    <button
                      onClick={() => openReminderDialog(franchisee.id)}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Bell className="w-3 h-3" />
                      Påminn
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Reminder Confirmation Dialog */}
      <Dialog
        open={reminderState.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setReminderState({ isOpen: false, franchiseeId: null, franchiseeName: null })
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Skicka påminnelse
            </DialogTitle>
            <DialogDescription>
              Du är på väg att skicka en påminnelse till <strong>{reminderState.franchiseeName}</strong> om att aktivera kampanjen <strong>{selectedCampaign?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">Påminnelsen kommer att:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Skickas via e-post till franchisetagaren</li>
                <li>Loggas med tidsstämpel i systemet</li>
                <li>Visa kampanjens deadline och instruktioner</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setReminderState({ isOpen: false, franchiseeId: null, franchiseeName: null })}
              disabled={reminderSending}
            >
              Avbryt
            </Button>
            <Button onClick={confirmReminder} disabled={reminderSending}>
              {reminderSending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Skickar...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Skicka påminnelse
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
