import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSocialConnections, type SocialProvider, type SocialConnection } from '@/hooks/useSocialConnections'
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
  Linkedin,
  Clock
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

// TikTok icon
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  )
}

interface IntegrationProvider {
  id: SocialProvider
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
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Publicera innehåll och kör kampanjer på LinkedIn för B2B-marknadsföring.',
    icon: Linkedin,
    iconBgColor: 'bg-blue-700',
    available: false,
    comingSoon: true,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Nå yngre målgrupper med kreativa videoannonser på TikTok.',
    icon: TikTokIcon,
    iconBgColor: 'bg-black',
    available: false,
    comingSoon: true,
  },
]

function StatusBadge({ status }: { status: 'active' | 'expired' | 'revoked' | 'disconnected' }) {
  switch (status) {
    case 'active':
      return (
        <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Ansluten
        </Badge>
      )
    case 'expired':
      return (
        <Badge variant="default" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
          <Clock className="h-3 w-3 mr-1" />
          Utgången
        </Badge>
      )
    case 'revoked':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Återkallad
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary">
          <XCircle className="h-3 w-3 mr-1" />
          Ej ansluten
        </Badge>
      )
  }
}

function IntegrationCard({
  provider,
  connection,
  status,
  onConnect,
  onDisconnect,
  onRefresh,
  loading,
  stepNumber,
}: {
  provider: IntegrationProvider
  connection?: SocialConnection
  status: 'active' | 'expired' | 'revoked' | 'disconnected'
  onConnect: () => void
  onDisconnect: () => void
  onRefresh: () => void
  loading: boolean
  stepNumber: number
}) {
  const isConnected = status === 'active'
  const isExpired = status === 'expired'
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
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{provider.name}</CardTitle>
            <StatusBadge status={status} />
          </div>
          <CardDescription className="mt-1">
            {provider.description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {connection?.provider_account_name && (
              <p className="text-sm text-muted-foreground">
                Konto: <span className="font-medium text-foreground">{connection.provider_account_name}</span>
              </p>
            )}
            {!isConnected && !provider.comingSoon && (
              <p className="text-xs text-muted-foreground mt-1">
                Ansluts centralt av HQ — gäller alla franchisetagare automatiskt
              </p>
            )}
            {isConnected && connection?.expires_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Utgår: {new Date(connection.expires_at).toLocaleDateString('sv-SE')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={loading || !provider.available}
                title="Förnya token"
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            )}
            {isConnected || isExpired ? (
              <>
                {isExpired && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onConnect}
                    disabled={loading || !provider.available}
                  >
                    Förnya
                  </Button>
                )}
                <Button
                  variant={isExpired ? 'outline' : 'destructive'}
                  size="sm"
                  onClick={onDisconnect}
                  disabled={loading || !provider.available}
                >
                  Koppla från
                </Button>
              </>
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
        {connection?.updated_at && (
          <p className="text-xs text-muted-foreground mt-3">
            Senast uppdaterad: {new Date(connection.updated_at).toLocaleString('sv-SE')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function IntegrationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    connections,
    loading,
    error: hookError,
    connectProvider,
    disconnectProvider,
    refreshProvider,
    getConnection,
    getStatus,
    reload,
  } = useSocialConnections()
  
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
      setSearchParams({})
      reload()
    } else if (errorParam) {
      setError(`Anslutning misslyckades: ${errorParam}`)
      setSearchParams({})
    }
  }, [searchParams, setSearchParams, reload])

  // Sync hook error to local error state
  useEffect(() => {
    if (hookError) {
      setError(hookError)
    }
  }, [hookError])

  const handleConnect = async (providerId: SocialProvider) => {
    setActionLoading(providerId)
    setError(null)

    try {
      await connectProvider(providerId)
    } catch (err) {
      console.error('Connect failed:', err)
      setError(err instanceof Error ? err.message : 'Anslutning misslyckades')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDisconnect = async (providerId: SocialProvider) => {
    if (!confirm('Är du säker på att du vill koppla från denna integration?')) {
      return
    }

    setActionLoading(providerId)
    setError(null)

    try {
      await disconnectProvider(providerId)
      setSuccess('Integration frånkopplad')
    } catch (err) {
      console.error('Disconnect failed:', err)
      setError(err instanceof Error ? err.message : 'Kunde inte koppla från integration')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRefresh = async (providerId: SocialProvider) => {
    setActionLoading(providerId)
    setError(null)

    try {
      await refreshProvider(providerId)
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

  const activeConnections = connections.filter(c => c.status === 'active').length

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
      {!loading && activeConnections === 0 && (
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
              const connection = getConnection(provider.id)
              const status = getStatus(provider.id)
              return (
                <IntegrationCard
                  key={provider.id}
                  provider={provider}
                  connection={connection}
                  status={status}
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
                const connection = getConnection(provider.id)
                const status = getStatus(provider.id)
                return (
                  <IntegrationCard
                    key={provider.id}
                    provider={provider}
                    connection={connection}
                    status={status}
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
