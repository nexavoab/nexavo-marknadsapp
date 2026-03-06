import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useBrandContext } from '@/contexts/BrandContext'
import { uploadBrandAsset } from '@/lib/storage'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { 
  ChevronRight, 
  ChevronLeft, 
  Upload, 
  X, 
  Check,
  Building2,
  Palette,
  Type,
  Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Brand, ToneTraits, VisualIdentityColors, VisualIdentityLogos, VisualIdentityTypography, VisualIdentityImagery } from '@/types'

const STEPS = [
  { id: 1, title: 'Grundläggande', icon: Building2 },
  { id: 2, title: 'Färger', icon: Palette },
  { id: 3, title: 'Typsnitt & Ton', icon: Type },
  { id: 4, title: 'Guardrails', icon: Shield },
]

// Default values for new brand
const defaultToneTraits: ToneTraits = {
  formality: 0.5,
  modernity: 0.5,
  emotion: 0.5,
  volume: 0.5,
}

const defaultColors: VisualIdentityColors = {
  primary: '#3B82F6',
  secondary: undefined,
  accent: undefined,
}

const defaultLogos: VisualIdentityLogos = {
  primary_url: '',
  dark_bg_url: undefined,
  icon_url: undefined,
  min_size_px: 32,
  safe_zone_percent: 10,
}

const defaultTypography: VisualIdentityTypography = {
  heading_font: 'Inter',
  body_font: 'Inter',
  google_fonts_url: undefined,
}

const defaultImagery: VisualIdentityImagery = {
  forbidden_styles: [],
  example_urls: [],
}

