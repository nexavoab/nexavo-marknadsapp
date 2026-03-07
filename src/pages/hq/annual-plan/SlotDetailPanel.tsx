import { X, Calendar, Radio, CheckCircle2, Users, Wallet, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CampaignSlotCompat } from '@/hooks/useCampaignSlots'
import { STATUS_CONFIG } from '@/hooks/useCampaignSlots'

interface SlotDetailPanelProps {
  slot: CampaignSlotCompat
  onClose: () => void
}

export default function SlotDetailPanel({ slot, onClose }: SlotDetailPanelProps) {
  const statusConfig = STATUS_CONFIG[slot.status]

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Kampanjdetaljer</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Title */}
          <div>
            <h3 className="text-xl font-bold text-foreground">{slot.title}</h3>
            <span
              className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium text-white ${statusConfig.bgClass}`}
            >
              <CheckCircle2 className="h-3 w-3" />
              {statusConfig.label}
            </span>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Beskrivning</h4>
            <p className="text-foreground">{slot.description}</p>
          </div>

          {/* Period */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Period</h4>
            <div className="flex items-center gap-2 text-foreground">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(slot.startDate)} – {formatDate(slot.endDate)}</span>
            </div>
          </div>

          {/* Channel */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Kanal</h4>
            <div className="flex items-center gap-2 text-foreground">
              <Radio className="h-4 w-4 text-muted-foreground" />
              <span>{slot.channel}</span>
            </div>
          </div>

          {/* Franchisees */}
          <div className={slot.status === 'cancelled' ? 'opacity-50' : ''}>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Franchisees</h4>
            <div className="flex items-center gap-2 text-foreground">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{slot.status === 'cancelled' ? 0 : (slot.franchiseeCount ?? 0)} aktiva</span>
            </div>
          </div>

          {/* Budget */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Budget</h4>
            <div className="flex items-center gap-2 text-foreground">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span>{slot.budget ? `${slot.budget.toLocaleString('sv-SE')} kr` : '–'}</span>
            </div>
          </div>

          {/* Channels */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Kanaler</h4>
            <div className="flex items-center gap-2 text-foreground">
              <Share2 className="h-4 w-4 text-muted-foreground" />
              <span>{slot.channels?.join(', ') || slot.channel}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button className="w-full" variant="outline" onClick={onClose}>
            Stäng
          </Button>
        </div>
      </div>
    </>
  )
}
