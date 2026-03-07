import { useNavigate } from 'react-router-dom'
import { useFranchiseeData } from '@/hooks/useFranchiseeData'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Megaphone, ChevronRight, FolderOpen, Calendar } from 'lucide-react'

export default function FranchisePortalPage() {
  const navigate = useNavigate()
  const { campaigns, loading, error } = useFranchiseeData()

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">📢 Aktiva kampanjer</h1>
          <p className="text-muted-foreground mt-1">Hämta material för dina marknadsaktiviteter</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card rounded-xl border border-border p-6 animate-pulse"
            >
              <div className="h-6 bg-muted rounded w-3/4 mb-3" />
              <div className="h-4 bg-muted/60 rounded w-full mb-2" />
              <div className="h-4 bg-muted/60 rounded w-2/3 mb-4" />
              <div className="h-8 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
          <Megaphone className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Något gick fel</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
          <FolderOpen className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Inga aktiva kampanjer just nu
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Ditt HQ förbereder nytt material. Kom tillbaka snart!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">📢 Aktiva kampanjer</h1>
        <p className="text-muted-foreground mt-1">Hämta material för dina marknadsaktiviteter</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map((campaign) => (
          <Card
            key={campaign.id}
            className="hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => navigate(`/portal/campaign/${campaign.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate(`/portal/campaign/${campaign.id}`)
              }
            }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  {campaign.name}
                </CardTitle>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              {campaign.description && (
                <CardDescription className="line-clamp-2">
                  {campaign.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                {campaign.channels.map((channel) => (
                  <Badge key={channel} variant="secondary" className="text-xs capitalize">
                    {channel}
                  </Badge>
                ))}
              </div>
              {(campaign.start_date || campaign.end_date) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {campaign.start_date && (
                    <span>{new Date(campaign.start_date).toLocaleDateString('sv-SE')}</span>
                  )}
                  {campaign.start_date && campaign.end_date && <span>–</span>}
                  {campaign.end_date && (
                    <span>{new Date(campaign.end_date).toLocaleDateString('sv-SE')}</span>
                  )}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Material tillgängligt
                </span>
                <span className="text-sm font-medium text-primary group-hover:underline">
                  Hämta →
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
