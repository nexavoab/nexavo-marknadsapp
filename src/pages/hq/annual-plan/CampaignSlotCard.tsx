import type { CampaignSlotCompat } from '@/hooks/useCampaignSlots'
import { STATUS_CONFIG } from '@/hooks/useCampaignSlots'

interface CampaignSlotCardProps {
  slot: CampaignSlotCompat
  onClick: () => void
  /** Width in number of half-month columns */
  colSpan?: number
}

export default function CampaignSlotCard({ slot, onClick, colSpan = 1 }: CampaignSlotCardProps) {
  const statusConfig = STATUS_CONFIG[slot.status]

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-2 py-1 rounded text-xs font-medium text-white font-sans
        transition-all cursor-pointer shadow-sm
        hover:opacity-90 hover:scale-[1.02] hover:shadow-md
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1
        ${statusConfig.bgClass}
      `}
      style={{
        gridColumn: colSpan > 1 ? `span ${colSpan}` : undefined
      }}
      title={`${slot.title} (${statusConfig.label})`}
    >
      <span className="truncate">{slot.title}</span>
      <span className="opacity-70 ml-1">· {slot.franchiseeCount ?? '–'} franchisees</span>
    </button>
  )
}
