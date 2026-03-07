import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Download, Calendar, ExternalLink, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WidgetCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  onExportCSV?: () => void
  onChangePeriod?: () => void
  onViewAll?: () => void
  showDownload?: boolean
  showMenu?: boolean
  action?: React.ReactNode
}

export function WidgetCard({
  title,
  subtitle,
  children,
  className = '',
  onExportCSV,
  onChangePeriod,
  onViewAll,
  showDownload = true,
  showMenu = true,
  action,
}: WidgetCardProps) {
  const hasMenuActions = onExportCSV || onChangePeriod || onViewAll

  return (
    <div className={cn('bg-background rounded-xl p-5 shadow-sm', className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-base">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1 ml-3">
          {action}
          {showDownload && onExportCSV && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onExportCSV}
            >
              <ChevronDown className="h-4 w-4" />
              <span className="sr-only">Ladda ner</span>
            </Button>
          )}
          {showMenu && hasMenuActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Meny</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onExportCSV && (
                  <DropdownMenuItem onClick={onExportCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportera som CSV
                  </DropdownMenuItem>
                )}
                {onChangePeriod && (
                  <DropdownMenuItem onClick={onChangePeriod}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Ändra period
                  </DropdownMenuItem>
                )}
                {onViewAll && (
                  <DropdownMenuItem onClick={onViewAll}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Se alla
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}
