/**
 * Campaign Wizard Component
 * 4-stegs wizard: Brief → Tema → Kanaler → Preview & Publicera
 */

import { useState, useCallback, useEffect } from 'react'
import { useBrandContext } from '@/contexts/BrandContext'
import { useAIGateway, type ConceptResponse, type GuardrailsResponse } from '@/hooks/useAIGateway'
import { useAssets } from '@/hooks/useAssets'
import { useCampaigns } from '@/hooks/useCampaigns'
import { adaptBrandForAI } from '@/lib/brandContextAdapter'
import { compositeAd, AD_FORMATS } from '@/lib/adCompositor'
import { DeviceMockup, getFormatDisplayName, getFormatIcon } from './DeviceMockup'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type {
  Campaign,
  CampaignDraft,
  CampaignFormat,
  CampaignChannel,
  CampaignConcept,
  TemplateFormat,
} from '@/types'
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Calendar,
  Save,
  Send,
} from 'lucide-react'

// ============ Types ============

interface CampaignWizardProps {
  onComplete: (campaign: Campaign) => void
}

interface StepProps {
  draft: CampaignDraft
  setDraft: React.Dispatch<React.SetStateAction<CampaignDraft>>
  onNext: () => void
  onBack?: () => void
}

// ============ Step Constants ============

const STEPS = [
  { id: 1, title: 'Brief', description: 'Beskriv kampanjen' },
  { id: 2, title: 'Tema', description: 'Välj koncept' },
  { id: 3, title: 'Kanaler', description: 'Välj format' },
  { id: 4, title: 'Preview', description: 'Granska & publicera' },
] as const

const CHANNEL_FORMATS: Record<string, { label: string; formats: TemplateFormat[] }> = {
  social: {
    label: '📱 SOCIALT',
    formats: ['facebook_feed', 'facebook_story', 'instagram_feed', 'instagram_story'],
  },
  linkedin: {
    label: '💼 LINKEDIN',
    formats: ['linkedin_post', 'linkedin_article'],
  },
  tiktok: {
    label: '🎵 TIKTOK',
    formats: ['tiktok_video', 'tiktok_spark'],
  },
  google: {
    label: '🔍 GOOGLE',
    formats: ['google_display'],
  },
  print: {
    label: '🖨️ PRINT',
    formats: ['print_a4', 'print_a5'],
  },
  email: {
    label: '📧 E-POST',
    formats: ['email_header'],
  },
}

const FORMAT_DIMENSIONS: Record<TemplateFormat, string> = {
  facebook_feed: '1080×1080',
  facebook_story: '1080×1920',
  instagram_feed: '1080×1080',
  instagram_story: '1080×1920',
  linkedin_post: '1200×627',
  linkedin_article: '1200×627',
  tiktok_video: '1080×1920',
  tiktok_spark: '1080×1920',
  google_display: '300×250',
  google_search: 'Text',
  print_a4: '2480×3508',
  print_a5: '1748×2480',
  print_a3: '3508×4960',
  print_flyer: '2480×3508',
  email_header: '600×200',
  email_newsletter: '600×800',
}

// ============ Main Component ============

export function CampaignWizard({ onComplete }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [draft, setDraft] = useState<CampaignDraft>({
    name: '',
    description: '',
    channels: [],
    start_date: '',
    end_date: '',
    formats: [],
    status: 'draft',
  })

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 4))
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1))

  return (
    <div className="space-y-8">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all',
                currentStep === step.id
                  ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                  : currentStep > step.id
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              )}
            >
              {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'w-16 h-1 mx-2',
                  currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Title */}
      <div className="text-center">
        <h2 className="text-xl font-semibold">{STEPS[currentStep - 1].title}</h2>
        <p className="text-gray-500">{STEPS[currentStep - 1].description}</p>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <StepBrief draft={draft} setDraft={setDraft} onNext={goNext} />
        )}
        {currentStep === 2 && (
          <StepTema draft={draft} onNext={goNext} onBack={goBack} />
        )}
        {currentStep === 3 && (
          <StepChannels draft={draft} setDraft={setDraft} onNext={goNext} onBack={goBack} />
        )}
        {currentStep === 4 && (
          <StepPreview
            draft={draft}
            setDraft={setDraft}
            onBack={goBack}
            onComplete={onComplete}
          />
        )}
      </div>
    </div>
  )
}

