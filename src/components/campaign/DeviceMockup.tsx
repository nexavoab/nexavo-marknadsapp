/**
 * Device Mockup Component
 * Visar bilder i responsiva ramar baserat på format
 */

import type { TemplateFormat } from '@/types'
import { cn } from '@/lib/utils'

interface DeviceMockupProps {
  format: TemplateFormat
  imageUrl?: string
  isLoading?: boolean
  children?: React.ReactNode
  className?: string
}

/**
 * Renderar en enhetsmockup med rätt aspect ratio för formatet
 */
export function DeviceMockup({
  format,
  imageUrl,
  isLoading,
  children,
  className,
}: DeviceMockupProps) {
  const isStory = format.includes('story')
  const isPrint = format.includes('print')
  const isEmail = format.includes('email')
  const isDisplay = format.includes('display')

  // Välj rätt frame-stil baserat på format
  const getFrameStyles = () => {
    if (isStory) {
      // Mobiltelefon-frame för stories (9:16)
      return {
        wrapper: 'w-48 aspect-[9/16]',
        frame: 'rounded-[2rem] ring-4 ring-gray-800 ring-offset-2 ring-offset-gray-900',
        notch: true,
      }
    }
    if (isPrint) {
      // Papper-frame för print (A4 ratio ~1:1.414)
      return {
        wrapper: 'w-48 aspect-[1/1.414]',
        frame: 'rounded-sm shadow-[4px_4px_0_rgba(0,0,0,0.1)]',
        notch: false,
      }
    }
    if (isEmail) {
      // Email/browser-frame
      return {
        wrapper: 'w-64 aspect-[3/1]',
        frame: 'rounded-md border-t-8 border-gray-700',
        notch: false,
      }
    }
    if (isDisplay) {
      // Display ad - ofta mindre och bredare
      return {
        wrapper: 'w-40 aspect-[6/5]',
        frame: 'rounded-md',
        notch: false,
      }
    }
    // Default: square för feeds (1:1)
    return {
      wrapper: 'w-64 aspect-square',
      frame: 'rounded-xl',
      notch: false,
    }
  }

  const styles = getFrameStyles()

  return (
    <div
      className={cn(
        'relative mx-auto overflow-hidden bg-gray-900 shadow-2xl',
        styles.wrapper,
        styles.frame,
        className
      )}
    >
      {/* Phone notch for stories */}
      {styles.notch && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-800 rounded-b-2xl z-10" />
      )}

      {/* Content */}
      {isLoading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-gray-400 text-sm">Genererar...</div>
        </div>
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt={format}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-gray-500 gap-2">
          <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs">Ingen bild</span>
        </div>
      )}

      {/* Overlay children (badges, buttons etc) */}
      {children}

      {/* Home indicator for stories */}
      {styles.notch && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-gray-600 rounded-full" />
      )}
    </div>
  )
}

/**
 * Format display name helper
 */
export function getFormatDisplayName(format: TemplateFormat): string {
  const names: Record<TemplateFormat, string> = {
    facebook_feed: 'Facebook Feed',
    facebook_story: 'Facebook Story',
    instagram_feed: 'Instagram Feed',
    linkedin_post: 'LinkedIn Post',
    linkedin_article: 'LinkedIn Artikel',
    tiktok_video: 'TikTok Video',
    tiktok_spark: 'TikTok Spark Ad',
    instagram_story: 'Instagram Story',
    google_display: 'Google Display',
    google_search: 'Google Search',
    print_a4: 'A4 Flyer',
    print_a5: 'A5 Flyer',
    print_a3: 'A3 Poster',
    print_flyer: 'Flyer A5',
    email_header: 'E-posthuvud',
    email_newsletter: 'Nyhetsbrev',
  }
  return names[format] || format
}

/**
 * Get format icon emoji
 */
export function getFormatIcon(format: TemplateFormat): string {
  if (format.includes('linkedin')) return '💼'
  if (format.includes('tiktok')) return '🎵'
  if (format.includes('facebook') || format.includes('instagram')) return '📱'
  if (format.includes('google')) return '🔍'
  if (format.includes('print')) return '🖨️'
  if (format.includes('email')) return '📧'
  return '📄'
}
