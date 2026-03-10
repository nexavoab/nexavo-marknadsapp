import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
}

export default function AIChatPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { appUser } = useAuth()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen])

  const handleSubmit = async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || isLoading) return

    const orgId = appUser?.organization_id
    if (!orgId) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ingen organisation kopplad till ditt konto.' }])
      return
    }

    setMessages(prev => [...prev, { role: 'user', content: trimmedInput }])
    setInput('')
    setIsLoading(true)

    // Skapa ai_task — triggern anropar OpenClaw automatiskt
    const { data: task, error } = await supabase
      .from('ai_tasks')
      .insert({
        org_id: orgId,
        task_type: 'chat',
        payload: { message: trimmedInput },
        status: 'pending',
      })
      .select('id')
      .single()

    if (error || !task) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Fel: ${error?.message ?? 'Kunde inte skapa uppgift'}` }])
      setIsLoading(false)
      return
    }

    // Lyssna på Realtime updates för denna task
    const channel = supabase
      .channel(`task-${task.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ai_tasks',
        filter: `id=eq.${task.id}`,
      }, (payload) => {
        const updated = payload.new as { status: string; result: { message?: string; text?: string } | null }
        if (updated.status === 'completed' && updated.result) {
          const text = updated.result.message || updated.result.text || JSON.stringify(updated.result)
          setMessages(prev => [...prev, { role: 'assistant', content: text }])
          setIsLoading(false)
          supabase.removeChannel(channel)
        } else if (updated.status === 'error') {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Ett fel uppstod. Försök igen.' }])
          setIsLoading(false)
          supabase.removeChannel(channel)
        }
      })
      .subscribe()

    // Timeout efter 60s
    setTimeout(() => {
      if (isLoading) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Tog för lång tid. Försök igen.' }])
        setIsLoading(false)
        supabase.removeChannel(channel)
      }
    }, 60000)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          isOpen && 'hidden'
        )}
        title="AI-assistent"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {isOpen && <div className="fixed inset-0 z-[9998] bg-black/20" onClick={() => setIsOpen(false)} />}

      <div className={cn(
        'fixed right-0 top-0 z-[9999] flex h-full w-96 max-w-full flex-col bg-card border-l border-border shadow-xl transition-transform duration-300',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold text-sm">Roberta</h2>
              <p className="text-xs text-muted-foreground">AI-marknadsassistent</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary/50" />
              <p className="font-medium">Hej! Jag är Roberta.</p>
              <p className="mt-1">Beskriv vad du behöver så hjälper jag dig med kampanjer, copy och strategi.</p>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index} className={cn(
              'max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
              message.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'mr-auto bg-muted'
            )}>
              {message.content}
            </div>
          ))}

          {isLoading && (
            <div className="mr-auto max-w-[85%] rounded-lg bg-muted px-4 py-3">
              <div className="flex gap-1 items-center">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-xs text-muted-foreground ml-2">Roberta tänker...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skriv till Roberta..."
              rows={2}
              className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              disabled={isLoading}
            />
            <Button onClick={handleSubmit} disabled={!input.trim() || isLoading} size="icon" className="h-auto self-end">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Enter för att skicka • Shift+Enter för ny rad</p>
        </div>
      </div>
    </>
  )
}