// ============ Step 1: Brief ============

function StepBrief({ draft, setDraft, onNext }: StepProps) {
  const { brand } = useBrandContext()
  const { generateConcept } = useAIGateway()
  const [loading, setLoading] = useState(false)
  const [concepts, setConcepts] = useState<CampaignConcept[]>([])

  const handleGenerateConcept = async () => {
    if (!brand || !draft.name || !draft.description) {
      toast.error('Fyll i namn och beskrivning')
      return
    }

    setLoading(true)
    try {
      const brandContext = adaptBrandForAI(brand)
      const result: ConceptResponse = await generateConcept({
        brandContext,
        campaignBrief: `${draft.name}: ${draft.description}`,
        targetChannels: draft.channels.length > 0 ? draft.channels : ['facebook', 'instagram'],
      })

      setConcepts(result.concepts)
      toast.success('Koncept genererade!')
    } catch (err) {
      toast.error('Kunde inte generera koncept')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const selectConcept = (concept: CampaignConcept) => {
    setDraft((d) => ({ ...d, concept }))
    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div>
          <Label htmlFor="name">Kampanjnamn</Label>
          <Input
            id="name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="T.ex. Höstkampanj 2026"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="description">Beskriv kampanjen</Label>
          <textarea
            id="description"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="T.ex. Höstkampanj för städ och trädgård, 20% rabatt för nya kunder i oktober"
            className="mt-1 w-full h-24 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start_date">
              <Calendar className="w-4 h-4 inline mr-1" />
              Startdatum
            </Label>
            <Input
              id="start_date"
              type="date"
              value={draft.start_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDraft((d) => ({ ...d, start_date: e.target.value }))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="end_date">Slutdatum</Label>
            <Input
              id="end_date"
              type="date"
              value={draft.end_date}
              min={draft.start_date || new Date().toISOString().split('T')[0]}
              onChange={(e) => setDraft((d) => ({ ...d, end_date: e.target.value }))}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleGenerateConcept}
          disabled={loading || !draft.name || !draft.description}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              AI arbetar...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generera koncept ⚡
            </>
          )}
        </Button>
      </div>

      {/* Concept Selection */}
      {concepts.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-center">Välj ett koncept:</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {concepts.map((concept, i) => (
              <button
                key={i}
                onClick={() => selectConcept(concept)}
                className={cn(
                  'p-4 text-left rounded-lg border-2 transition-all hover:shadow-md',
                  draft.concept?.headline === concept.headline
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                )}
              >
                <h4 className="font-semibold text-blue-700">{concept.headline}</h4>
                <p className="text-sm text-gray-600 mt-1">{concept.subheadline}</p>
                <p className="text-xs text-gray-500 mt-2 italic">"{concept.emotionalHook}"</p>
                <div className="mt-3 text-xs text-gray-400">
                  <span className="font-medium">Visuellt:</span> {concept.visualDirection}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============ Step 2: Tema (Concept Selection) ============

function StepTema({ draft, onNext, onBack }: Omit<StepProps, 'setDraft'>) {
  if (!draft.concept) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Inget koncept valt.</p>
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Tillbaka
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="max-w-md mx-auto bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
        <Badge className="mb-3">Valt koncept</Badge>
        <h3 className="text-xl font-bold text-blue-800">{draft.concept.headline}</h3>
        <p className="text-blue-600 mt-1">{draft.concept.subheadline}</p>
        <div className="mt-4 space-y-2 text-sm">
          <div>
            <span className="font-medium text-gray-700">Kärnbudskap:</span>
            <p className="text-gray-600">{draft.concept.keyMessage}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Visuell riktning:</span>
            <p className="text-gray-600">{draft.concept.visualDirection}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Emotionell krok:</span>
            <p className="text-gray-600 italic">"{draft.concept.emotionalHook}"</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Tillbaka
        </Button>
        <Button onClick={onNext}>
          Använd detta koncept
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

// ============ Step 3: Channels ============

function StepChannels({ draft, setDraft, onNext, onBack }: StepProps) {
  const { brand } = useBrandContext()
  const { generateCampaignPack } = useAIGateway()
  const [selectedFormats, setSelectedFormats] = useState<TemplateFormat[]>([
    'facebook_feed',
    'instagram_feed',
  ])
  const [loading, setLoading] = useState(false)

  const toggleFormat = (format: TemplateFormat) => {
    setSelectedFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    )
  }

  const handleGenerateMaterial = async () => {
    if (!brand || !draft.concept || selectedFormats.length === 0) {
      toast.error('Välj minst ett format')
      return
    }

    setLoading(true)
    try {
      const brandContext = adaptBrandForAI(brand)

      // 1. Generate copy for all formats
      const packResult = await generateCampaignPack({
        brandContext,
        concept: draft.concept as unknown as Record<string, unknown>,
        formats: selectedFormats,
      })

      // 2. Create CampaignFormat entries
      const formats: CampaignFormat[] = packResult.formats.map((f) => ({
        type: f.type as TemplateFormat,
        copy: f.copy,
        headline: f.headline,
        cta: f.cta,
        image_prompt: f.image_prompt,
        approved: false,
      }))

      // 3. Determine channels from formats
      const channels: CampaignChannel[] = []
      if (selectedFormats.some((f) => f.startsWith('facebook'))) channels.push('facebook')
      if (selectedFormats.some((f) => f.startsWith('instagram'))) channels.push('instagram')
      if (selectedFormats.some((f) => f.startsWith('linkedin'))) channels.push('linkedin')
      if (selectedFormats.some((f) => f.startsWith('tiktok'))) channels.push('tiktok')
      if (selectedFormats.some((f) => f.startsWith('google'))) channels.push('google')
      if (selectedFormats.some((f) => f.startsWith('print'))) channels.push('print')

      setDraft((d) => ({ ...d, formats, channels }))
      toast.success('Material genererat!')
      onNext()
    } catch (err) {
      toast.error('Kunde inte generera material')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Recommendation */}
      {draft.description && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <Sparkles className="w-4 h-4 inline text-blue-500 mr-1" />
          <span className="text-blue-700">
            Baserat på er brief rekommenderar vi Meta + print för maximal räckvidd.
          </span>
        </div>
      )}

      {/* Format Selection */}
      <div className="space-y-6">
        {Object.entries(CHANNEL_FORMATS).map(([key, group]) => (
          <div key={key}>
            <h3 className="font-medium mb-2">{group.label}</h3>
            <div className="grid grid-cols-2 gap-2">
              {group.formats.map((format) => (
                <label
                  key={format}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all',
                    selectedFormats.includes(format)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedFormats.includes(format)}
                    onChange={() => toggleFormat(format)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1">
                    {getFormatDisplayName(format)}
                    <span className="text-gray-400 text-xs ml-1">
                      ({FORMAT_DIMENSIONS[format]})
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Tillbaka
        </Button>
        <Button onClick={handleGenerateMaterial} disabled={loading || selectedFormats.length === 0}>
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Genererar material...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generera material ⚡
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ============ Step 4: Preview & Publish ============

interface StepPreviewProps {
  draft: CampaignDraft
  setDraft: React.Dispatch<React.SetStateAction<CampaignDraft>>
  onBack: () => void
  onComplete: (campaign: Campaign) => void
}

function StepPreview({ draft, setDraft, onBack, onComplete }: StepPreviewProps) {
  const { brand } = useBrandContext()
  const { generateImage, checkGuardrails } = useAIGateway()
  const { uploadAsset } = useAssets()
  const { createCampaign, updateCampaignStatus } = useCampaigns()
  const [activeTab, setActiveTab] = useState(0)
  const [publishing, setPublishing] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [guardrailResults, setGuardrailResults] = useState<Record<string, GuardrailsResponse>>({})
  const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({})

  // Run guardrails check on mount
  const checkAllGuardrails = useCallback(async () => {
    if (!brand) return

    const brandContext = adaptBrandForAI(brand)
    const results: Record<string, GuardrailsResponse> = {}

    for (const format of draft.formats) {
      try {
        const result = await checkGuardrails({
          content: `${format.headline}\n${format.copy}\n${format.cta}`,
          brandContext,
        })
        results[format.type] = result
      } catch (err) {
        console.error('Guardrails check failed for', format.type, err)
      }
    }

    setGuardrailResults(results)
  }, [brand, draft.formats, checkGuardrails])

  // Check guardrails when formats change
  useEffect(() => {
    checkAllGuardrails()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerateImage = async (formatIndex: number) => {
    const format = draft.formats[formatIndex]
    if (!brand) return

    setGeneratingImages((g) => ({ ...g, [format.type]: true }))

    try {
      const brandContext = adaptBrandForAI(brand)
      const result = await generateImage({
        prompt: format.image_prompt,
        brandContext,
        format: format.type,
        size: format.type.includes('story') ? '1024x1792' : '1024x1024',
      })

      setDraft((d) => ({
        ...d,
        formats: d.formats.map((f, i) =>
          i === formatIndex ? { ...f, generated_image_url: result.imageUrl } : f
        ),
      }))
      toast.success('Bild genererad!')
    } catch (err) {
      toast.error('Kunde inte generera bild')
      console.error(err)
    } finally {
      setGeneratingImages((g) => ({ ...g, [format.type]: false }))
    }
  }

  const toggleApproval = (formatIndex: number) => {
    setDraft((d) => ({
      ...d,
      formats: d.formats.map((f, i) =>
        i === formatIndex ? { ...f, approved: !f.approved } : f
      ),
    }))
  }

  const updateCopy = (formatIndex: number, copy: string) => {
    setDraft((d) => ({
      ...d,
      formats: d.formats.map((f, i) => (i === formatIndex ? { ...f, copy } : f)),
    }))
  }

  const handleSaveDraft = async () => {
    try {
      const campaign = await createCampaign({
        ...draft,
        brand_id: brand?.id,
        status: 'draft',
      })
      toast.success('Utkast sparat!')
      onComplete(campaign)
    } catch (err) {
      toast.error('Kunde inte spara utkast')
      console.error(err)
    }
  }

  const handlePublishClick = () => {
    if (!brand) return

    const approvedFormats = draft.formats.filter((f) => f.approved)
    if (approvedFormats.length === 0) {
      toast.error('Godkänn minst ett format')
      return
    }

    // Check for critical violations
    const hasCriticalViolation = approvedFormats.some((f) => {
      const result = guardrailResults[f.type]
      return result?.violations.some((v) => v.severity === 'critical')
    })

    if (hasCriticalViolation) {
      toast.error('Kan inte publicera — kritiska varumärkesbrott finns')
      return
    }

    // Show confirmation dialog
    setShowPublishDialog(true)
  }

  const handlePublishConfirm = async () => {
    if (!brand) return

    setShowPublishDialog(false)
    setPublishing(true)
    const approvedFormats = draft.formats.filter((f) => f.approved)

    try {
      // 1. Create composites and upload for each approved format
      for (const format of approvedFormats) {
        if (format.generated_image_url) {
          const adFormat = AD_FORMATS[format.type]
          if (adFormat) {
            // Composite the ad
            const dataUrl = await compositeAd({
              backgroundImageUrl: format.generated_image_url,
              logoUrl: brand.logos.primary_url,
              headline: format.headline,
              body: format.copy,
              cta: format.cta,
              colors: {
                primary: brand.colors.primary,
                text: brand.colors.text_light || '#FFFFFF',
              },
              format: adFormat,
            })

            // Upload to storage
            await uploadAsset(dataUrl, {
              name: `${draft.name}-${format.type}`,
              type: 'composite',
              format: format.type,
              copyText: format.copy,
            })
          }
        }
      }

      // 2. Create campaign record
      const campaign = await createCampaign({
        ...draft,
        brand_id: brand.id,
        status: 'draft',
      })

      // 3. Update status to active
      await updateCampaignStatus(campaign.id, 'active')

      toast.success('Kampanj publicerad! 🎉')
      onComplete({ ...campaign, status: 'active' })
    } catch (err) {
      toast.error('Publicering misslyckades')
      console.error(err)
    } finally {
      setPublishing(false)
    }
  }

  const approvedCount = draft.formats.filter((f) => f.approved).length
  const currentFormat = draft.formats[activeTab]

  if (!currentFormat) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Inga format genererade.</p>
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Tillbaka
        </Button>
      </div>
    )
  }

  const guardrailResult = guardrailResults[currentFormat.type]
  const isImageLoading = generatingImages[currentFormat.type]

  return (
    <div className="space-y-6">
      {/* Format Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {draft.formats.map((format, i) => (
          <button
            key={format.type}
            onClick={() => setActiveTab(i)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all flex items-center gap-2',
              activeTab === i
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            )}
          >
            {getFormatIcon(format.type)}
            {getFormatDisplayName(format.type)}
            {format.approved && <Check className="w-4 h-4 text-green-300" />}
          </button>
        ))}
      </div>

      {/* Preview Area */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Device Mockup */}
        <div className="flex justify-center items-start">
          <DeviceMockup
            format={currentFormat.type}
            imageUrl={currentFormat.generated_image_url}
            isLoading={isImageLoading}
          />
        </div>

        {/* Content & Actions */}
        <div className="space-y-4">
          {/* Headline */}
          <div>
            <Label className="text-gray-500 text-xs">RUBRIK</Label>
            <p className="font-semibold">{currentFormat.headline}</p>
          </div>

          {/* Copy */}
          <div>
            <Label className="text-gray-500 text-xs">COPY</Label>
            <textarea
              value={currentFormat.copy}
              onChange={(e) => updateCopy(activeTab, e.target.value)}
              className="w-full h-24 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
            />
          </div>

          {/* CTA */}
          <div>
            <Label className="text-gray-500 text-xs">CTA</Label>
            <p className="text-blue-600 font-medium">{currentFormat.cta}</p>
          </div>

          {/* Guardrails Badge */}
          <div>
            {guardrailResult ? (
              guardrailResult.passed ? (
                <Badge className="bg-green-100 text-green-800">✓ Brand OK</Badge>
              ) : (
                <div>
                  <Badge className="bg-red-100 text-red-800">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Varumärkesbrott
                  </Badge>
                  <ul className="mt-2 text-xs text-red-600 space-y-1">
                    {guardrailResult.violations.map((v, i) => (
                      <li key={i}>
                        • {v.type}: {v.found} — {v.suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ) : (
              <Badge variant="outline">Kontrollerar...</Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateImage(activeTab)}
              disabled={isImageLoading}
            >
              <RefreshCw className={cn('w-4 h-4 mr-1', isImageLoading && 'animate-spin')} />
              Ny bild
            </Button>
            <Button
              variant={currentFormat.approved ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleApproval(activeTab)}
            >
              <Check className="w-4 h-4 mr-1" />
              {currentFormat.approved ? 'Godkänd' : 'Godkänn'}
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {approvedCount} av {draft.formats.length} godkända
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Tillbaka
          </Button>
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="w-4 h-4 mr-1" />
            Spara utkast
          </Button>
          <Button onClick={handlePublishClick} disabled={publishing || approvedCount === 0}>
            {publishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Publicerar...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-1" />
                Publicera alla godkända
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Publish Confirmation Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicera kampanj?</DialogTitle>
            <DialogDescription>
              Kampanjen blir synlig för franchisetagare direkt efter publicering.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              Avbryt
            </Button>
            <Button onClick={handlePublishConfirm}>
              Publicera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
