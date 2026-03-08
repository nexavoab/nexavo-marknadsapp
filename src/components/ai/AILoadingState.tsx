import { Sparkles } from 'lucide-react'

interface AILoadingStateProps {
  text?: string
}

export function AILoadingState({ text = 'Laddar AI...' }: AILoadingStateProps) {
  return (
    <div className="rounded-xl bg-gradient-to-r from-purple-50/50 to-blue-50/50 border border-slate-100 p-6">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-purple-200 to-blue-200 flex items-center justify-center animate-pulse">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-slate-100 rounded animate-pulse" />
        <div className="h-3 bg-slate-100 rounded animate-pulse w-5/6" />
        <div className="h-3 bg-slate-100 rounded animate-pulse w-4/6" />
      </div>
      <p className="text-sm text-slate-400 mt-4">{text}</p>
    </div>
  )
}