export default function BrandSetupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEditMode = searchParams.get('edit') === 'true'
  const { brand, saveBrand, loading: brandLoading } = useBrandContext()
  const { appUser } = useAuth()

  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingDarkLogo, setUploadingDarkLogo] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [logos, setLogos] = useState<VisualIdentityLogos>(defaultLogos)
  const [colors, setColors] = useState<VisualIdentityColors>(defaultColors)
  const [typography, setTypography] = useState<VisualIdentityTypography>(defaultTypography)
  const [toneTraits, setToneTraits] = useState<ToneTraits>(defaultToneTraits)
  const [forbiddenWords, setForbiddenWords] = useState<string[]>([])
  const [requiredDisclaimers, setRequiredDisclaimers] = useState<string[]>([])
  const [forbiddenImageStyles, setForbiddenImageStyles] = useState<string[]>([])

  // Tag input refs
  const [newForbiddenWord, setNewForbiddenWord] = useState('')
  const [newImageStyle, setNewImageStyle] = useState('')
  const [newDisclaimer, setNewDisclaimer] = useState('')

  // Load existing brand data
  useEffect(() => {
    if (brand) {
      setName(brand.name || '')
      setLogos(brand.logos || defaultLogos)
      setColors(brand.colors || defaultColors)
      setTypography(brand.typography || defaultTypography)
      setToneTraits(brand.tone_traits || defaultToneTraits)
      setForbiddenWords(brand.forbidden_words || [])
      setRequiredDisclaimers(brand.required_disclaimers || [])
      setForbiddenImageStyles(brand.imagery?.forbidden_styles || [])
    }
  }, [brand])

  async function handleLogoUpload(file: File, type: 'logo' | 'logo-dark') {
    if (!appUser?.organization_id) return

    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingDarkLogo

    try {
      setUploading(true)
      const url = await uploadBrandAsset(file, appUser.organization_id, type)
      
      setLogos(prev => ({
        ...prev,
        ...(type === 'logo' ? { primary_url: url } : { dark_bg_url: url })
      }))
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Kunde inte ladda upp logotyp')
    } finally {
      setUploading(false)
    }
  }

  async function saveCurrentStep() {
    setSaving(true)
    try {
      const updates: Partial<Brand> = {}

      switch (currentStep) {
        case 1:
          updates.name = name
          updates.logos = logos
          break
        case 2:
          updates.colors = colors
          break
        case 3:
          updates.typography = typography
          updates.tone_traits = toneTraits
          break
        case 4:
          updates.forbidden_words = forbiddenWords
          updates.required_disclaimers = requiredDisclaimers
          updates.imagery = { ...defaultImagery, forbidden_styles: forbiddenImageStyles }
          break
      }

      await saveBrand(updates)
      return true
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Kunde inte spara')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleNext() {
    const success = await saveCurrentStep()
    if (success && currentStep < 4) {
      setCurrentStep(currentStep + 1)
    } else if (success && currentStep === 4) {
      navigate('/hq/brand')
    }
  }

  function handlePrevious() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  function handleSkip() {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    } else {
      navigate('/hq/brand')
    }
  }

  function addTag(
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    list: string[],
    listSetter: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    const trimmed = value.trim().toLowerCase()
    if (trimmed && !list.includes(trimmed)) {
      listSetter([...list, trimmed])
    }
    setter('')
  }

  function removeTag(
    value: string,
    list: string[],
    listSetter: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    listSetter(list.filter(item => item !== value))
  }

  if (brandLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">
          {isEditMode ? 'Redigera varumärke' : 'Sätt upp ert varumärke'}
        </h1>
        <p className="text-slate-600">
          {isEditMode 
            ? 'Uppdatera era varumärkesinställningar'
            : 'Välkommen! Låt oss börja med att sätta upp ert varumärke. Detta är grunden för all AI-generering.'
          }
        </p>
      </div>

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full transition-colors',
                  currentStep === step.id
                    ? 'bg-blue-600 text-white'
                    : currentStep > step.id
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                )}
              >
                {currentStep > step.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-16 lg:w-24 h-1 mx-2',
                    currentStep > step.id ? 'bg-green-600' : 'bg-slate-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map(step => (
            <span
              key={step.id}
              className={cn(
                'text-xs font-medium',
                currentStep === step.id ? 'text-blue-600' : 'text-slate-500'
              )}
            >
              {step.title}
            </span>
          ))}
        </div>
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle>Steg {currentStep} av 4: {STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>
            {currentStep === 1 && 'Fyll i grundläggande information om ert företag'}
            {currentStep === 2 && 'Välj era varumärkesfärger'}
            {currentStep === 3 && 'Definiera typsnitt och ton'}
            {currentStep === 4 && 'Sätt upp skyddsregler för AI-generering'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basic info */}
          {currentStep === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Företagsnamn *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ert företagsnamn"
                />
              </div>

              <div className="space-y-2">
                <Label>Primär logotyp</Label>
                <div className="flex items-center gap-4">
                  {logos.primary_url ? (
                    <div className="relative">
                      <img
                        src={logos.primary_url}
                        alt="Logotyp"
                        loading="lazy"
                        className="h-16 w-auto object-contain bg-white border rounded p-2"
                      />
                      <button
                        onClick={() => setLogos(prev => ({ ...prev, primary_url: '' }))}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-32 h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
                      <Upload className="w-6 h-6 text-slate-400" />
                      <span className="text-xs text-slate-500 mt-1">
                        {uploadingLogo ? 'Laddar...' : 'Välj fil'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0], 'logo')}
                        disabled={uploadingLogo}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Logotyp för mörk bakgrund (valfritt)</Label>
                <div className="flex items-center gap-4">
                  {logos.dark_bg_url ? (
                    <div className="relative">
                      <img
                        src={logos.dark_bg_url}
                        alt="Logotyp mörk"
                        loading="lazy"
                        className="h-16 w-auto object-contain bg-slate-800 border rounded p-2"
                      />
                      <button
                        onClick={() => setLogos(prev => ({ ...prev, dark_bg_url: undefined }))}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-32 h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
                      <Upload className="w-6 h-6 text-slate-400" />
                      <span className="text-xs text-slate-500 mt-1">
                        {uploadingDarkLogo ? 'Laddar...' : 'Välj fil'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0], 'logo-dark')}
                        disabled={uploadingDarkLogo}
                      />
                    </label>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Step 2: Colors */}
          {currentStep === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primärfärg *</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="primaryColor"
                    value={colors.primary}
                    onChange={e => setColors(prev => ({ ...prev, primary: e.target.value }))}
                    className="w-12 h-12 rounded cursor-pointer border-0"
                  />
                  <Input
                    value={colors.primary}
                    onChange={e => setColors(prev => ({ ...prev, primary: e.target.value }))}
                    placeholder="#3B82F6"
                    className="w-32"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Sekundärfärg (valfritt)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="secondaryColor"
                    value={colors.secondary || '#64748B'}
                    onChange={e => setColors(prev => ({ ...prev, secondary: e.target.value }))}
                    className="w-12 h-12 rounded cursor-pointer border-0"
                  />
                  <Input
                    value={colors.secondary || ''}
                    onChange={e => setColors(prev => ({ ...prev, secondary: e.target.value || undefined }))}
                    placeholder="#64748B"
                    className="w-32"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Accentfärg (valfritt)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="accentColor"
                    value={colors.accent || '#F59E0B'}
                    onChange={e => setColors(prev => ({ ...prev, accent: e.target.value }))}
                    className="w-12 h-12 rounded cursor-pointer border-0"
                  />
                  <Input
                    value={colors.accent || ''}
                    onChange={e => setColors(prev => ({ ...prev, accent: e.target.value || undefined }))}
                    placeholder="#F59E0B"
                    className="w-32"
                  />
                </div>
              </div>

              {/* Color preview */}
              <div className="pt-4">
                <Label>Förhandsvisning</Label>
                <div className="flex gap-4 mt-2">
                  <div
                    className="w-24 h-24 rounded-lg shadow-sm flex items-center justify-center text-white text-xs font-medium"
                    style={{ backgroundColor: colors.primary }}
                  >
                    Primär
                  </div>
                  {colors.secondary && (
                    <div
                      className="w-24 h-24 rounded-lg shadow-sm flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: colors.secondary }}
                    >
                      Sekundär
                    </div>
                  )}
                  {colors.accent && (
                    <div
                      className="w-24 h-24 rounded-lg shadow-sm flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: colors.accent }}
                    >
                      Accent
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Step 3: Typography & Tone */}
          {currentStep === 3 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="headingFont">Rubrik-typsnitt</Label>
                  <Input
                    id="headingFont"
                    value={typography.heading_font}
                    onChange={e => setTypography(prev => ({ ...prev, heading_font: e.target.value }))}
                    placeholder="Inter"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bodyFont">Brödtext-typsnitt</Label>
                  <Input
                    id="bodyFont"
                    value={typography.body_font}
                    onChange={e => setTypography(prev => ({ ...prev, body_font: e.target.value }))}
                    placeholder="Inter"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="googleFonts">Google Fonts URL (valfritt)</Label>
                <Input
                  id="googleFonts"
                  value={typography.google_fonts_url || ''}
                  onChange={e => setTypography(prev => ({ ...prev, google_fonts_url: e.target.value || undefined }))}
                  placeholder="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Ton och röst</Label>

                {/* Formality slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Formell</span>
                    <span>Avslappnad</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={toneTraits.formality}
                    onChange={e => setToneTraits(prev => ({ ...prev, formality: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                {/* Modernity slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Klassisk</span>
                    <span>Modern</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={toneTraits.modernity}
                    onChange={e => setToneTraits(prev => ({ ...prev, modernity: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                {/* Emotion slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Saklig</span>
                    <span>Varm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={toneTraits.emotion}
                    onChange={e => setToneTraits(prev => ({ ...prev, emotion: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                {/* Volume slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtil</span>
                    <span>Bestämd</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={toneTraits.volume}
                    onChange={e => setToneTraits(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 4: Guardrails */}
          {currentStep === 4 && (
            <>
              <div className="space-y-2">
                <Label>Förbjudna ord</Label>
                <p className="text-sm text-slate-500">Ord som AI aldrig ska använda</p>
                <div className="flex gap-2">
                  <Input
                    value={newForbiddenWord}
                    onChange={e => setNewForbiddenWord(e.target.value)}
                    placeholder="Skriv ett ord..."
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag(newForbiddenWord, setNewForbiddenWord, forbiddenWords, setForbiddenWords)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addTag(newForbiddenWord, setNewForbiddenWord, forbiddenWords, setForbiddenWords)}
                  >
                    Lägg till
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {forbiddenWords.map(word => (
                    <Badge key={word} variant="secondary" className="gap-1">
                      {word}
                      <button onClick={() => removeTag(word, forbiddenWords, setForbiddenWords)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Obligatoriska disclaimers</Label>
                <p className="text-sm text-slate-500">Texter som alltid ska inkluderas i visst innehåll</p>
                <div className="flex gap-2">
                  <Input
                    value={newDisclaimer}
                    onChange={e => setNewDisclaimer(e.target.value)}
                    placeholder="T.ex. 'Villkor gäller'"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag(newDisclaimer, setNewDisclaimer, requiredDisclaimers, setRequiredDisclaimers)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addTag(newDisclaimer, setNewDisclaimer, requiredDisclaimers, setRequiredDisclaimers)}
                  >
                    Lägg till
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {requiredDisclaimers.map(disclaimer => (
                    <Badge key={disclaimer} variant="outline" className="gap-1">
                      {disclaimer}
                      <button onClick={() => removeTag(disclaimer, requiredDisclaimers, setRequiredDisclaimers)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Förbjudna bildstilstyper</Label>
                <p className="text-sm text-slate-500">Bildstilstyper som AI inte ska generera</p>
                <div className="flex gap-2">
                  <Input
                    value={newImageStyle}
                    onChange={e => setNewImageStyle(e.target.value)}
                    placeholder="T.ex. 'Cartoon', 'Stock photo'"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag(newImageStyle, setNewImageStyle, forbiddenImageStyles, setForbiddenImageStyles)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addTag(newImageStyle, setNewImageStyle, forbiddenImageStyles, setForbiddenImageStyles)}
                  >
                    Lägg till
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {forbiddenImageStyles.map(style => (
                    <Badge key={style} variant="destructive" className="gap-1">
                      {style}
                      <button onClick={() => removeTag(style, forbiddenImageStyles, setForbiddenImageStyles)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        <div>
          {currentStep > 1 && (
            <Button variant="outline" onClick={handlePrevious}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Föregående
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={handleSkip}>
            Hoppa över
          </Button>
          <Button onClick={handleNext} disabled={saving || (currentStep === 1 && !name)}>
            {saving ? (
              'Sparar...'
            ) : currentStep === 4 ? (
              <>
                Slutför
                <Check className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Spara & fortsätt
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
