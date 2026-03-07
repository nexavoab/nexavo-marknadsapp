/**
 * Local Variants Tab
 * Visar och genererar lokala varianter per franchisee
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLocalVariants, swapVariables, type LocalVariantWithFranchisee } from '@/hooks/useLocalVariants'
import { useFranchisees } from '@/hooks/useFranchisees'
import type { Asset, Franchisee, GenerationStatus } from '@/types'
import {
  Loader2,
  RefreshCw,
  Sparkles,
  Check,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'

interface LocalVariantsTabProps {
  campaignId: string
  assets: Asset[]
}

const STATUS_CONFIG: Record<GenerationStatus, { label: string; icon: React.ReactNode; className: string }> = {
  pending: {
    label: 'Väntar',
    icon: <Clock className="w-3 h-3" />,
    className: 'bg-muted text-muted-foreground',
  },
  processing: {
    label: 'Genererar...',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
    className: 'bg-yellow-100 text-yellow-800',
  },
  completed: {
    label: 'Klar',
    icon: <Check className="w-3 h-3" />,
    className: 'bg-green-100 text-green-800',
  },
  failed: {
    label: 'Misslyckades',
    icon: <AlertTriangle className="w-3 h-3" />,
    className: 'bg-red-100 text-red-800',
  },
}

export function LocalVariantsTab({ campaignId, assets }: LocalVariantsTabProps) {
  const { variants, loading, error, refetch, generateVariantsForCampaign } = useLocalVariants(campaignId)
  const { franchisees, loading: franchiseesLoading } = useFranchisees()
  const [generating, setGenerating] = useState(false)
  const [expandedFranchisee, setExpandedFranchisee] = useState<string | null>(null)

  // Gruppera varianter per franchisee
  const variantsByFranchisee = variants.reduce<Record<string, LocalVariantWithFranchisee[]>>(
    (acc, variant) => {
      const key = variant.franchisee_id
      if (!acc[key]) acc[key] = []
      acc[key].push(variant)
      return acc
    },
    {}
  )

  const handleGenerate = async () => {
    if (assets.length === 0) {
      toast.error('Inga assets att generera varianter för')
      return
    }

    if (franchisees.length === 0) {
      toast.error('Inga franchisees hittades')
      return
    }

    setGenerating(true)
    const totalVariants = franchisees.length * assets.length
    toast.info(`Genererar ${totalVariants} varianter...`)

    try {
      const { generated, failed } = await generateVariantsForCampaign(campaignId, franchisees, assets)

      if (failed === 0) {
        toast.success(`${generated} varianter klara`)
      } else {
        toast.warning(`${generated} varianter klara, ${failed} misslyckades`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte generera varianter')
    } finally {
      setGenerating(false)
    }
  }

  // Visa preview-text för en franchisee (från första asset med copy)
  const getPreviewText = (franchisee: Franchisee): string => {
    const assetWithCopy = assets.find((a) => a.copy_text)
    if (!assetWithCopy?.copy_text) return 'Ingen copy-text tillgänglig'
    return swapVariables(assetWithCopy.copy_text, franchisee)
  }

  if (loading || franchiseesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <span className="text-destructive">{error}</span>
        <Button variant="ghost" size="sm" onClick={refetch}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Försök igen
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header med Generate-knapp */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Lokala varianter</h3>
          <p className="text-sm text-muted-foreground">
            {variants.length} varianter genererade för {Object.keys(variantsByFranchisee).length} franchisees
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetch} disabled={generating}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Uppdatera
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={generating || assets.length === 0}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium text-sm transition-colors mt-4 mb-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Genererar...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generera alla varianter
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Info om assets saknas */}
      {assets.length === 0 && (
        <div className="bg-muted rounded-lg p-4 text-center text-muted-foreground">
          Inga assets kopplade till kampanjen. Skapa assets först för att kunna generera varianter.
        </div>
      )}

      {/* Franchisee-lista */}
      {franchisees.length === 0 ? (
        <div className="bg-muted rounded-lg p-4 text-center text-muted-foreground">
          Inga aktiva franchisees hittades.
        </div>
      ) : (
        <div className="space-y-3 gap-3">
          {franchisees.map((franchisee) => {
            const franchiseeVariants = variantsByFranchisee[franchisee.id] || []
            const hasVariants = franchiseeVariants.length > 0
            const isExpanded = expandedFranchisee === franchisee.id

            // Beräkna status: alla completed → completed, någon processing → processing, etc.
            const statuses = franchiseeVariants.map((v) => v.generation_status)
            const overallStatus: GenerationStatus = !hasVariants
              ? 'pending'
              : statuses.every((s) => s === 'completed')
                ? 'completed'
                : statuses.some((s) => s === 'failed')
                  ? 'failed'
                  : statuses.some((s) => s === 'processing')
                    ? 'processing'
                    : 'pending'

            const statusConfig = STATUS_CONFIG[overallStatus]

            return (
              <div
                key={franchisee.id}
                className="border border-border rounded-lg bg-card overflow-hidden"
              >
                {/* Row Header */}
                <button
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedFranchisee(isExpanded ? null : franchisee.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div className="text-left">
                      <span className="font-medium">{franchisee.name}</span>
                      {franchisee.address?.city && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({franchisee.address.city})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {franchiseeVariants.length} varianter
                    </span>
                    <Badge className={cn('text-xs gap-1', statusConfig.className)}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </Badge>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/30">
                    <div className="space-y-3">
                      {/* Preview Text */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Preview (swappad text)
                        </p>
                        <div className="bg-background rounded-md p-3 text-sm border border-border">
                          {getPreviewText(franchisee)}
                        </div>
                      </div>

                      {/* Franchisee Info */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Namn</p>
                          <p>{franchisee.name || '[FRANCHISEE_NAME]'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Stad</p>
                          <p>{franchisee.address?.city || '[CITY]'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Telefon</p>
                          <p>{franchisee.contact_phone || '[PHONE]'}</p>
                        </div>
                      </div>

                      {/* Varianter per asset */}
                      {hasVariants && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Genererade varianter
                          </p>
                          <div className="space-y-1">
                            {franchiseeVariants.map((variant) => (
                              <div
                                key={variant.id}
                                className="flex items-center justify-between text-sm bg-background rounded px-2 py-1"
                              >
                                <span className="truncate">
                                  {variant.asset_id.slice(0, 8)}...
                                </span>
                                <Badge
                                  className={cn(
                                    'text-xs',
                                    STATUS_CONFIG[variant.generation_status].className
                                  )}
                                >
                                  {STATUS_CONFIG[variant.generation_status].label}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
