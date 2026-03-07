import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plug, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  RefreshCw,
  AlertCircle,
  Facebook,
  Mail,
  MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Google Ads icon (no lucide equivalent)
function GoogleAdsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.25 1.47a3.13 3.13 0 0 0-2.84 1.76L1.6 17.41a3.13 3.13 0 1 0 5.48 3l7.8-14.18a3.13 3.13 0 0 0-2.63-4.76Zm6.53 3.14a3.13 3.13 0 0 0-2.64 4.76l2.84 5.16a3.13 3.13 0 1 0 5.48-3l-2.84-5.16a3.13 3.13 0 0 0-2.84-1.76ZM5.2 17.88a3.13 3.13 0 1 0 0 6.26 3.13 3.13 0 0 0 0-6.26Z"/>
    </svg>
  )
}

interface Integration {
  id: string
  provider: string
  status: 'active' | 'expired' | 'error' | 'disconnected'
  updated_at: string
  token_expires_at: string | null
}

interface IntegrationProvider {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconBgColor: string
  available: boolean
  comingSoon?: boolean
}

const providers: IntegrationProvider[] = [
  {
    id: 'meta',
    name: 'Meta Ads',
    description: 'Publicera och synkronisera kampanjer direkt till Facebook & Instagram-annonser för alla dina franchisetagare.',
    icon: Facebook,
    iconBgColor: 'bg-blue-500',
    available: true,
  },
  {
    id: 'google',
    name: 'Google Ads',
    description: 'Kör sökannonser och Performance Max-kampanjer per ort och franchisetagare.',
    icon: GoogleAdsIcon,
    iconBgColor: 'bg-amber-500',
    available: true,
  },
  {
    id: 'email',
    name: 'E-post',
    description: 'Automatiserade e-postutskick för kampanjstart, påminnelser och bekräftelser.',
    icon: Mail,
    iconBgColor: 'bg-emerald-500',
    available: false,
    comingSoon: true,
  },
  {
    id: 'sms',
    name: 'SMS',
    description: 'Pushnotifikationer via SMS när kampanjer är redo att godkännas.',
    icon: MessageSquare,
    iconBgColor: 'bg-purple-500',
    available: false,
    comingSoon: true,
  },
]

