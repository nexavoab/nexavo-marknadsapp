/**
 * AI Pipeline Test Page
 * Intern testsida för att verifiera hela AI-pipen
 * Åtkomst: /hq/ai-test (ingen nav-länk)
 */

import { useState } from 'react'
import { useBrandContext } from '@/contexts/BrandContext'
import { adaptBrandForAI, type BrandContextForAI } from '@/lib/brandContextAdapter'
import { useAIGateway } from '@/hooks/useAIGateway'
import { compositeAdPreview, AD_FORMATS } from '@/lib/adCompositor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ChevronDown,
  ChevronRight,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  FileText,
  Shield,
  Palette,
} from 'lucide-react'

type TestStatus = 'idle' | 'loading' | 'success' | 'error'

interface TestResult {
  status: TestStatus
  data?: unknown
  error?: string
  duration?: number
}

export default function AIPipelineTestPage() {
  const { brand, loading: brandLoading } = useBrandContext()
  const { generateConcept, checkGuardrails, generateImage } = useAIGateway()

  const [contextExpanded, setContextExpanded] = useState(false)
  const [campaignBrief, setCampaignBrief] = useState(
    'Vårens stora öppningskampanj! Vi vill nå nya kunder med ett erbjudande om 20% rabatt på första köpet. Tonalitet: varm och inbjudande.'
  )
  const [testCopy, setTestCopy] = useState(
    'Upptäck vår fantastiska kollektion av produkter till oslagbara priser!'
  )
  const [imagePrompt, setImagePrompt] = useState(
    'A bright, welcoming storefront with spring flowers, professional photography, warm lighting'
  )

  // Test states
  const [conceptTest, setConceptTest] = useState<TestResult>({ status: 'idle' })
  const [guardrailTest, setGuardrailTest] = useState<TestResult>({ status: 'idle' })
  const [imageTest, setImageTest] = useState<TestResult>({ status: 'idle' })
  const [canvasTest, setCanvasTest] = useState<TestResult>({ status: 'idle' })
  const [canvasPreview, setCanvasPreview] = useState<string | null>(null)

  if (brandLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!brand) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-slate-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
              <p className="font-medium">Inget varumärke konfigurerat</p>
              <p className="text-sm mt-1">
                Gå till <a href="/hq/brand/setup" className="text-blue-600 underline">Varumärkesuppsättning</a> först.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Derive brand context - guaranteed non-null after brand check above
  const brandContext: BrandContextForAI = adaptBrandForAI(brand)

  // ============ Test Functions ============

  async function runConceptTest() {
    setConceptTest({ status: 'loading' })
    const start = Date.now()

    try {
      const result = await generateConcept({
        brandContext,
        campaignBrief,
        targetChannels: ['facebook', 'instagram'],
      })

      setConceptTest({
        status: 'success',
        data: result,
        duration: Date.now() - start,
      })
    } catch (err) {
      setConceptTest({
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
        duration: Date.now() - start,
      })
    }
  }

  async function runGuardrailTest() {
    setGuardrailTest({ status: 'loading' })
    const start = Date.now()

    try {
      const result = await checkGuardrails({
        content: testCopy,
        brandContext,
      })

      setGuardrailTest({
        status: 'success',
        data: result,
        duration: Date.now() - start,
      })
    } catch (err) {
      setGuardrailTest({
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
        duration: Date.now() - start,
      })
    }
  }

  async function runImageTest() {
    setImageTest({ status: 'loading' })
    const start = Date.now()

    try {
      const result = await generateImage({
        prompt: imagePrompt,
        brandContext,
        format: 'instagram_feed',
        size: '1024x1024',
      })

      setImageTest({
        status: 'success',
        data: result,
        duration: Date.now() - start,
      })
    } catch (err) {
      setImageTest({
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
        duration: Date.now() - start,
      })
    }
  }

  function runCanvasTest() {
    setCanvasTest({ status: 'loading' })
    const start = Date.now()

    try {
      const preview = compositeAdPreview({
        format: AD_FORMATS.instagram_feed,
        headline: 'Välkommen till vår vårfest!',
        body: 'Få 20% rabatt på hela sortimentet. Erbjudandet gäller hela mars månad.',
        cta: 'Handla nu',
        colors: {
          primary: brandContext.visual.primary_color,
          text: '#FFFFFF',
        },
        backgroundColor: '#1e293b',
      })

      setCanvasPreview(preview)
      setCanvasTest({
        status: 'success',
        data: { format: 'instagram_feed', dataUrlLength: preview.length },
        duration: Date.now() - start,
      })
    } catch (err) {
      setCanvasTest({
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
        duration: Date.now() - start,
      })
    }
  }

  // ============ Render Helpers ============

  function StatusBadge({ status }: { status: TestStatus }) {
    switch (status) {
      case 'loading':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Kör...</Badge>
      case 'success':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> OK</Badge>
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Fel</Badge>
      default:
        return <Badge variant="outline">Ej körd</Badge>
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">AI Pipeline Test</h1>
        <p className="text-slate-600">
          Intern testsida för att verifiera AI-funktioner. Använd för debugging och utveckling.
        </p>
      </div>

      {/* Brand Context Collapsible */}
      <Card className="mb-6">
        <CardHeader
          className="cursor-pointer"
          onClick={() => setContextExpanded(!contextExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-slate-500" />
              <CardTitle className="text-base">Brand Context (adaptBrandForAI)</CardTitle>
            </div>
            {contextExpanded ? (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <CardDescription>
            Detta JSON-objekt skickas till alla AI edge functions
          </CardDescription>
        </CardHeader>
        {contextExpanded && (
          <CardContent>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto text-xs max-h-96">
              {JSON.stringify(brandContext, null, 2)}
            </pre>
          </CardContent>
        )}
      </Card>

      {/* Test: generate-concept */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">Test: generate-concept</CardTitle>
            </div>
            <StatusBadge status={conceptTest.status} />
          </div>
          <CardDescription>
            Genererar kampanjkoncept baserat på brief och brand context
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Kampanjbrief</label>
            <textarea
              className="w-full border rounded-md p-2 text-sm"
              rows={3}
              value={campaignBrief}
              onChange={(e) => setCampaignBrief(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={runConceptTest} disabled={conceptTest.status === 'loading'}>
              <Play className="h-4 w-4 mr-2" />
              Kör test
            </Button>
            {conceptTest.duration && (
              <span className="text-sm text-slate-500">{conceptTest.duration}ms</span>
            )}
          </div>
          {conceptTest.status === 'success' && (
            <pre className="bg-slate-100 p-4 rounded-lg overflow-auto text-xs max-h-64">
              {JSON.stringify(conceptTest.data, null, 2)}
            </pre>
          )}
          {conceptTest.status === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
              {conceptTest.error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test: check-brand-guardrails */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base">Test: check-brand-guardrails</CardTitle>
            </div>
            <StatusBadge status={guardrailTest.status} />
          </div>
          <CardDescription>
            Kontrollerar text mot förbjudna ord och varumärkesregler
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Test-copy</label>
            <textarea
              className="w-full border rounded-md p-2 text-sm"
              rows={2}
              value={testCopy}
              onChange={(e) => setTestCopy(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={runGuardrailTest} disabled={guardrailTest.status === 'loading'}>
              <Play className="h-4 w-4 mr-2" />
              Kör test
            </Button>
            {guardrailTest.duration && (
              <span className="text-sm text-slate-500">{guardrailTest.duration}ms</span>
            )}
          </div>
          {guardrailTest.status === 'success' && (
            <pre className="bg-slate-100 p-4 rounded-lg overflow-auto text-xs max-h-64">
              {JSON.stringify(guardrailTest.data, null, 2)}
            </pre>
          )}
          {guardrailTest.status === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
              {guardrailTest.error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test: generate-image */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-base">Test: generate-image</CardTitle>
            </div>
            <StatusBadge status={imageTest.status} />
          </div>
          <CardDescription>
            Genererar bild via DALL-E baserat på prompt och brand context
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Bildprompt</label>
            <textarea
              className="w-full border rounded-md p-2 text-sm"
              rows={2}
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={runImageTest} disabled={imageTest.status === 'loading'}>
              <Play className="h-4 w-4 mr-2" />
              Kör test
            </Button>
            {imageTest.duration && (
              <span className="text-sm text-slate-500">{imageTest.duration}ms</span>
            )}
          </div>
          {imageTest.status === 'success' && Boolean(imageTest.data) && (
            <div className="space-y-2">
              <img
                src={(imageTest.data as { imageUrl: string }).imageUrl}
                alt="Generated"
                className="max-w-md rounded-lg border"
              />
              <pre className="bg-slate-100 p-4 rounded-lg overflow-auto text-xs">
                {JSON.stringify(imageTest.data, null, 2)}
              </pre>
            </div>
          )}
          {imageTest.status === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
              {imageTest.error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test: Canvas Compositor */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-green-500" />
              <CardTitle className="text-base">Test: Canvas Compositor</CardTitle>
            </div>
            <StatusBadge status={canvasTest.status} />
          </div>
          <CardDescription>
            Genererar testannons med Canvas API (klient-sida, ingen edge function)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={runCanvasTest} disabled={canvasTest.status === 'loading'}>
              <Play className="h-4 w-4 mr-2" />
              Generera preview
            </Button>
            {canvasTest.duration && (
              <span className="text-sm text-slate-500">{canvasTest.duration}ms</span>
            )}
          </div>
          {canvasTest.status === 'success' && canvasPreview && (
            <div className="space-y-2">
              <div className="inline-block border rounded-lg overflow-hidden">
                <img
                  src={canvasPreview}
                  alt="Canvas preview"
                  className="max-w-xs"
                />
              </div>
              <pre className="bg-slate-100 p-4 rounded-lg overflow-auto text-xs">
                {JSON.stringify(canvasTest.data, null, 2)}
              </pre>
            </div>
          )}
          {canvasTest.status === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
              {canvasTest.error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payload Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📚 Payload-dokumentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-1">generate-concept</h4>
            <pre className="bg-slate-100 p-3 rounded text-xs overflow-auto">
{`{
  brandContext: BrandContextForAI,
  campaignBrief: string,
  targetChannels: string[]
}`}
            </pre>
          </div>
          <div>
            <h4 className="font-medium mb-1">generate-campaign-pack</h4>
            <pre className="bg-slate-100 p-3 rounded text-xs overflow-auto">
{`{
  brandContext: BrandContextForAI,
  concept: {
    headline: string,
    subheadline: string,
    keyMessage: string,
    visualDirection: string,
    emotionalHook: string
  },
  formats: string[]  // e.g. ["facebook_feed", "instagram_story"]
}`}
            </pre>
          </div>
          <div>
            <h4 className="font-medium mb-1">generate-image</h4>
            <pre className="bg-slate-100 p-3 rounded text-xs overflow-auto">
{`{
  prompt: string,
  brandContext: BrandContextForAI,
  format: string,  // e.g. "instagram_feed"
  size?: "1024x1024" | "1792x1024" | "1024x1792"
}`}
            </pre>
          </div>
          <div>
            <h4 className="font-medium mb-1">check-brand-guardrails</h4>
            <pre className="bg-slate-100 p-3 rounded text-xs overflow-auto">
{`{
  content: string,
  brandContext: BrandContextForAI
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
