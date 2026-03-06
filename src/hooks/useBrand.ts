import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Brand } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

export function useBrand() {
  const { appUser } = useAuth()
  const [brand, setBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBrand = useCallback(async () => {
    if (!appUser?.organization_id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('organization_id', appUser.organization_id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setBrand(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Okänt fel')
    } finally {
      setLoading(false)
    }
  }, [appUser?.organization_id])

  useEffect(() => {
    fetchBrand()
  }, [fetchBrand])

  async function saveBrand(updates: Partial<Brand>): Promise<Brand | undefined> {
    if (!appUser?.organization_id) return

    try {
      const { data, error } = brand
        ? await supabase
            .from('brands')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', brand.id)
            .select()
            .single()
        : await supabase
            .from('brands')
            .insert({ ...updates, organization_id: appUser.organization_id })
            .select()
            .single()

      if (error) throw error
      setBrand(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara varumärke')
      throw err
    }
  }

  return { brand, loading, error, saveBrand, refetch: fetchBrand }
}
