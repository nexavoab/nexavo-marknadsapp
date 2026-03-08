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
  AlertCircle,
  Target,
  MessageSquare
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { ToneTraits } from '@/types'

const TONE_LABELS = {
  formality: { low: 'Formell', high: 'Avslappnad' },
  modernity: { low: 'Klassisk', high: 'Modern' },
  emotion: { low: 'Saklig', high: 'Varm' },
  volume: { low: 'Subtil', high: 'Bestämd' },
} as const

function getToneTraitBadges(toneTraits: ToneTraits | null | undefined): string[] {
  if (!toneTraits) return []
  
  const badges: string[] = []
  
  // Formality
  badges.push((toneTraits.formality ?? 0.5) >= 0.5 
    ? TONE_LABELS.formality.high 
    : TONE_LABELS.formality.low)
  
  // Modernity
  badges.push((toneTraits.modernity ?? 0.5) >= 0.5 
    ? TONE_LABELS.modernity.high 
    : TONE_LABELS.modernity.low)
  
  // Emotion
  badges.push((toneTraits.emotion ?? 0.5) >= 0.5 
    ? TONE_LABELS.emotion.high 
    : TONE_LABELS.emotion.low)
  
  // Volume
  badges.push((toneTraits.volume ?? 0.5) >= 0.5 
    ? TONE_LABELS.volume.high 
    : TONE_LABELS.volume.low)
  
  return badges
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
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1">{brand.name}</h1>
          <p className="text-muted-foreground">Ert varumärke</p>
        </div>
        <Button onClick={() => navigate('/hq/brand/setup?edit=true')} className="w-full sm:w-auto">
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
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
              {/* Light background - fixed white for logo preview */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">På ljus bakgrund</p>
                <div className="w-full sm:w-48 h-32 bg-white border border-border rounded-lg flex items-center justify-center p-4">
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
                <div className="w-full sm:w-48 h-32 bg-foreground border border-border rounded-lg flex items-center justify-center p-4">
                  {brand.logos?.dark_bg_url || brand.logos?.primary_url ? (
                    <img
                      src={brand.logos.dark_bg_url || brand.logos.primary_url}
                      alt={brand.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-background text-sm">Ingen logotyp</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Positioning section */}
        {brand.positioning && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Target className="w-5 h-5" />
                Positionering
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed">{brand.positioning}</p>
            </CardContent>
          </Card>
        )}

        {/* Colors section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Färgpalett
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 sm:gap-6">
              {brand.colors?.primary && (
                <div className="text-center">
                  <div
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-md mb-2 mx-auto"
                    style={{ backgroundColor: brand.colors.primary }}
                  />
                  <p className="text-sm font-medium">Primär</p>
                  <p className="text-xs text-muted-foreground font-mono">{brand.colors.primary}</p>
                </div>
              )}
              {brand.colors?.secondary && (
                <div className="text-center">
                  <div
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-md mb-2 mx-auto"
                    style={{ backgroundColor: brand.colors.secondary }}
                  />
                  <p className="text-sm font-medium">Sekundär</p>
                  <p className="text-xs text-muted-foreground font-mono">{brand.colors.secondary}</p>
                </div>
              )}
              {brand.colors?.accent && (
                <div className="text-center">
                  <div
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-md mb-2 mx-auto"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Rubriker</p>
                <p className="text-base sm:text-lg font-semibold">{brand.typography?.heading_font || 'Ej angivet'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Brödtext</p>
                <p className="text-base sm:text-lg">{brand.typography?.body_font || 'Ej angivet'}</p>
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
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <MessageSquare className="w-5 h-5" />
              Ton och röst
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {getToneTraitBadges(brand.tone_traits).map((trait) => (
                <Badge key={trait} variant="secondary" className="text-sm px-3 py-1">
                  {trait}
                </Badge>
              ))}
            </div>
            {(!brand.tone_traits || getToneTraitBadges(brand.tone_traits).length === 0) && (
              <p className="text-sm text-muted-foreground">Ingen tonalitet angiven</p>
            )}
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
