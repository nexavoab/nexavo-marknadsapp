/**
 * AI Chat Panel
 * Floating FAB med slide-in chat panel för AI-assistenten
 */

import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { callAIGateway, type ConceptResponse } from '@/hooks/useAIGateway'
import type { BrandContextForAI } from '@/lib/brandContextAdapter'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Mock brand context för chat när vi inte har verklig brand context
const mockBrandContext: BrandContextForAI = {
  brand_id: 'mock-brand',
  name: 'Nexavo',
  positioning: {
    statement: 'Nexavo är ett modernt varumärke för franchise-kedjor',
    target_audience: 'Franchisetagare och deras kunder',
    unique_value: 'AI-driven marknadsföring för franchise',
  },
  tone_of_voice: {
    traits: {
      formality: 0.5,
      modernity: 0.7,
      emotion: 0.6,
      volume: 0.5,
    },
    description: 'Modern, varm och professionell ton.',
  },
  visual: {
    primary_color: '#2563eb',
    secondary_color: '#1e40af',
    accent_color: '#f59e0b',
    logo_url: '',
    font_heading: 'Inter',
    font_body: 'Inter',
    imagery_style: 'Modern och professionell',
  },
  guardrails: {
    forbidden_words: [],
    required_disclaimers: [],
    forbidden_image_styles: [],
  },
}

export default function AIChatPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || isLoading) return

    // Add user message
    const userMessage: Message = { role: 'user', content: trimmedInput }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Call generate-concept edge function
      const response = await callAIGateway<ConceptResponse>('generate-concept', {
        brandContext: mockBrandContext,
        campaignBrief: trimmedInput,
        targetChannels: ['instagram', 'facebook'],
      })

      // Format AI response with concepts
      let assistantContent = ''
      if (response.concepts && response.concepts.length > 0) {
        assistantContent = response.concepts
          .map((concept, index) => {
            return `**Koncept ${index + 1}:**\n• ${concept.headline}\n• ${concept.keyMessage}`
          })
          .join('\n\n')
      } else {
        assistantContent = 'Inga koncept genererades. Försök med en mer detaljerad beskrivning.'
      }

      const assistantMessage: Message = { role: 'assistant', content: assistantContent }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Ett fel uppstod: ${error instanceof Error ? error.message : 'Okänt fel'}`,
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          isOpen && 'hidden'
        )}
        title="Öppna AI-assistenten"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* Overlay when panel is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998] bg-black/20"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 z-[9999] flex h-full w-96 max-w-full flex-col bg-card border-l border-border shadow-xl transition-transform duration-300',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">AI-assistent</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary/50" />
              <p>Hej! Jag är din AI-assistent.</p>
              <p className="mt-1">Beskriv din kampanjidé så genererar jag kreativa koncept.</p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                message.role === 'user'
                  ? 'ml-auto bg-primary text-primary-foreground'
                  : 'mr-auto bg-muted'
              )}
            >
              {message.content}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="mr-auto max-w-[85%] rounded-lg bg-muted px-4 py-3">
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Beskriv din kampanjidé..."
              rows={2}
              className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-auto self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Tryck Enter för att skicka, Shift+Enter för ny rad
          </p>
        </div>
      </div>
    </>
  )
}
