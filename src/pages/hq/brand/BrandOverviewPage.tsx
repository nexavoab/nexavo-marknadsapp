import { useNavigate } from 'react-router-dom'
import { useBrandContext } from '@/contexts/BrandContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Edit, 
  Palette, 
  Type, 
  Shield,
  AlertCircle
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const TONE_LABELS = {
  formality: { low: 'Formell', high: 'Avslappnad' },
  modernity: { low: 'Klassisk', high: 'Modern' },
  emotion: { low: 'Saklig', high: 'Varm' },
  volume: { low: 'Subtil', high: 'Bestämd' },
}

export default function BrandOverviewPage() {
  const navigate = useNavigate()
  const { brand, loading, error } = useBrandContext()

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <span className="text-destructive">{error}</span>
        </div>
      </div>
    )
  }

  if (!brand) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Inget varumärke uppsatt</h2>
          <p className="text-muted-foreground mb-4">
            Sätt upp ert varumärke för att komma igång med AI-generering
          </p>
          <Button onClick={() => navigate('/hq/brand/setup')}>
            Sätt upp varumärke
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">{brand.name}</h1>
          <p className="text-muted-foreground">Ert varumärke</p>
        </div>
        <Button onClick={() => navigate('/hq/brand/setup?edit=true')}>
          <Edit className="w-4 h-4 mr-2" />
          Redigera
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Logo section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Logotyp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-8">
              {/* Light background */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">På ljus bakgrund</p>
                <div className="w-48 h-32 bg-white border rounded-lg flex items-center justify-center p-4">
                  {brand.logos?.primary_url ? (
                    <img
                      src={brand.logos.primary_url}
                      alt={brand.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-muted-foreground text-sm">Ingen logotyp</span>
                  )}
                </div>
              </div>

              {/* Dark background */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">På mörk bakgrund</p>
                <div className="w-48 h-32 bg-slate-800 border rounded-lg flex items-center justify-center p-4">
                  {brand.logos?.dark_bg_url || brand.logos?.primary_url ? (
                    <img
                      src={brand.logos.dark_bg_url || brand.logos.primary_url}
                      alt={brand.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-muted-foreground text-sm">Ingen logotyp</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Colors section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Färgpalett
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              {brand.colors?.primary && (
                <div className="text-center">
                  <div
                    className="w-20 h-20 rounded-full shadow-md mb-2"
                    style={{ backgroundColor: brand.colors.primary }}
                  />
                  <p className="text-sm font-medium">Primär</p>
                  <p className="text-xs text-muted-foreground font-mono">{brand.colors.primary}</p>
                </div>
              )}
              {brand.colors?.secondary && (
                <div className="text-center">
                  <div
                    className="w-20 h-20 rounded-full shadow-md mb-2"
                    style={{ backgroundColor: brand.colors.secondary }}
                  />
                  <p className="text-sm font-medium">Sekundär</p>
                  <p className="text-xs text-muted-foreground font-mono">{brand.colors.secondary}</p>
                </div>
              )}
              {brand.colors?.accent && (
                <div className="text-center">
                  <div
                    className="w-20 h-20 rounded-full shadow-md mb-2"
                    style={{ backgroundColor: brand.colors.accent }}
                  />
                  <p className="text-sm font-medium">Accent</p>
                  <p className="text-xs text-muted-foreground font-mono">{brand.colors.accent}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Typography section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="w-5 h-5" />
              Typsnitt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Rubriker</p>
                <p className="text-lg font-semibold">{brand.typography?.heading_font || 'Ej angivet'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Brödtext</p>
                <p className="text-lg">{brand.typography?.body_font || 'Ej angivet'}</p>
              </div>
            </div>
            {brand.typography?.google_fonts_url && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Google Fonts URL</p>
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {brand.typography.google_fonts_url}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tone of voice section */}
        <Card>
          <CardHeader>
            <CardTitle>Ton och röst</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(TONE_LABELS).map(([key, labels]) => {
                const value = brand.tone_traits?.[key as keyof typeof brand.tone_traits] ?? 0.5
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{labels.low}</span>
                      <span className="text-muted-foreground">{labels.high}</span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full">
                      <div
                        className="absolute left-0 top-0 h-full bg-primary rounded-full"
                        style={{ width: `${value * 100}%` }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full border-2 border-white shadow"
                        style={{ left: `calc(${value * 100}% - 8px)` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Guardrails section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Skyddsregler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Forbidden words */}
            <div>
              <p className="text-sm font-medium mb-2">Förbjudna ord</p>
              {brand.forbidden_words && brand.forbidden_words.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {brand.forbidden_words.map(word => (
                    <Badge key={word} variant="destructive">
                      {word}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Inga förbjudna ord angivna</p>
              )}
            </div>

            <Separator />

            {/* Required disclaimers */}
            <div>
              <p className="text-sm font-medium mb-2">Obligatoriska disclaimers</p>
              {brand.required_disclaimers && brand.required_disclaimers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {brand.required_disclaimers.map(disclaimer => (
                    <Badge key={disclaimer} variant="outline">
                      {disclaimer}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Inga obligatoriska disclaimers angivna</p>
              )}
            </div>

            <Separator />

            {/* Forbidden image styles */}
            <div>
              <p className="text-sm font-medium mb-2">Förbjudna bildstilstyper</p>
              {brand.imagery?.forbidden_styles && brand.imagery.forbidden_styles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {brand.imagery.forbidden_styles.map(style => (
                    <Badge key={style} variant="secondary">
                      {style}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Inga förbjudna bildstilstyper angivna</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
