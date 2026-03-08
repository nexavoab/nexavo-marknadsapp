import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Campaign, Asset, CampaignStatus } from '@/types'

export function useFranchiseeData() {
  const { appUser } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAllCampaigns = useCallback(async () => {
    if (!appUser?.organization_id) return

    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, description, status, channels, start_date, end_date, created_at')
        .eq('organization_id', appUser.organization_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCampaigns(data as Campaign[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte hämta kampanjer')
    } finally {
      setLoading(false)
    }
  }, [appUser?.organization_id])

  // Keep old function for backwards compatibility
  const fetchActiveCampaigns = fetchAllCampaigns

  useEffect(() => {
    if (appUser?.organization_id) {
      fetchAllCampaigns()
    }
  }, [appUser?.organization_id, fetchAllCampaigns])

  async function fetchCampaignAssets(campaignId: string): Promise<Asset[]> {
    if (!appUser?.organization_id) return []

    const { data, error } = await supabase
      .from('assets')
      .select('id, name, public_url, type, format, mime_type, thumbnail_url, download_count, created_at')
      .eq('campaign_id', campaignId)
      .eq('organization_id', appUser.organization_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Asset[]
  }

  async function fetchCampaignById(campaignId: string): Promise<Campaign | null> {
    if (!appUser?.organization_id) return null

    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, description, status, channels, start_date, end_date, created_at')
      .eq('id', campaignId)
      .eq('organization_id', appUser.organization_id)
      .single()

    if (error) return null
    return data as Campaign
  }

  async function updateCampaignStatus(
    campaignId: string,
    status: CampaignStatus,
    rejectionComment?: string
  ): Promise<boolean> {
    if (!appUser?.organization_id) return false

    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (rejectionComment !== undefined) {
      updatePayload.rejection_comment = rejectionComment
    }

    const { error } = await supabase
      .from('campaigns')
      .update(updatePayload)
      .eq('id', campaignId)
      .eq('organization_id', appUser.organization_id)

    if (error) {
      console.error('Failed to update campaign status:', error)
      return false
    }

    // Update local state
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaignId ? { ...c, status } : c))
    )

    return true
  }

  async function saveLocalCustomization(
    campaignId: string,
    customization: { phone?: string; city?: string; contactName?: string }
  ): Promise<boolean> {
    if (!appUser?.organization_id) return false

    const { error } = await supabase
      .from('campaigns')
      .update({
        local_customization: customization,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .eq('organization_id', appUser.organization_id)

    if (error) {
      console.error('Failed to save local customization:', error)
      return false
    }
    return true
  }

  async function incrementDownload(assetId: string): Promise<void> {
    await supabase.rpc('increment_download_count', { asset_id: assetId })
  }

  return {
    campaigns,
    loading,
    error,
    fetchActiveCampaigns,
    fetchAllCampaigns,
    fetchCampaignAssets,
    fetchCampaignById,
    updateCampaignStatus,
    saveLocalCustomization,
    incrementDownload,
  }
}
