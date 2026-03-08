import { Sparkles, ExternalLink, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AIFeature } from '@/hooks/useAI'

interface AIUpsellBannerProps {
  feature: AIFeature
}

const FEATURE_INFO: Record<
  AIFeature,
  { title: string; benefits: string[] }
> = {
  copy: {
    title: 'AI-genererad copy',
    benefits: [
      'Skapa annonstexter på sekunder',
      'Anpassad efter er tonalitet och varumärke',
      'A/B-testförslag automatiskt',
    ],
  },
  compliance: {
    title: 'AI compliance-check',
    benefits: [
      'Automatisk granskning mot varumärkesregler',
      'Identifiera förbjudna ord och formuleringar',
      'Säkerställ konsekvent kommunikation',
    ],
  },
  chat: {
    title: 'AI-assistent',
    benefits: [
      'Få hjälp med kampanjplanering direkt i appen',
      'Besvara frågor om marknadsföring',
      'Förslag baserade på er bransch',
    ],
  },
  image: {
    title: 'AI-bildgenerering',
    benefits: [
      'Skapa unika bilder för era kampanjer',
      'Anpassade efter er visuella identitet',
      'Ingen fotosession behövs',
    ],
  },
  planning: {
    title: 'AI-planering',
    benefits: [
      'Intelligenta kampanjförslag baserade på säsong',
      'Automatiska påminnelser och tidplaner',
      'Optimera timing för maximal effekt',
    ],
  },
}

export function AIUpsellBanner({ feature }: AIUpsellBannerProps) {
  const info = FEATURE_INFO[feature]

  const handleContact = () => {
    window.location.href = 'mailto:sales@nexavo.se?subject=AI-funktioner%20i%20Marknadsappen'
  }

  const handleReadMore = () => {
    window.open('https://nexavo.se/ai', '_blank')
  }

  return (
    <div className="rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            Lås upp: {info.title}
          </h3>
          <ul className="space-y-1.5 mb-4">
            {info.benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="text-purple-500 mt-0.5">•</span>
                {benefit}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleContact} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Mail className="w-4 h-4 mr-2" />
              Kontakta säljare
            </Button>
            <Button variant="outline" onClick={handleReadMore}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Läs mer
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
