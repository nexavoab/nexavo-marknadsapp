/**
 * Ad Compositor — Skapar färdiga annonser med Canvas API
 * Kombinerar: bakgrundsbild + text (headline + body) + logo
 * Output: data URL (PNG) som kan sparas till Supabase Storage
 * 
 * OBS: Cross-origin images kräver CORS-headers på servern.
 * Använd bilder från samma origin eller Supabase Storage med public access.
 */

export interface AdCompositorOptions {
  backgroundImageUrl: string
  logoUrl: string
  headline: string
  body: string
  cta: string
  colors: {
    primary: string
    text: string
    overlay?: string
  }
  format: AdFormat
  /** Font family för text, default: Inter */
  fontFamily?: string
}

export interface AdFormat {
  width: number
  height: number
  name: string
}

/**
 * Fördefinierade annonsformat för olika plattformar
 */
export const AD_FORMATS: Record<string, AdFormat> = {
  // Social Media
  facebook_feed: { width: 1080, height: 1080, name: 'Facebook Feed' },
  facebook_story: { width: 1080, height: 1920, name: 'Facebook Story' },
  instagram_feed: { width: 1080, height: 1080, name: 'Instagram Feed' },
  instagram_story: { width: 1080, height: 1920, name: 'Instagram Story' },
  instagram_reel: { width: 1080, height: 1920, name: 'Instagram Reel' },
  linkedin_post: { width: 1200, height: 627, name: 'LinkedIn Post' },
  
  // Display
  google_display_medium: { width: 300, height: 250, name: 'Google Display Medium' },
  google_display_large: { width: 336, height: 280, name: 'Google Display Large' },
  google_display_leaderboard: { width: 728, height: 90, name: 'Leaderboard' },
  
  // Print
  print_a4: { width: 2480, height: 3508, name: 'Print A4 (300 DPI)' },
  print_a5: { width: 1748, height: 2480, name: 'Print A5 (300 DPI)' },
  print_a3: { width: 3508, height: 4960, name: 'Print A3 (300 DPI)' },
  
  // Email
  email_header: { width: 600, height: 200, name: 'Email Header' },
  email_banner: { width: 600, height: 300, name: 'Email Banner' },
}

/**
 * Skapar en kompositerad annons med Canvas API
 * @returns Data URL (PNG) som kan visas eller sparas
 */
export async function compositeAd(options: AdCompositorOptions): Promise<string> {
  const {
    format,
    backgroundImageUrl,
    logoUrl,
    headline,
    body,
    cta,
    colors,
    fontFamily = 'Inter, system-ui, sans-serif',
  } = options

  // Skapa canvas
  const canvas = document.createElement('canvas')
  canvas.width = format.width
  canvas.height = format.height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Could not get canvas 2D context')
  }

  // 1. Rita bakgrundsbild
  const bg = await loadImage(backgroundImageUrl)
  drawImageCover(ctx, bg, format.width, format.height)

  // 2. Lägg till mörk overlay för läsbarhet
  ctx.fillStyle = colors.overlay ?? 'rgba(0, 0, 0, 0.45)'
  ctx.fillRect(0, 0, format.width, format.height)

  // 3. Rita logo (övre vänstra hörnet)
  const logo = await loadImage(logoUrl)
  const padding = format.width * 0.04
  const logoMaxHeight = format.height * 0.08
  const logoScale = logoMaxHeight / logo.height
  const logoW = logo.width * logoScale
  const logoH = logo.height * logoScale
  ctx.drawImage(logo, padding, padding, logoW, logoH)

  // 4. Rita headline
  const headlineSize = Math.round(format.height * 0.07)
  ctx.fillStyle = colors.text || '#FFFFFF'
  ctx.font = `bold ${headlineSize}px ${fontFamily}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  wrapText(ctx, headline, padding, format.height * 0.50, format.width - padding * 2, headlineSize * 1.2)

  // 5. Rita body-text
  const bodySize = Math.round(format.height * 0.04)
  ctx.fillStyle = `${colors.text || '#FFFFFF'}d9` // 85% opacity
  ctx.font = `${bodySize}px ${fontFamily}`
  wrapText(ctx, body, padding, format.height * 0.68, format.width - padding * 2, bodySize * 1.4)

  // 6. Rita CTA-knapp
  const btnY = format.height * 0.84
  const btnH = format.height * 0.07
  const btnW = format.width * 0.4
  const btnX = padding
  const btnRadius = Math.min(8, btnH * 0.15)

  // Knapp bakgrund
  ctx.fillStyle = colors.primary
  roundRect(ctx, btnX, btnY, btnW, btnH, btnRadius)
  ctx.fill()

  // Knapp text
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `bold ${Math.round(btnH * 0.42)}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(cta, btnX + btnW / 2, btnY + btnH / 2)

  return canvas.toDataURL('image/png')
}

