import { describe, it, expect } from 'vitest'
import { FORMAT_LABELS, CATEGORY_LABELS } from '@/lib/formatLabels'

describe('FORMAT_LABELS', () => {
  it('innehaller alla stodda format', () => {
    const formats = Object.keys(FORMAT_LABELS)
    expect(formats).toHaveLength(16)
    expect(formats).toEqual(expect.arrayContaining([
      'facebook_feed',
      'facebook_story',
      'instagram_feed',
      'instagram_story',
      'linkedin_post',
      'linkedin_article',
      'tiktok_video',
      'tiktok_spark',
      'google_display',
      'google_search',
      'print_a4',
      'print_a5',
      'print_a3',
      'print_flyer',
      'email_header',
      'email_newsletter',
    ]))
  })

  it('facebook_feed har ratt kategori och dimensioner', () => {
    expect(FORMAT_LABELS.facebook_feed.category).toBe('social')
    expect(FORMAT_LABELS.facebook_feed.dimensions).toBe('1080×1080')
  })

  it('print_a4 har ratt kategori', () => {
    expect(FORMAT_LABELS.print_a4.category).toBe('print')
  })

  it('google_display har ratt kategori', () => {
    expect(FORMAT_LABELS.google_display.category).toBe('google')
  })

  it('email_header har ratt kategori', () => {
    expect(FORMAT_LABELS.email_header.category).toBe('email')
  })
})

describe('CATEGORY_LABELS', () => {
  it('innehaller alla 4 kategorier', () => {
    expect(Object.keys(CATEGORY_LABELS)).toHaveLength(4)
  })

  it('social-label innehaller emoji', () => {
    expect(CATEGORY_LABELS.social).toContain('📱')
  })
})
