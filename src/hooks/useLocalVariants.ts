/**
 * Local Variants Hook
 * Hämtar och genererar lokala varianter för franchisees
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { LocalVariant, Franchisee, Asset, GenerationStatus } from '@/types'

export interface LocalVariantWithFranchisee extends LocalVariant {
  franchisee?: Franchisee
  previewText?: string
}

interface UseLocalVariantsReturn {
  variants: LocalVariantWithFranchisee[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  generateVariantsForCampaign: (
    campaignId: string,
    franchisees: Franchisee[],
    assets: Asset[]
  ) => Promise<{ generated: number; failed: number }>
}

/**
 * Swappar variabler i texten med franchisee-data
 * Fallback: om variabel saknas → visar [PLACEHOLDER]
 */
export function swapVariables(
  text: string,
  franchisee: Franchisee
): string {
  const variables: Record<string, string> = {
    '{{franchisee_name}}': franchisee.name || '[FRANCHISEE_NAME]',
    '{{city}}': franchisee.address?.city || '[CITY]',
    '{{phone}}': franchisee.contact_phone || '[PHONE]',
    '{{email}}': franchisee.contact_email || '[EMAIL]',
    '{{street}}': franchisee.address?.street || '[STREET]',
    '{{zip}}': franchisee.address?.zip || '[ZIP]',
    '{{region}}': franchisee.region || '[REGION]',
  }

  let result = text
  for (const [placeholder, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(placeholder, 'gi'), value)
  }
  return result
}

export function useLocalVariants(campaignId: string | undefined): UseLocalVariantsReturn {
  const { appUser } = useAuth()
  const [variants, setVariants] = useState<LocalVariantWithFranchisee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVariants = useCallback(async () => {
    if (!appUser?.organization_id || !campaignId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Hämta alla assets för kampanjen först
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('organization_id', appUser.organization_id)

      if (assetsError) throw assetsError

      const assetIds = assets?.map((a) => a.id) || []

      if (assetIds.length === 0) {
        setVariants([])
        return
      }

      // Hämta varianter för dessa assets
      const { data: variantsData, error: variantsError } = await supabase
        .from('local_variants')
        .select(`
          *,
          franchisee:franchisees(*)
        `)
        .in('asset_id', assetIds)
        .eq('organization_id', appUser.organization_id)
        .order('created_at', { ascending: false })

      if (variantsError) {
        // Om tabellen inte finns ännu, returnera tom array
        if (variantsError.code === '42P01') {
          setVariants([])
          return
        }
        throw variantsError
      }

      setVariants(variantsData as LocalVariantWithFranchisee[])
    } catch (err) {
      console.error('Error fetching local variants:', err)
      setError(err instanceof Error ? err.message : 'Kunde inte hämta varianter')
      setVariants([])
    } finally {
      setLoading(false)
    }
  }, [appUser?.organization_id, campaignId])

  useEffect(() => {
    fetchVariants()
  }, [fetchVariants])

  /**
   * Genererar lokala varianter för alla franchisees
   * - Loopar över franchisees
   * - Swappar variabler i asset copy
   * - Sparar till local_variants
   */
  async function generateVariantsForCampaign(
    targetCampaignId: string,
    franchisees: Franchisee[],
    assets: Asset[]
  ): Promise<{ generated: number; failed: number }> {
    if (!appUser?.organization_id) {
      throw new Error('Ej inloggad')
    }

    let generated = 0
    let failed = 0

    for (const asset of assets) {
      for (const franchisee of franchisees) {
        try {
          // Kontrollera om variant redan finns
          const { data: existing } = await supabase
            .from('local_variants')
            .select('id')
            .eq('asset_id', asset.id)
            .eq('franchisee_id', franchisee.id)
            .single()

          if (existing) {
            // Uppdatera befintlig variant
            const { error: updateError } = await supabase
              .from('local_variants')
              .update({
                variables_snapshot: {
                  franchisee_name: franchisee.name,
                  city: franchisee.address?.city,
                  phone: franchisee.contact_phone,
                  original_copy: asset.copy_text,
                  swapped_copy: asset.copy_text
                    ? swapVariables(asset.copy_text, franchisee)
                    : null,
                },
                generation_status: 'completed' as GenerationStatus,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id)

            if (updateError) throw updateError
            generated++
          } else {
            // Skapa ny variant
            const { error: insertError } = await supabase
              .from('local_variants')
              .insert({
                asset_id: asset.id,
                franchisee_id: franchisee.id,
                organization_id: appUser.organization_id,
                storage_path: `variants/${targetCampaignId}/${franchisee.id}/${asset.id}`,
                variables_snapshot: {
                  franchisee_name: franchisee.name,
                  city: franchisee.address?.city,
                  phone: franchisee.contact_phone,
                  original_copy: asset.copy_text,
                  swapped_copy: asset.copy_text
                    ? swapVariables(asset.copy_text, franchisee)
                    : null,
                },
                generation_status: 'completed' as GenerationStatus,
              })

            if (insertError) throw insertError
            generated++
          }
        } catch (err) {
          console.error(`Failed to generate variant for ${franchisee.name}:`, err)
          failed++
        }
      }
    }

    // Uppdatera lista efter generering
    await fetchVariants()

    return { generated, failed }
  }

  return {
    variants,
    loading,
    error,
    refetch: fetchVariants,
    generateVariantsForCampaign,
  }
}