/**
 * Skapar en enkel preview utan bakgrundsbild (snabbare för testning)
 */
export function compositeAdPreview(options: Omit<AdCompositorOptions, 'backgroundImageUrl' | 'logoUrl'> & {
  backgroundColor?: string
}): string {
  const {
    format,
    headline,
    body,
    cta,
    colors,
    backgroundColor = '#1e293b',
    fontFamily = 'Inter, system-ui, sans-serif',
  } = options

  const canvas = document.createElement('canvas')
  canvas.width = format.width
  canvas.height = format.height
  const ctx = canvas.getContext('2d')!

  // Bakgrund
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, format.width, format.height)

  const padding = format.width * 0.04

  // Headline
  const headlineSize = Math.round(format.height * 0.07)
  ctx.fillStyle = colors.text || '#FFFFFF'
  ctx.font = `bold ${headlineSize}px ${fontFamily}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  wrapText(ctx, headline, padding, format.height * 0.35, format.width - padding * 2, headlineSize * 1.2)

  // Body
  const bodySize = Math.round(format.height * 0.04)
  ctx.fillStyle = `${colors.text || '#FFFFFF'}d9`
  ctx.font = `${bodySize}px ${fontFamily}`
  wrapText(ctx, body, padding, format.height * 0.55, format.width - padding * 2, bodySize * 1.4)

  // CTA
  const btnY = format.height * 0.78
  const btnH = format.height * 0.08
  const btnW = format.width * 0.4
  const btnX = padding

  ctx.fillStyle = colors.primary
  roundRect(ctx, btnX, btnY, btnW, btnH, 8)
  ctx.fill()

  ctx.fillStyle = '#FFFFFF'
  ctx.font = `bold ${Math.round(btnH * 0.42)}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(cta, btnX + btnW / 2, btnY + btnH / 2)

  return canvas.toDataURL('image/png')
}

// ============ Helper Functions ============

/**
 * Laddar en bild asynkront
 * OBS: Kräver CORS-headers för cross-origin bilder
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(new Error(`Failed to load image: ${url} - ${e}`))
    img.src = url
  })
}

/**
 * Ritar en bild så den täcker hela canvasen (cover mode)
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasW: number,
  canvasH: number
) {
  const imgRatio = img.width / img.height
  const canvasRatio = canvasW / canvasH

  let drawW: number, drawH: number, offsetX: number, offsetY: number

  if (imgRatio > canvasRatio) {
    // Bilden är bredare - beskär sidorna
    drawH = canvasH
    drawW = img.width * (canvasH / img.height)
    offsetX = (canvasW - drawW) / 2
    offsetY = 0
  } else {
    // Bilden är högre - beskär topp/botten
    drawW = canvasW
    drawH = img.height * (canvasW / img.width)
    offsetX = 0
    offsetY = (canvasH - drawH) / 2
  }

  ctx.drawImage(img, offsetX, offsetY, drawW, drawH)
}

/**
 * Renderar text med automatisk radbrytning
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ')
  let line = ''
  let currentY = y

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    const metrics = ctx.measureText(testLine)

    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, currentY)
      line = word
      currentY += lineHeight
    } else {
      line = testLine
    }
  }

  if (line) {
    ctx.fillText(line, x, currentY)
  }
}

/**
 * Ritar en rektangel med rundade hörn
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
