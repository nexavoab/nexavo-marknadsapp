import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export type SocialProvider = 'meta' | 'google' | 'linkedin' | 'tiktok'

export interface SocialConnection {
  id: string
  org_id: string
  provider: SocialProvider
  provider_account_id: string | null
  provider_account_name: string | null
  vault_secret_id: string | null
  scopes: string[] | null
  status: 'active' | 'expired' | 'revoked'
  expires_at: string | null
  created_at: string
  updated_at: string
}

interface UseSocialConnectionsReturn {
  connections: SocialConnection[]
  loading: boolean
  error: string | null
  connectProvider: (provider: SocialProvider) => Promise<void>
  disconnectProvider: (provider: SocialProvider) => Promise<void>
  refreshProvider: (provider: SocialProvider) => Promise<void>
  isConnected: (provider: SocialProvider) => boolean
  getConnection: (provider: SocialProvider) => SocialConnection | undefined
  getStatus: (provider: SocialProvider) => 'active' | 'expired' | 'revoked' | 'disconnected'
  reload: () => Promise<void>
}

export function useSocialConnections(): UseSocialConnectionsReturn {
  const { appUser } = useAuth()
  const [connections, setConnections] = useState<SocialConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConnections = useCallback(async () => {
    if (!appUser?.organization_id) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('social_connections')
        .select('*')
        .eq('org_id', appUser.organization_id)

      if (fetchError) {
        // Graceful degradation - table might not exist yet
        console.error('Failed to load social connections:', fetchError)
        setConnections([])
      } else {
        setConnections(data ?? [])
      }
    } catch (err) {
      console.error('Failed to load social connections:', err)
      setConnections([])
    } finally {
      setLoading(false)
    }
  }, [appUser?.organization_id])

  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  const connectProvider = useCallback(async (provider: SocialProvider) => {
    if (!appUser?.organization_id) {
      throw new Error('No organization found')
    }

    try {
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      // Call OAuth authorize endpoint
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/integrations-oauth?provider=${provider}&action=authorize`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            organizationId: appUser.organization_id,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error ?? 'Failed to start OAuth flow')
      }

      const { url } = await response.json()
      
      // Redirect to OAuth provider
      window.location.href = url
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed'
      setError(message)
      throw err
    }
  }, [appUser?.organization_id])

  const disconnectProvider = useCallback(async (provider: SocialProvider) => {
    if (!appUser?.organization_id) {
      throw new Error('No organization found')
    }

    try {
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      // Call disconnect endpoint
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/integrations-oauth?provider=${provider}&action=disconnect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error ?? 'Failed to disconnect')
      }

      // Reload connections
      await loadConnections()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Disconnect failed'
      setError(message)
      throw err
    }
  }, [appUser?.organization_id, loadConnections])

  const refreshProvider = useCallback(async (provider: SocialProvider) => {
    try {
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/integrations-oauth?provider=${provider}&action=refresh`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error ?? 'Failed to refresh token')
      }

      // Reload connections
      await loadConnections()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refresh failed'
      setError(message)
      throw err
    }
  }, [loadConnections])

  const isConnected = useCallback((provider: SocialProvider): boolean => {
    const connection = connections.find(c => c.provider === provider)
    return connection?.status === 'active'
  }, [connections])

  const getConnection = useCallback((provider: SocialProvider): SocialConnection | undefined => {
    return connections.find(c => c.provider === provider)
  }, [connections])

  const getStatus = useCallback((provider: SocialProvider): 'active' | 'expired' | 'revoked' | 'disconnected' => {
    const connection = connections.find(c => c.provider === provider)
    return connection?.status ?? 'disconnected'
  }, [connections])

  return {
    connections,
    loading,
    error,
    connectProvider,
    disconnectProvider,
    refreshProvider,
    isConnected,
    getConnection,
    getStatus,
    reload: loadConnections,
  }
}
