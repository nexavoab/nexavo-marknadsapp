import { Button } from '@/components/ui/button'
import { Settings2, Filter, Share2 } from 'lucide-react'
import { toast } from 'sonner'

interface PageHeaderProps {
  title: string
  subtitle?: string
  userName?: string
  onCustomize?: () => void
  onFilter?: () => void
  onShare?: () => void
}

export function PageHeader({
  title,
  subtitle,
  userName,
  onCustomize,
  onFilter,
  onShare,
}: PageHeaderProps) {
  const handleShare = () => {
    if (onShare) {
      onShare()
    } else {
      // Default: copy URL
      navigator.clipboard.writeText(window.location.href)
      toast.success('Länk kopierad!')
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {userName ? `${title}, ${userName} 👋` : title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onCustomize && (
          <Button variant="outline" size="sm" onClick={onCustomize}>
            <Settings2 className="h-4 w-4 mr-2" />
            Customize Widget
          </Button>
        )}
        {onFilter && (
          <Button variant="outline" size="sm" onClick={onFilter}>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </div>
    </div>
  )
}
