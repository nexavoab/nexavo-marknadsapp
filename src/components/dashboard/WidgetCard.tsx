import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Download, Calendar, ExternalLink } from 'lucide-react'

interface WidgetCardProps {
  title: string
  subtitle: string
  children: React.ReactNode
  className?: string
  onExportCSV?: () => void
  onChangePeriod?: () => void
  onViewAll?: () => void
  showMenu?: boolean
}

export function WidgetCard({
  title,
  subtitle,
  children,
  className = '',
  onExportCSV,
  onChangePeriod,
  onViewAll,
  showMenu = true,
}: WidgetCardProps) {
  const hasActions = onExportCSV || onChangePeriod || onViewAll

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        {showMenu && hasActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Widget-meny</span>
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
                  Se alla →
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {children}
    </Card>
  )
}
