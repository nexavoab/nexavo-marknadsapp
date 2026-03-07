/**
 * Campaign Slots Hook
 * Hämtar årshjulets kampanjslots från Supabase
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export type SlotStatus = 'planned' | 'scheduled' | 'active' | 'completed' | 'cancelled'

export interface CampaignSlot {
  id: string
  annual_plan_id: string
  organization_id: string
  campaign_id: string | null
  title: string
  slot_start: string // YYYY-MM-DD
  slot_end: string   // YYYY-MM-DD
  channels: string[]
  budget_sek: number | null
  status: SlotStatus
  color: string | null
  created_at: string
  updated_at: string
}

// Compat-type för gammal UI (används i AnnualPlanPage)
export interface CampaignSlotCompat {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  channel: string
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  franchiseeCount?: number
  budget?: number
  channels?: string[]
}

interface UseCampaignSlotsReturn {
  slots: CampaignSlot[]
  slotsCompat: CampaignSlotCompat[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// Mappar Supabase slot_status till gammal UI-status
function mapStatus(status: SlotStatus): CampaignSlotCompat['status'] {
  switch (status) {
    case 'active':
    case 'scheduled':
      return 'in_progress'
    case 'completed':
      return 'completed'
    case 'cancelled':
      return 'cancelled'
    default:
      return 'planned'
  }
}

export function useCampaignSlots(): UseCampaignSlotsReturn {
  const { appUser } = useAuth()
  const [slots, setSlots] = useState<CampaignSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSlots = useCallback(async () => {
    if (!appUser?.organization_id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('campaign_slots')
        .select('*')
        .eq('organization_id', appUser.organization_id)
        .order('slot_start', { ascending: true })

      if (fetchError) throw fetchError

      setSlots(data as CampaignSlot[])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kunde inte hämta kampanjslots'
      setError(msg)
      console.warn('useCampaignSlots error:', err)
    } finally {
      setLoading(false)
    }
  }, [appUser?.organization_id])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  // Konvertera till compat-format för befintlig UI
  const slotsCompat: CampaignSlotCompat[] = slots.map((slot) => ({
    id: slot.id,
    title: slot.title,
    description: '', // campaign_slots har ingen description-kolumn
    startDate: slot.slot_start,
    endDate: slot.slot_end,
    channel: slot.channels.join(', '),
    status: mapStatus(slot.status),
    budget: slot.budget_sek ?? undefined,
    channels: slot.channels,
  }))

  return {
    slots,
    slotsCompat,
    loading,
    error,
    refetch: fetchSlots,
  }
}

// STATUS_CONFIG för UI
export const STATUS_CONFIG: Record<CampaignSlotCompat['status'], { label: string; color: string; bgClass: string; textClass: string }> = {
  planned: {
    label: 'Planerad',
    color: 'blue',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-500'
  },
  in_progress: {
    label: 'Pågår',
    color: 'yellow',
    bgClass: 'bg-yellow-500',
    textClass: 'text-yellow-600'
  },
  completed: {
    label: 'Avslutad',
    color: 'green',
    bgClass: 'bg-green-500',
    textClass: 'text-green-500'
  },
  cancelled: {
    label: 'Avbruten',
    color: 'gray',
    bgClass: 'bg-gray-400',
    textClass: 'text-gray-500'
  }
}

export const MONTHS_SV = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'
]
