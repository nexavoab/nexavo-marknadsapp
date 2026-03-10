/**
 * CopyGeneratorSheet
 * WAS-401: AI copy-generator för kampanjer
 * WAS-407: Kopplad till copy-engine Edge Function
 * Genererar copy för olika format baserat på kampanj och brand context
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useBrand } from '@/hooks/useBrand'
import { supabase } from '@/lib/supabase'
import type { Campaign } from '@/types'
import { Loader2, Copy, Check, AlertCircle, Sparkles, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CopyGeneratorSheetProps {
  campaign: Campaign
  onClose?: () => void
}

type CopyFormat = 'instagram-post' | 'facebook-ad' | 'google-display' | 'email' | 'print-flyer'

// Mappa UI-format till copy-engine channel
const FORMAT_TO_CHANNEL: Record<CopyFormat, string> = {
  'instagram-post': 'instagram',
  'facebook-ad': 'meta',
  'google-display': 'google_display',
  'email': 'email',
  'print-flyer': 'website', // print hanteras som website-copy
}

// Mappa UI-format till copy-engine mode
const FORMAT_TO_MODE: Record<CopyFormat, string> = {
  'instagram-post': 'post',
  'facebook-ad': 'ad',
  'google-display': 'ad',
  'email': 'email',
  'print-flyer': 'landing_page',
}

const FORMAT_CONFIG: Record<CopyFormat, { label: string; description: string }> = {
  'instagram-post': { label: 'Instagram Post', description: 'Engagerande text för Instagram-flödet' },
  'facebook-ad': { label: 'Facebook Annons', description: 'Annonstext för Facebook Ads' },
  'google-display': { label: 'Google Display', description: 'Kort copy för displayannonser' },
  'email': { label: 'E-post', description: 'Nyhetsbrev och e-postkampanjer' },
  'print-flyer': { label: 'Print Flyer', description: 'Text för tryckt material' },
}

const ALL_FORMATS: CopyFormat[] = ['instagram-post', 'facebook-ad', 'google-display', 'email', 'print-flyer']

// Typ för copy-engine response
interface CopyEngineVariant {
  variant_id: string
  hypothesis?: string
  text_blocks: {
    headline?: string
    hook?: string
    primary_text?: string
    body?: string
    cta?: string
    description?: string
    [key: string]: string | undefined
  }
  explanation?: Record<string, unknown>
  policy_flags?: Array<{ type: string; message: string }>
}

interface CopyEngineResponse {
  variants: CopyEngineVariant[]
  global_suggestions?: Record<string, unknown>
  needs_clarification?: boolean
  clarification_questions?: string[]
  _source?: string
}

// Typ för UI-resultat (samma som tidigare CampaignPackResponse['formats'])
interface CopyResult {
  type: string
  headline: string
  copy: string
  cta: string
  character_count?: number
}

export function CopyGeneratorSheet({ campaign }: CopyGeneratorSheetProps) {
  const { brand, loading: brandLoading } = useBrand()

  const [selectedFormats, setSelectedFormats] = useState<CopyFormat[]>(['instagram-post', 'facebook-ad'])
  const [isGenerating, setIsGenerating] = useState(false)
  const [results, setResults] = useState<CopyResult[] | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  
  // OpenClaw AI state
  const [isOpenClawLoading, setIsOpenClawLoading] = useState(false)
  const [openClawProgress, setOpenClawProgress] = useState(0)
  const [, setOpenClawTaskId] = useState<string | null>(null)

  const handleFormatToggle = (format: CopyFormat) => {
    setSelectedFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    )
  }

  const handleGenerate = async () => {
    if (!brand) {
      toast.error('Inget varumärke konfigurerat. Gå till Varumärke-sidan för att konfigurera.')
      return
    }

    if (selectedFormats.length === 0) {
      toast.error('Välj minst ett format')
      return
    }

    setIsGenerating(true)
    setResults(null)

    try {
      // Generera copy för varje valt format via copy-engine
      const allResults: CopyResult[] = []
      
      for (const format of selectedFormats) {
        const channel = FORMAT_TO_CHANNEL[format]
        const mode = FORMAT_TO_MODE[format]
        
        // Bygg payload för copy-engine
        const payload = {
          brand_context: {
            brand_id: brand.id,
            org_id: campaign.organization_id,
            guide_mode: 'PUBLISHED',
          },
          copy_context: {
            mode,
            channel,
            funnel_stage: 'consideration',
            persona_id: typeof campaign.target_persona === 'string' 
              ? campaign.target_persona 
              : undefined,
            goal: campaign.description || campaign.name,
            constraints: {
              max_variants: 1, // En variant per format
            },
          },
          input: {
            brief: `Kampanj: ${campaign.name}. ${campaign.description || ''}. Kanaler: ${campaign.channels.join(', ')}.`,
          },
        }

        const { data, error } = await supabase.functions.invoke<CopyEngineResponse>('copy-engine', {
          body: payload,
        })

        if (error) {
          console.error(`copy-engine error for ${format}:`, error)
          throw new Error(`Fel vid generering av ${FORMAT_CONFIG[format].label}: ${error.message}`)
        }

        if (!data?.variants || data.variants.length === 0) {
          console.warn(`No variants returned for ${format}`)
          continue
        }

        // Extrahera första varianten och mappa till UI-format
        const variant = data.variants[0]
        const textBlocks = variant.text_blocks || {}
        
        // Bygg copy-text från tillgängliga fält
        const copyParts: string[] = []
        if (textBlocks.hook) copyParts.push(textBlocks.hook)
        if (textBlocks.primary_text) copyParts.push(textBlocks.primary_text)
        if (textBlocks.body) copyParts.push(textBlocks.body)
        if (textBlocks.description) copyParts.push(textBlocks.description)
        
        const headline = textBlocks.headline || textBlocks.hook || ''
        const copy = copyParts.join('\n\n') || JSON.stringify(textBlocks)
        const cta = textBlocks.cta || ''
        
        const fullText = `${headline}\n${copy}\n${cta}`
        
        allResults.push({
          type: format,
          headline,
          copy,
          cta,
          character_count: fullText.length,
        })
      }

      if (allResults.length === 0) {
        throw new Error('Ingen copy kunde genereras. Försök igen.')
      }

      setResults(allResults)
      toast.success(`${allResults.length} format genererade!`)
    } catch (err) {
      console.error('AI generation error:', err)
      toast.error(err instanceof Error ? err.message : 'Kunde inte generera copy. Försök igen.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleOpenClawGenerate = async () => {
    if (!brand) {
      toast.error('Inget varumärke konfigurerat')
      return
    }
    
    if (selectedFormats.length === 0) {
      toast.error('Välj minst ett format')
      return
    }
    
    setIsOpenClawLoading(true)
    setOpenClawProgress(0)
    setResults(null)
    
    try {
      // 1. Skapa ai_tasks record
      const { data: task, error: taskError } = await supabase
        .from('ai_tasks')
        .insert({
          org_id: campaign.organization_id,
          task_type: 'generate-copy',
          status: 'pending',
          payload: {
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            formats: selectedFormats,
            brand_id: brand.id,
          }
        })
        .select('id')
        .single()
      
      if (taskError || !task) {
        throw new Error('Kunde inte skapa AI-uppgift')
      }
      setOpenClawTaskId(task.id)
      
      // 2. Anropa invoke-openclaw
      const { error: invokeError } = await supabase.functions.invoke('invoke-openclaw', {
        body: {
          task_id: task.id,
          org_id: campaign.organization_id,
          task_type: 'generate-copy',
          payload: {
            task_id: task.id,
            brand_context: {
              brand_id: brand.id,
              org_id: campaign.organization_id,
              name: brand.name || '',
              tone_traits: brand.tone_traits || {},
              colors: brand.colors || {},
              positioning: brand.positioning || '',
            },
            campaign: {
              name: campaign.name,
              description: campaign.description || '',
              goal: '',
              offer: '',
            },
            platforms: selectedFormats.map(f => FORMAT_TO_CHANNEL[f]),
            variants: 1,
          }
        }
      })
      
      if (invokeError) {
        throw new Error(`OpenClaw-fel: ${invokeError.message}`)
      }
      
      // 3. Poll ai_tasks var 3:e sekund (max 120s)
      let elapsed = 0
      const interval = setInterval(async () => {
        elapsed += 3
        setOpenClawProgress(elapsed)
        
        if (elapsed >= 120) {
          clearInterval(interval)
          setIsOpenClawLoading(false)
          toast.error('OpenClaw timeout — försök igen')
          return
        }
        
        const { data: taskStatus } = await supabase
          .from('ai_tasks')
          .select('status, result')
          .eq('id', task.id)
          .single()
        
        if (taskStatus?.status === 'completed' && taskStatus.result) {
          clearInterval(interval)
          setIsOpenClawLoading(false)
          
          // Mappa output_payload.posts till CopyResult[]
          const outputPayload = taskStatus.result as { posts?: Array<Record<string, unknown>> }
          const posts = outputPayload.posts || []
          const mapped: CopyResult[] = posts.map((p: Record<string, unknown>) => ({
            type: String(p.platform || 'instagram'),
            headline: String(p.headline || ''),
            copy: String(p.copy || ''),
            cta: String(p.cta || ''),
            character_count: String(p.headline || '').length + String(p.copy || '').length,
          }))
          setResults(mapped)
          toast.success(`OpenClaw genererade ${mapped.length} format!`)
        } else if (taskStatus?.status === 'failed') {
          clearInterval(interval)
          setIsOpenClawLoading(false)
          toast.error('AI-generering misslyckades')
        }
      }, 3000)
    } catch (err) {
      setIsOpenClawLoading(false)
      toast.error(err instanceof Error ? err.message : 'Fel vid OpenClaw-anrop')
    }
  }

  const handleCopy = async (index: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      toast.success('Kopierat till urklipp!')
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      toast.error('Kunde inte kopiera')
    }
  }

  if (brandLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!brand) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800">Varumärke saknas</p>
          <p className="text-sm text-amber-700 mt-1">
            Konfigurera varumärket under Varumärke-sidan för att kunna generera copy.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Format Selection */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="font-medium mb-3">Välj format</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_FORMATS.map((format) => {
            const config = FORMAT_CONFIG[format]
            const isSelected = selectedFormats.includes(format)
            return (
              <label
                key={format}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleFormatToggle(format)}
                  className="mt-1 w-4 h-4 rounded border-input text-primary focus:ring-primary"
                />
                <div>
                  <div className="font-medium text-sm">{config.label}</div>
                  <div className="text-xs text-muted-foreground">{config.description}</div>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Generate Buttons */}
      <div className="flex flex-col items-center gap-3">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || isOpenClawLoading || selectedFormats.length === 0}
          size="lg"
          className="min-w-[200px]"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Genererar copy...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generera copy
            </>
          )}
        </Button>
        
        {/* OpenClaw AI Button */}
        <Button
          onClick={handleOpenClawGenerate}
          disabled={isOpenClawLoading || isGenerating || selectedFormats.length === 0}
          size="lg"
          variant="outline"
          className="min-w-[220px] border-purple-300 text-purple-700 hover:bg-purple-50"
        >
          {isOpenClawLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              OpenClaw genererar... ({openClawProgress}s)
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Djup AI (OpenClaw)
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {results && results.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium">Genererade texter</h3>
          <div className="grid gap-4">
            {results.map((result, index) => (
              <div
                key={index}
                className="bg-card rounded-lg border border-border p-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-primary">
                    {FORMAT_CONFIG[result.type as CopyFormat]?.label || result.type}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(index, `${result.headline}\n\n${result.copy}\n\n${result.cta}`)}
                    className="h-8"
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="w-4 h-4 mr-1 text-green-600" />
                        Kopierat
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Kopiera
                      </>
                    )}
                  </Button>
                </div>

                {/* Headline */}
                {result.headline && (
                  <div className="mb-2">
                    <span className="text-xs text-muted-foreground block mb-1">Rubrik</span>
                    <p className="font-semibold">{result.headline}</p>
                  </div>
                )}

                {/* Copy */}
                {result.copy && (
                  <div className="mb-2">
                    <span className="text-xs text-muted-foreground block mb-1">Copy</span>
                    <p className="text-sm whitespace-pre-wrap">{result.copy}</p>
                  </div>
                )}

                {/* CTA */}
                {result.cta && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">CTA</span>
                    <p className="text-sm font-medium text-primary">{result.cta}</p>
                  </div>
                )}

                {/* Character count */}
                {result.character_count && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {result.character_count} tecken
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