function IntegrationCard({
  provider,
  integration,
  onConnect,
  onDisconnect,
  onRefresh,
  loading,
  stepNumber,
}: {
  provider: IntegrationProvider
  integration?: Integration
  onConnect: () => void
  onDisconnect: () => void
  onRefresh: () => void
  loading: boolean
  stepNumber: number
}) {
  const isConnected = integration?.status === 'active'
  const isExpired = integration?.status === 'expired'
  const Icon = provider.icon

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all',
      provider.comingSoon && 'opacity-60'
    )}>
      {/* Step number indicator */}
      <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold z-10">
        {stepNumber}
      </div>
      {provider.comingSoon && (
        <div className="absolute top-3 right-3">
          <Badge variant="secondary">Kommer snart</Badge>
        </div>
      )}
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <div className={cn('p-3 rounded-lg', provider.iconBgColor)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-lg">{provider.name}</CardTitle>
          <CardDescription className="mt-1">
            {provider.description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">Ansluten</span>
                </div>
                <p className="text-xs text-emerald-600 mt-1">
                  ✓ 18/24 franchisetagare aktiva
                </p>
              </div>
            ) : isExpired ? (
              <div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <span className="text-sm text-amber-600 font-medium">Token utgången</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ansluts centralt av HQ — gäller alla franchisetagare automatiskt
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-slate-400" />
                  <span className="text-sm text-slate-500">Ej ansluten</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ansluts centralt av HQ — gäller alla franchisetagare automatiskt
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={loading || !provider.available}
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            )}
            {isConnected || isExpired ? (
              <Button
                variant={isExpired ? 'default' : 'outline'}
                size="sm"
                onClick={isExpired ? onConnect : onDisconnect}
                disabled={loading || !provider.available}
              >
                {isExpired ? 'Förnya' : 'Koppla från'}
              </Button>
            ) : provider.comingSoon ? (
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => alert('Du är anmäld till väntelistan!')}
              >
                Meddela mig när det är klart →
              </button>
            ) : (
              <Button
                size="sm"
                onClick={onConnect}
                disabled={loading || !provider.available}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Anslut
              </Button>
            )}
          </div>
        </div>
        {integration?.updated_at && (
          <p className="text-xs text-muted-foreground mt-3">
            Senast uppdaterad: {new Date(integration.updated_at).toLocaleString('sv-SE')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function IntegrationsPage() {
  const { appUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Handle URL params from OAuth callback
  useEffect(() => {
    const successParam = searchParams.get('success')
    const errorParam = searchParams.get('error')
    const providerParam = searchParams.get('provider')

    if (successParam === 'true' && providerParam) {
      const providerName = providers.find(p => p.id === providerParam)?.name ?? providerParam
      setSuccess(`${providerName} har anslutits!`)
      // Clear URL params
      setSearchParams({})
      // Reload integrations
      loadIntegrations()
    } else if (errorParam) {
      setError(`Anslutning misslyckades: ${errorParam}`)
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  const loadIntegrations = async () => {
    if (!appUser?.organization_id) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('organization_id', appUser.organization_id)

      if (error) {
        // Graceful degradation: log error but show providers anyway
        console.error('Failed to load integrations:', error)
        setIntegrations([])
      } else {
        setIntegrations(data ?? [])
      }
    } catch (err) {
      // Graceful degradation: log error but don't show error banner
      console.error('Failed to load integrations:', err)
      setIntegrations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIntegrations()
  }, [appUser?.organization_id])

  const handleConnect = async (providerId: string) => {
    setActionLoading(providerId)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Inte inloggad')
      }

      // Call the OAuth initiate endpoint
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/integrations-oauth?provider=${providerId}&action=initiate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            organizationId: appUser?.organization_id,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Kunde inte starta OAuth-flöde')
      }

      const { url } = await response.json()
      
      // Redirect to OAuth provider
      window.location.href = url
    } catch (err) {
      console.error('Connect failed:', err)
      setError(err instanceof Error ? err.message : 'Anslutning misslyckades')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDisconnect = async (providerId: string) => {
    if (!confirm('Är du säker på att du vill koppla från denna integration?')) {
      return
    }

    setActionLoading(providerId)
    setError(null)

    try {
      const { error } = await supabase
        .from('integrations')
        .update({ status: 'disconnected' })
        .eq('organization_id', appUser?.organization_id)
        .eq('provider', providerId)

      if (error) throw error

      await loadIntegrations()
      setSuccess('Integration frånkopplad')
    } catch (err) {
      console.error('Disconnect failed:', err)
      setError('Kunde inte koppla från integration')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRefresh = async (providerId: string) => {
    setActionLoading(providerId)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Inte inloggad')
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/integrations-oauth?provider=${providerId}&action=refresh`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Kunde inte förnya token')
      }

      await loadIntegrations()
      setSuccess('Token förnyad')
    } catch (err) {
      console.error('Refresh failed:', err)
      setError(err instanceof Error ? err.message : 'Kunde inte förnya token')
    } finally {
      setActionLoading(null)
    }
  }

  // Clear alerts after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Plug className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Integrationer</h1>
        </div>
        <p className="text-muted-foreground">
          Anslut externa tjänster för att synkronisera kampanjer och automatisera marknadsföring.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Onboarding banner - show when no providers are connected */}
      {!loading && integrations.filter(i => i.status === 'active').length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <div className="text-blue-500 text-xl">💡</div>
          <div>
            <p className="text-sm font-medium text-blue-900">Anslut Meta Ads för att komma igång</p>
            <p className="text-sm text-blue-700 mt-1">
              Börja med Meta Ads — det täcker Facebook och Instagram och når direkt alla dina franchisetagare.
              Anslutningen tar ca 2 minuter.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <div className="w-12 h-12 rounded-lg bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-24 bg-slate-200 rounded" />
                  <div className="h-4 w-48 bg-slate-100 rounded" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-full bg-slate-100 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Available Integrations */}
          <div className="grid gap-4 md:grid-cols-2">
            {providers.filter(p => !p.comingSoon).map((provider, index) => {
              const integration = integrations.find((i) => i.provider === provider.id)
              return (
                <IntegrationCard
                  key={provider.id}
                  provider={provider}
                  integration={integration}
                  onConnect={() => handleConnect(provider.id)}
                  onDisconnect={() => handleDisconnect(provider.id)}
                  onRefresh={() => handleRefresh(provider.id)}
                  loading={actionLoading === provider.id}
                  stepNumber={index + 1}
                />
              )
            })}
          </div>

          {/* Roadmap Section */}
          <section className="mt-8">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Roadmap</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-50">
              {providers.filter(p => p.comingSoon).map((provider, index) => {
                const integration = integrations.find((i) => i.provider === provider.id)
                return (
                  <IntegrationCard
                    key={provider.id}
                    provider={provider}
                    integration={integration}
                    onConnect={() => handleConnect(provider.id)}
                    onDisconnect={() => handleDisconnect(provider.id)}
                    onRefresh={() => handleRefresh(provider.id)}
                    loading={actionLoading === provider.id}
                    stepNumber={providers.filter(p => !p.comingSoon).length + index + 1}
                  />
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
