import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import type { Campaign } from '@/types'

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  context?: Record<string, unknown>
}

interface AIContextType {
  currentPage: string
  setCurrentPage: (page: string) => void
  currentCampaign: Campaign | null
  setCurrentCampaign: (campaign: Campaign | null) => void
  panelOpen: boolean
  togglePanel: () => void
  openPanel: () => void
  closePanel: () => void
  messages: AIMessage[]
  sendMessage: (content: string, context?: Record<string, unknown>) => Promise<void>
  clearMessages: () => void
}

const AIContext = createContext<AIContextType | undefined>(undefined)

export function AIProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<string>('')
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [messages, setMessages] = useState<AIMessage[]>([])

  const togglePanel = useCallback(() => {
    setPanelOpen((prev) => !prev)
  }, [])

  const openPanel = useCallback(() => {
    setPanelOpen(true)
  }, [])

  const closePanel = useCallback(() => {
    setPanelOpen(false)
  }, [])

  const sendMessage = useCallback(async (content: string, context?: Record<string, unknown>) => {
    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
      context,
    }

    setMessages((prev) => [...prev, userMessage])

    // TODO: Implement actual AI API call
    // For now, add a placeholder assistant response
    const assistantMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'AI-svar kommer att implementeras här.',
      timestamp: new Date(),
    }

    // Simulate async delay
    await new Promise((resolve) => setTimeout(resolve, 500))
    setMessages((prev) => [...prev, assistantMessage])
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const value = useMemo(
    () => ({
      currentPage,
      setCurrentPage,
      currentCampaign,
      setCurrentCampaign,
      panelOpen,
      togglePanel,
      openPanel,
      closePanel,
      messages,
      sendMessage,
      clearMessages,
    }),
    [
      currentPage,
      currentCampaign,
      panelOpen,
      togglePanel,
      openPanel,
      closePanel,
      messages,
      sendMessage,
      clearMessages,
    ]
  )

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>
}

export function useAIContext() {
  const context = useContext(AIContext)
  if (!context) {
    throw new Error('useAIContext must be used within AIProvider')
  }
  return context
}

export { AIContext }
