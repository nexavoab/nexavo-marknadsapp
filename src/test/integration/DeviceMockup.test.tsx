import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeviceMockup } from '@/components/campaign/DeviceMockup'

describe('DeviceMockup', () => {
  it('visar loading state', () => {
    render(<DeviceMockup format="facebook_feed" isLoading={true} />)
    expect(screen.getByText(/genererar/i)).toBeInTheDocument()
  })

  it('visar bild när imageUrl finns', () => {
    render(<DeviceMockup format="facebook_feed" imageUrl="https://test.com/img.png" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://test.com/img.png')
  })

  it('visar placeholder när ingen bild', () => {
    render(<DeviceMockup format="facebook_feed" />)
    expect(screen.getByText(/ingen bild/i)).toBeInTheDocument()
  })

  it('har portrait aspect ratio för story-format', () => {
    const { container } = render(<DeviceMockup format="facebook_story" />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('9/16')
  })

  it('har square aspect ratio för feed-format', () => {
    const { container } = render(<DeviceMockup format="facebook_feed" />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('square')
  })
})
