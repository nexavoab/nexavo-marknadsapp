import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Campaign, Asset } from '@/types'

export function useFranchiseeData() {
  const { appUser } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActiveCampaigns = useCallback(async () => {
    if (!appUser?.organization_id) return

    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, description, status, channels, start_date, end_date, created_at')
        .eq('organization_id', appUser.organization_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCampaigns(data as Campaign[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte hämta kampanjer')
    } finally {
      setLoading(false)
    }
  }, [appUser?.organization_id])

  useEffect(() => {
    if (appUser?.organization_id) {
      fetchActiveCampaigns()
    }
  }, [appUser?.organization_id, fetchActiveCampaigns])

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

  async function incrementDownload(assetId: string): Promise<void> {
    await supabase.rpc('increment_download_count', { asset_id: assetId })
  }

  return {
    campaigns,
    loading,
    error,
    fetchActiveCampaigns,
    fetchCampaignAssets,
    fetchCampaignById,
    incrementDownload,
  }
}
