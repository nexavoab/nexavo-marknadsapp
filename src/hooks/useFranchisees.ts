/**
 * Franchisees Hook
 * Hämtar franchisees för organisationen
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Franchisee } from '@/types'

interface UseFranchiseesReturn {
  franchisees: Franchisee[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useFranchisees(): UseFranchiseesReturn {
  const { appUser } = useAuth()
  const [franchisees, setFranchisees] = useState<Franchisee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFranchisees = useCallback(async () => {
    if (!appUser?.organization_id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('franchisees')
        .select('*')
        .eq('organization_id', appUser.organization_id)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (fetchError) throw fetchError

      setFranchisees(data as Franchisee[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte hämta franchisees')
      // Fallback med mock-data om tabellen inte finns
      console.warn('Using mock franchisee data:', err)
      setFranchisees(getMockFranchisees(appUser.organization_id))
    } finally {
      setLoading(false)
    }
  }, [appUser?.organization_id])

  useEffect(() => {
    fetchFranchisees()
  }, [fetchFranchisees])

  return {
    franchisees,
    loading,
    error,
    refetch: fetchFranchisees,
  }
}

/**
 * Mock-data för utveckling om franchisees-tabellen saknas
 */
function getMockFranchisees(organizationId: string): Franchisee[] {
  return [
    {
      id: 'mock-1',
      organization_id: organizationId,
      name: 'Stockholm City',
      region: 'Stockholm',
      contact_email: 'stockholm@example.com',
      contact_phone: '08-123 456 78',
      address: {
        street: 'Storgatan 1',
        city: 'Stockholm',
        zip: '111 22',
        country: 'Sverige',
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'mock-2',
      organization_id: organizationId,
      name: 'Göteborg Centrum',
      region: 'Västra Götaland',
      contact_email: 'goteborg@example.com',
      contact_phone: '031-987 654 32',
      address: {
        street: 'Avenyn 10',
        city: 'Göteborg',
        zip: '411 36',
        country: 'Sverige',
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'mock-3',
      organization_id: organizationId,
      name: 'Malmö Syd',
      region: 'Skåne',
      contact_email: 'malmo@example.com',
      contact_phone: '040-555 123 45',
      address: {
        street: 'Södergatan 5',
        city: 'Malmö',
        zip: '211 34',
        country: 'Sverige',
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]
}
