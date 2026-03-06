/**
 * Campaign Management Hook
 * Hanterar CRUD-operationer för kampanjer
 */

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Campaign, CampaignDraft, CampaignStatus } from '@/types'

interface UseCampaignsReturn {
  fetchCampaigns: () => Promise<Campaign[]>
  fetchCampaign: (id: string) => Promise<Campaign | null>
  createCampaign: (draft: CampaignDraft) => Promise<Campaign>
  updateCampaignStatus: (campaignId: string, status: CampaignStatus) => Promise<void>
  loading: boolean
}

export function useCampaigns(): UseCampaignsReturn {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(false)

  /**
   * Hämtar alla kampanjer för organisationen
   */
  async function fetchCampaigns(): Promise<Campaign[]> {
    if (!appUser?.organization_id) {
      throw new Error('Ej inloggad')
    }

    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, description, status, channels, start_date, end_date, created_at, organization_id')
      .eq('organization_id', appUser.organization_id)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Fetch error: ${error.message}`)
    return data as Campaign[]
  }

  /**
   * Hämtar en specifik kampanj
   */
  async function fetchCampaign(id: string): Promise<Campaign | null> {
    if (!appUser?.organization_id) {
      throw new Error('Ej inloggad')
    }

    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, description, status, channels, start_date, end_date, created_at, organization_id')
      .eq('id', id)
      .eq('organization_id', appUser.organization_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Fetch error: ${error.message}`)
    }
    return data as Campaign
  }

  /**
   * Skapar en ny kampanj från draft
   */
  async function createCampaign(draft: CampaignDraft): Promise<Campaign> {
    if (!appUser?.organization_id) {
      throw new Error('Ej inloggad')
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          organization_id: appUser.organization_id,
          brand_id: draft.brand_id,
          name: draft.name,
          description: draft.description,
          status: draft.status || 'draft',
          channels: draft.channels,
          start_date: draft.start_date || null,
          end_date: draft.end_date || null,
          key_messages: draft.concept ? [draft.concept.keyMessage] : [],
          created_by: appUser.id,
        })
        .select()
        .single()

      if (error) throw new Error(`Create error: ${error.message}`)
      return data as Campaign
    } finally {
      setLoading(false)
    }
  }

  /**
   * Uppdaterar en kampanjs status
   */
  async function updateCampaignStatus(
    campaignId: string,
    status: CampaignStatus
  ): Promise<void> {
    if (!appUser?.organization_id) {
      throw new Error('Ej inloggad')
    }

    const { error } = await supabase
      .from('campaigns')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', campaignId)
      .eq('organization_id', appUser.organization_id)

    if (error) throw new Error(`Update error: ${error.message}`)
  }

  return {
    fetchCampaigns,
    fetchCampaign,
    createCampaign,
    updateCampaignStatus,
    loading,
  }
}
