import { describe, it, expect } from 'vitest'
import { FORMAT_LABELS, CATEGORY_LABELS } from '@/lib/formatLabels'

describe('FORMAT_LABELS', () => {
  it('innehåller alla 10 format', () => {
    const formats = Object.keys(FORMAT_LABELS)
    expect(formats).toHaveLength(10)
  })

  it('facebook_feed har rätt kategori och dimensioner', () => {
    expect(FORMAT_LABELS.facebook_feed.category).toBe('social')
    expect(FORMAT_LABELS.facebook_feed.dimensions).toBe('1080×1080')
  })

  it('print_a4 har rätt kategori', () => {
    expect(FORMAT_LABELS.print_a4.category).toBe('print')
  })

  it('google_display har rätt kategori', () => {
    expect(FORMAT_LABELS.google_display.category).toBe('google')
  })

  it('email_header har rätt kategori', () => {
    expect(FORMAT_LABELS.email_header.category).toBe('email')
  })
})

describe('CATEGORY_LABELS', () => {
  it('innehåller alla 4 kategorier', () => {
    expect(Object.keys(CATEGORY_LABELS)).toHaveLength(4)
  })

  it('social-label innehåller emoji', () => {
    expect(CATEGORY_LABELS.social).toContain('📱')
  })
})
