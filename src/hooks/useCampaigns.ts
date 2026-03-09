/**
 * Campaign Management Hook
 * Hanterar CRUD-operationer för kampanjer
 */

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Campaign, CampaignDraft, CampaignStatus, CampaignChannel } from '@/types'

export interface CampaignUpdateData {
  name?: string
  description?: string
  status?: CampaignStatus
  channels?: CampaignChannel[]
  start_date?: string | null
  end_date?: string | null
  target_persona?: Record<string, unknown> | string | null
  key_messages?: string[]
  content_pillar?: number | null  // 1-5, innehållspelare från publiceringskalendern
}

interface UseCampaignsReturn {
  fetchCampaigns: () => Promise<Campaign[]>
  fetchCampaign: (id: string) => Promise<Campaign | null>
  createCampaign: (draft: CampaignDraft) => Promise<Campaign>
  updateCampaign: (campaignId: string, data: CampaignUpdateData) => Promise<Campaign>
  updateCampaignStatus: (campaignId: string, status: CampaignStatus) => Promise<void>
  updateHqApproved: (campaignId: string, approved: boolean) => Promise<void>
  duplicateCampaign: (campaignId: string) => Promise<Campaign>
  archiveCampaign: (campaignId: string) => Promise<void>
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
      .select('id, name, description, status, channels, start_date, end_date, created_at, organization_id, hq_approved, content_pillar')
      .eq('organization_id', appUser.organization_id)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Fetch error: ${error.message}`)
    return data as Campaign[]
  }

  /**
   * Hämtar en specifik kampanj med alla fält inklusive target_persona och key_messages
   */
  async function fetchCampaign(id: string): Promise<Campaign | null> {
    if (!appUser?.organization_id) {
      throw new Error('Ej inloggad')
    }

    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, description, status, channels, start_date, end_date, created_at, updated_at, organization_id, brand_id, target_persona, key_messages, created_by, hq_approved, content_pillar')
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

  /**
   * Uppdaterar en kampanj med valfria fält
   */
  async function updateCampaign(
    campaignId: string,
    data: CampaignUpdateData
  ): Promise<Campaign> {
    if (!appUser?.organization_id) {
      throw new Error('Ej inloggad')
    }

    setLoading(true)
    try {
      const { data: updated, error } = await supabase
        .from('campaigns')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', campaignId)
        .eq('organization_id', appUser.organization_id)
        .select('id, name, description, status, channels, start_date, end_date, created_at, updated_at, organization_id, brand_id, target_persona, key_messages, created_by, content_pillar')
        .single()

      if (error) throw new Error(`Update error: ${error.message}`)
      return updated as Campaign
    } finally {
      setLoading(false)
    }
  }

  /**
   * Duplicerar en kampanj med " (kopia)" i titeln
   */
  async function duplicateCampaign(campaignId: string): Promise<Campaign> {
    if (!appUser?.organization_id) {
      throw new Error('Ej inloggad')
    }

    setLoading(true)
    try {
      // Hämta originalkampanjen
      const original = await fetchCampaign(campaignId)
      if (!original) {
        throw new Error('Kampanjen hittades inte')
      }

      // Skapa kopia med " (kopia)" i titeln
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          organization_id: appUser.organization_id,
          brand_id: original.brand_id,
          name: `${original.name} (kopia)`,
          description: original.description,
          status: 'draft', // Ny kopia startar alltid som draft
          channels: original.channels,
          start_date: original.start_date,
          end_date: original.end_date,
          target_persona: original.target_persona,
          key_messages: original.key_messages,
          content_pillar: original.content_pillar,
          created_by: appUser.id,
        })
        .select('id, name, description, status, channels, start_date, end_date, created_at, updated_at, organization_id, brand_id, target_persona, key_messages, created_by, content_pillar')
        .single()

      if (error) throw new Error(`Duplicate error: ${error.message}`)
      return data as Campaign
    } finally {
      setLoading(false)
    }
  }

  /**
   * Arkiverar en kampanj (sätter status till 'archived')
   */
  async function archiveCampaign(campaignId: string): Promise<void> {
    await updateCampaignStatus(campaignId, 'archived')
  }

  /**
   * WAS-411: Uppdaterar intern HQ-signoff status
   */
  async function updateHqApproved(campaignId: string, approved: boolean): Promise<void> {
    if (!appUser?.organization_id) {
      throw new Error('Ej inloggad')
    }

    const { error } = await supabase
      .from('campaigns')
      .update({ hq_approved: approved, updated_at: new Date().toISOString() })
      .eq('id', campaignId)
      .eq('organization_id', appUser.organization_id)

    if (error) throw new Error(`Update error: ${error.message}`)
  }

  return {
    fetchCampaigns,
    fetchCampaign,
    createCampaign,
    updateCampaign,
    updateCampaignStatus,
    updateHqApproved,
    duplicateCampaign,
    archiveCampaign,
    loading,
  }
}
