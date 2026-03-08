import type { TemplateFormat } from '@/types'

export type FormatCategory = 'social' | 'google' | 'print' | 'email'

export interface FormatInfo {
  label: string
  dimensions: string
  category: FormatCategory
}

export const FORMAT_LABELS: Record<TemplateFormat, FormatInfo> = {
  facebook_feed:   { label: 'Facebook Feed',   dimensions: '1080×1080', category: 'social' },
  facebook_story:  { label: 'Facebook Story',  dimensions: '1080×1920', category: 'social' },
  instagram_feed:  { label: 'Instagram Feed',  dimensions: '1080×1080', category: 'social' },
  instagram_story: { label: 'Instagram Story', dimensions: '1080×1920', category: 'social' },
  linkedin_post:   { label: 'LinkedIn Post',   dimensions: '1200×627',  category: 'social' },
  linkedin_article:{ label: 'LinkedIn Artikel',dimensions: '1200×627',  category: 'social' },
  tiktok_video:    { label: 'TikTok Video',    dimensions: '1080×1920', category: 'social' },
  tiktok_spark:    { label: 'TikTok Spark Ad', dimensions: '1080×1920', category: 'social' },
  google_display:  { label: 'Google Display',  dimensions: '300×250',   category: 'google' },
  google_search:   { label: 'Google Search',   dimensions: 'Text',      category: 'google' },
  print_a4:        { label: 'A4 Flyer',        dimensions: '2480×3508', category: 'print'  },
  print_a5:        { label: 'A5 Flyer',        dimensions: '1748×2480', category: 'print'  },
  print_a3:        { label: 'Poster A3',       dimensions: '3508×4961', category: 'print'  },
  print_flyer:     { label: 'Flyer A5',        dimensions: '2480×3508', category: 'print'  },
  email_header:    { label: 'E-posthuvud',     dimensions: '600×200',   category: 'email'  },
  email_newsletter:{ label: 'Nyhetsbrev',      dimensions: '600×800',   category: 'email'  },
}

export const CATEGORY_LABELS: Record<FormatCategory, string> = {
  social: '📱 Socialt',
  google: '🔍 Google',
  print:  '🖨️ Print',
  email:  '📧 E-post',
}

export const CATEGORY_ORDER: FormatCategory[] = ['social', 'google', 'print', 'email']

export function getFormatInfo(format: TemplateFormat): FormatInfo {
  return FORMAT_LABELS[format] ?? { label: format, dimensions: '?', category: 'social' }
}

export function groupAssetsByCategory<T extends { format?: TemplateFormat }>(
  assets: T[]
): Record<FormatCategory, T[]> {
  const grouped: Record<FormatCategory, T[]> = {
    social: [],
    google: [],
    print: [],
    email: [],
  }

  for (const asset of assets) {
    if (asset.format) {
      const info = FORMAT_LABELS[asset.format]
      if (info) {
        grouped[info.category].push(asset)
      }
    }
  }

  return grouped
}
