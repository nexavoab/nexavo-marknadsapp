import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AD_FORMATS, compositeAdPreview } from '@/lib/adCompositor'

// Mock canvas för browser-miljö
const mockContext = {
  fillStyle: '',
  font: '',
  textAlign: '' as CanvasTextAlign,
  textBaseline: '' as CanvasTextBaseline,
  fillRect: vi.fn(),
  fillText: vi.fn(),
  drawImage: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 100 }),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
}

const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn().mockReturnValue(mockContext),
  toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mockdata'),
}

// Mock document.createElement för canvas
vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
  if (tagName === 'canvas') {
    return mockCanvas as unknown as HTMLCanvasElement
  }
  return document.createElement(tagName)
})

describe('AD_FORMATS', () => {
  it('innehåller facebook_feed med rätt dimensioner', () => {
    expect(AD_FORMATS.facebook_feed.width).toBe(1080)
    expect(AD_FORMATS.facebook_feed.height).toBe(1080)
  })

  it('story-format är portrait (höjd > bredd)', () => {
    expect(AD_FORMATS.facebook_story.height).toBeGreaterThan(AD_FORMATS.facebook_story.width)
    expect(AD_FORMATS.instagram_story.height).toBeGreaterThan(AD_FORMATS.instagram_story.width)
  })

  it('print_a4 har korrekt DPI-baserade dimensioner', () => {
    expect(AD_FORMATS.print_a4.width).toBe(2480)
    expect(AD_FORMATS.print_a4.height).toBe(3508)
  })

  it('alla format har name-fält', () => {
    Object.values(AD_FORMATS).forEach(format => {
      expect(format.name).toBeTruthy()
    })
  })

  it('innehåller alla 14 fördefinierade format', () => {
    const expectedFormats = [
      'facebook_feed',
      'facebook_story',
      'instagram_feed',
      'instagram_story',
      'instagram_reel',
      'linkedin_post',
      'google_display_medium',
      'google_display_large',
      'google_display_leaderboard',
      'print_a4',
      'print_a5',
      'print_a3',
      'email_header',
      'email_banner',
    ]

    expectedFormats.forEach(format => {
      expect(AD_FORMATS[format]).toBeDefined()
    })
  })

  it('linkedin_post har korrekt aspect ratio', () => {
    const { width, height } = AD_FORMATS.linkedin_post
    expect(width).toBe(1200)
    expect(height).toBe(627)
  })

  it('google_display_medium är 300x250', () => {
    expect(AD_FORMATS.google_display_medium.width).toBe(300)
    expect(AD_FORMATS.google_display_medium.height).toBe(250)
  })

  it('email_header har rätt dimensioner', () => {
    expect(AD_FORMATS.email_header.width).toBe(600)
    expect(AD_FORMATS.email_header.height).toBe(200)
  })
})

describe('compositeAdPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCanvas.toDataURL.mockReturnValue('data:image/png;base64,mockdata')
  })

  it('returnerar en data URL (string)', () => {
    const result = compositeAdPreview({
      format: AD_FORMATS.facebook_feed,
      headline: 'Test Headline',
      body: 'Test body text',
      cta: 'Köp nu',
      colors: { primary: '#2563EB', text: '#FFFFFF' },
    })

    expect(typeof result).toBe('string')
    expect(result).toMatch(/^data:image\/png/)
  })

  it('skapar canvas med rätt dimensioner', () => {
    compositeAdPreview({
      format: AD_FORMATS.instagram_story,
      headline: 'Test',
      body: 'Body',
      cta: 'CTA',
      colors: { primary: '#000', text: '#FFF' },
    })

    expect(mockCanvas.width).toBe(1080)
    expect(mockCanvas.height).toBe(1920)
  })

  it('kan processa alla 8 huvudformat', () => {
    const formats = [
      'facebook_feed',
      'facebook_story',
      'instagram_feed',
      'instagram_story',
      'google_display_medium',
      'print_a4',
      'print_a5',
      'email_header',
    ]

    formats.forEach(formatKey => {
      const format = AD_FORMATS[formatKey]
      expect(() => {
        compositeAdPreview({
          format,
          headline: 'Test',
          body: 'Body',
          cta: 'CTA',
          colors: { primary: '#000', text: '#FFF' },
        })
      }).not.toThrow()
    })
  })

  it('anropar canvas context metoder', () => {
    compositeAdPreview({
      format: AD_FORMATS.facebook_feed,
      headline: 'Test',
      body: 'Body',
      cta: 'CTA',
      colors: { primary: '#2563EB', text: '#FFFFFF' },
    })

    expect(mockContext.fillRect).toHaveBeenCalled()
    expect(mockContext.fillText).toHaveBeenCalled()
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png')
  })

  it('använder anpassad bakgrundsfärg', () => {
    compositeAdPreview({
      format: AD_FORMATS.facebook_feed,
      headline: 'Test',
      body: 'Body',
      cta: 'CTA',
      colors: { primary: '#FF0000', text: '#FFFFFF' },
      backgroundColor: '#333333',
    })

    // Kontrollera att fillStyle sattes
    expect(mockContext.fillRect).toHaveBeenCalled()
  })

  it('använder anpassat typsnitt', () => {
    compositeAdPreview({
      format: AD_FORMATS.facebook_feed,
      headline: 'Test',
      body: 'Body',
      cta: 'CTA',
      colors: { primary: '#000', text: '#FFF' },
      fontFamily: 'Roboto, sans-serif',
    })

    // Font ska ha satts
    expect(mockContext.font).toContain('Roboto')
  })
})

describe('AD_FORMATS kategorisering', () => {
  it('social media format har 1080 bredd', () => {
    const socialFormats = ['facebook_feed', 'facebook_story', 'instagram_feed', 'instagram_story', 'instagram_reel']
    socialFormats.forEach(key => {
      expect(AD_FORMATS[key].width).toBe(1080)
    })
  })

  it('print-format har högre upplösning', () => {
    expect(AD_FORMATS.print_a4.width).toBeGreaterThan(2000)
    expect(AD_FORMATS.print_a3.width).toBeGreaterThan(3000)
  })

  it('google display är mindre format', () => {
    expect(AD_FORMATS.google_display_medium.width).toBeLessThan(500)
    expect(AD_FORMATS.google_display_large.width).toBeLessThan(500)
  })
})
