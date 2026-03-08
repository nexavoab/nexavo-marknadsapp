import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AIErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function AIErrorState({
  message = 'Något gick fel vid laddning av AI-funktioner.',
  onRetry,
}: AIErrorStateProps) {
  return (
    <div className="rounded-xl bg-red-50 border border-red-100 p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-red-900 mb-1">
            Ett fel uppstod
          </h3>
          <p className="text-sm text-red-700 mb-4">
            {message}
          </p>
          {onRetry && (
            <Button
              variant="outline"
              onClick={onRetry}
              className="border-red-200 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Försök igen
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
