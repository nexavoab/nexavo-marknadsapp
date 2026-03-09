/**
 * CampaignChat
 * WAS-lager2c: Conversational Campaign Creator
 * Chat-baserad AI copy-generator med naturligt språk
 */

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useBrand } from '@/hooks/useBrand'
import { supabase } from '@/lib/supabase'
import type { Campaign } from '@/types'
import { Loader2, Copy, Check, AlertCircle, Send, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CampaignChatProps {
  campaign: Campaign
}

// Typ för copy-engine response
interface CopyEngineVariant {
  variant_id: string
  hypothesis?: string
  text_blocks: {
    headline?: string
    hook?: string
    primary_text?: string
    body?: string
    cta?: string
    description?: string
    [key: string]: string | undefined
  }
  explanation?: Record<string, unknown>
  policy_flags?: Array<{ type: string; message: string }>
}

interface CopyEngineResponse {
  variants: CopyEngineVariant[]
  global_suggestions?: Record<string, unknown>
  needs_clarification?: boolean
  clarification_questions?: string[]
  _source?: string
}

// UI-variant (förenklad för chat-visning)
interface CopyResult {
  headline: string
  copy: string
  cta: string
}

// Chat message type
interface Message {
  role: 'user' | 'assistant'
  content: string
  variants?: CopyResult[]
}

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content: 'Hej! Berätta vad du vill marknadsföra. Vilken tjänst, målgrupp och kanal?',
}

// Extrahera kanal från användarmeddelande
function parseChannel(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('instagram')) return 'instagram'
  if (lower.includes('facebook')) return 'meta'
  if (lower.includes('linkedin')) return 'linkedin'
  if (lower.includes('tiktok')) return 'tiktok'
  if (lower.includes('google')) return 'google_display'
  if (lower.includes('email') || lower.includes('e-post') || lower.includes('nyhetsbrev')) return 'email'
  return 'instagram' // default
}

export function CampaignChat({ campaign }: CampaignChatProps) {
  const { brand, loading: brandLoading } = useBrand()
  
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<{ msgIdx: number; varIdx: number } | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = async () => {
    const userMessage = input.trim()
    if (!userMessage || isLoading) return

    if (!brand) {
      toast.error('Inget varumärke konfigurerat. Gå till Varumärke-sidan.')
      return
    }

    // Add user message
    const newUserMessage: Message = { role: 'user', content: userMessage }
    setMessages((prev) => [...prev, newUserMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Parse channel from user message
      const channel = parseChannel(userMessage)
      
      // Build copy-engine payload
      const payload = {
        brand_context: {
          brand_id: brand.id,
          org_id: campaign.organization_id,
          guide_mode: 'PUBLISHED',
        },
        copy_context: {
          mode: 'post',
          channel,
          funnel_stage: 'consideration',
          goal: userMessage,
        },
        input: {
          brief: userMessage,
        },
      }

      const { data, error } = await supabase.functions.invoke<CopyEngineResponse>('copy-engine', {
        body: payload,
      })

      if (error) {
        throw new Error(`AI-fel: ${error.message}`)
      }

      if (!data?.variants || data.variants.length === 0) {
        // No variants - show clarification or fallback message
        const clarificationMsg = data?.clarification_questions?.join('\n') 
          || 'Jag behöver lite mer information. Kan du beskriva målgruppen och vad du vill uppnå?'
        
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: clarificationMsg },
        ])
        return
      }

      // Map variants to simplified format
      const variants: CopyResult[] = data.variants.map((v) => {
        const tb = v.text_blocks || {}
        const copyParts: string[] = []
        if (tb.hook) copyParts.push(tb.hook)
        if (tb.primary_text) copyParts.push(tb.primary_text)
        if (tb.body) copyParts.push(tb.body)
        if (tb.description) copyParts.push(tb.description)

        return {
          headline: tb.headline || tb.hook || '',
          copy: copyParts.join('\n\n') || '',
          cta: tb.cta || '',
        }
      })

      // Build assistant message with variants
      const assistantContent = `Här är ${variants.length} ${variants.length === 1 ? 'variant' : 'varianter'} för ${channel}:`
      
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: assistantContent, variants },
      ])
    } catch (err) {
      console.error('CampaignChat error:', err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Något gick fel: ${err instanceof Error ? err.message : 'Okänt fel'}. Försök igen.`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCopyVariant = async (msgIdx: number, varIdx: number, variant: CopyResult) => {
    const text = [variant.headline, variant.copy, variant.cta].filter(Boolean).join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex({ msgIdx, varIdx })
      toast.success('Kopierat!')
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      toast.error('Kunde inte kopiera')
    }
  }

  if (brandLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!brand) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800">Varumärke saknas</p>
          <p className="text-sm text-amber-700 mt-1">
            Konfigurera varumärket under Varumärke-sidan för att kunna chatta.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[600px] bg-card rounded-lg border border-border">
      {/* Chat header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <MessageCircle className="w-5 h-5 text-primary" />
        <h3 className="font-medium">AI Copy-assistent</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          Kampanj: {campaign.name}
        </span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, msgIdx) => (
          <div
            key={msgIdx}
            className={cn(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted text-foreground rounded-bl-md'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

              {/* Variants */}
              {msg.variants && msg.variants.length > 0 && (
                <div className="mt-3 space-y-3">
                  {msg.variants.map((variant, varIdx) => (
                    <div
                      key={varIdx}
                      className="bg-background rounded-lg p-3 border border-border"
                    >
                      {variant.headline && (
                        <p className="font-semibold text-sm mb-1">{variant.headline}</p>
                      )}
                      {variant.copy && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-2">
                          {variant.copy}
                        </p>
                      )}
                      {variant.cta && (
                        <p className="text-sm font-medium text-primary">{variant.cta}</p>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-7 text-xs"
                        onClick={() => handleCopyVariant(msgIdx, varIdx, variant)}
                      >
                        {copiedIndex?.msgIdx === msgIdx && copiedIndex?.varIdx === varIdx ? (
                          <>
                            <Check className="w-3 h-3 mr-1 text-green-600" />
                            Kopierat
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Kopiera
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-150" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-300" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Skriv vad du vill marknadsföra..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-full border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="rounded-full h-10 w-10"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Tips: Skriv t.ex. "Städning RUT för barnfamiljer i Stockholm, Instagram"
        </p>
      </div>
    </div>
  )
}
