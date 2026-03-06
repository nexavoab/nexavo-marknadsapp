import { describe, it, expect } from 'vitest'
import { AD_FORMATS } from '@/lib/adCompositor'

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
})
