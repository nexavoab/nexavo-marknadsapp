"use client"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { usePathname } from "next/navigation"
import { useUiStore } from "@/stores/uiStore"
import {
  X, Loader2, Copy, Check, ThumbsUp, ThumbsDown, Pencil,
  Send, Square, Undo2, Clock, ChevronDown, ChevronUp,
} from "lucide-react"
import ReactMarkdown from "react-markdown"

/* ── Constants ─────────────────────────────────── */

const UNDO_TIMEOUT_MS = 15_000

/* ── Slash commands (S1) ──────────────────────── */

const SLASH_COMMANDS = [
  { cmd: "/kampanjer", label: "Visa aktiva kampanjer", message: "Visa alla aktiva kampanjer med status och budget" },
  { cmd: "/leads", label: "Senaste leads", message: "Visa de senaste 10 leadsen med ort och kampanj" },
  { cmd: "/rapport", label: "Veckorapport", message: "Ge mig en veckorapport över kampanjer och leads" },
  { cmd: "/budget", label: "Budgetöversikt", message: "Visa budgetöversikt för alla aktiva kampanjer" },
  { cmd: "/workflows", label: "n8n workflows", message: "Lista alla n8n-workflows med status" },
  { cmd: "/hjälp", label: "Visa kommandon", message: "Vilka kommandon och verktyg har du tillgång till?" },
] as const

/* ── Confirmation patterns (S2) ───────────────── */

const CONFIRM_PATTERNS = [
  /ska jag k[oö]ra detta/i,
  /vill du att jag/i,
  /ska jag (pausa|aktivera|avaktivera|[aä]ndra|uppdatera|trigga)/i,
  /bekr[aä]fta/i,
  /[aä]r du s[aä]ker/i,
  /godk[aä]nn/i,
]

/* ── Source patterns (S3) ─────────────────────── */

const SOURCE_PATTERNS: Array<{ pattern: RegExp; label: string; cls: string }> = [
  { pattern: /enligt meta ads/i, label: "Meta Ads", cls: "bg-blue-100 text-blue-800" },
  { pattern: /enligt (fliken|google sheets)/i, label: "Google Sheets", cls: "bg-green-100 text-green-800" },
  { pattern: /enligt n8n/i, label: "n8n", cls: "bg-orange-100 text-orange-800" },
  { pattern: /enligt placid/i, label: "Placid", cls: "bg-purple-100 text-purple-800" },
]

/* ── Undo patterns (S5) ──────────────────────── */

const UNDO_PATTERNS: Array<{ pattern: RegExp; undoMessage: string }> = [
  { pattern: /har pausat kampanjen/i, undoMessage: "Aktivera kampanjen igen" },
  { pattern: /har aktiverat kampanjen/i, undoMessage: "Pausa kampanjen igen" },
  { pattern: /har avaktiverat workflow/i, undoMessage: "Aktivera workflowet igen" },
  { pattern: /har aktiverat workflow/i, undoMessage: "Avaktivera workflowet igen" },
]

/* ── Dynamic loading text (S4) ────────────────── */

function getLoadingText(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes("kampanj") || lower.includes("/kampanj")) return "Hämtar kampanjdata från Meta Ads..."
  if (lower.includes("lead")) return "Hämtar leads..."
  if (lower.includes("budget")) return "Kollar budgetar i Meta Ads..."
  if (lower.includes("workflow") || lower.includes("n8n")) return "Hämtar workflows från n8n..."
  if (lower.includes("rapport") || lower.includes("report")) return "Sammanställer rapport..."
  if (lower.includes("annons")) return "Hämtar annonsdata från Meta..."
  if (lower.includes("bild") || lower.includes("placid")) return "Genererar bild via Placid..."
  if (lower.includes("sheet") || lower.includes("flik")) return "Läser från Google Sheets..."
  return "Seniorita tänker..."
}

/* ── Detection helpers ────────────────────────── */

function detectSources(text: string): string[] {
  return SOURCE_PATTERNS.filter((s) => s.pattern.test(text)).map((s) => s.label)
}

function hasConfirmationRequest(text: string): boolean {
  return CONFIRM_PATTERNS.some((p) => p.test(text))
}

function detectUndo(text: string): string | undefined {
  return UNDO_PATTERNS.find((u) => u.pattern.test(text))?.undoMessage
}

function getSourceStyle(label: string): string {
  return SOURCE_PATTERNS.find((s) => s.label === label)?.cls ?? "bg-gray-100 text-gray-700"
}

/* ── Types ─────────────────────────────────────── */

type Message = {
  id: string
  from: "bot" | "user"
  text: string
  feedback?: "up" | "down" | null
  sources?: string[]
  hasConfirmation?: boolean
  undoMessage?: string
  undoExpires?: number
}

/* ── Helpers ───────────────────────────────────── */

function msgId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function getTimeBasedGreeting(): string {
  const h = new Date().getHours()
  const d = new Date().getDay()
  if (h < 10) return "God morgon"
  if (h >= 16) return d === 5 ? "Bra jobbat denna vecka" : "God eftermiddag"
  return "Hej"
}

/* ── Smart suggestions (time + page) ───────────── */

const pageButtons: Record<string, string[]> = {
  "/overview": ["Vad bör vi fokusera på?", "Veckosammanfattning"],
  "/campaigns": ["Skapa annonser", "Ny kampanj", "Vad funkar bäst?"],
  "/content": ["Skriv ett inlägg", "Föreslå innehåll"],
  "/leads": ["Leads utan svar", "Leads per ort"],
  "/franchise": ["Månadsrapport", "Jämför orter"],
  "/strategy": ["Jämför konkurrenter", "Visa luckor", "Analysera målgrupp", "Quick wins"],
  "/workflows": ["Kör veckorapport", "Kör prestandakoll", "Kör kampanjanalys"],
}

function getSmartSuggestions(pathname: string): string[] {
  const h = new Date().getHours()
  const d = new Date().getDay()
  const timeBased: string[] = []
  if (d === 1 && h < 12) timeBased.push("Veckosammanfattning")
  else if (d === 5 && h >= 14) timeBased.push("Stäng veckan", "Vad saknas?")
  else if (h < 10) timeBased.push("Morgonbriefing")
  const matchedPage = Object.keys(pageButtons).find((p) => pathname.startsWith(p))
  const pageBased = matchedPage ? pageButtons[matchedPage] : []
  const combined = [...new Set([...timeBased, ...pageBased])]
  return combined.slice(0, 5)
}

/* ── Welcome message ──────────────────────────── */

function makeWelcome(): Message {
  return {
    id: msgId(),
    from: "bot",
    text: `${getTimeBasedGreeting()}! Jag är Seniorita, din assistent för Seniorbolaget. Fråga mig om kampanjer, leads, orter eller workflows.`,
  }
}

/* ── Persistence (localStorage) ────────────────── */

const STORAGE_KEY = "seniorita-chat-history"

function loadHistory(): Message[] {
  if (typeof window === "undefined") return [makeWelcome()]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [makeWelcome()]
    const parsed = JSON.parse(raw) as Message[]
    return parsed.length > 0 ? parsed : [makeWelcome()]
  } catch {
    return [makeWelcome()]
  }
}

function saveHistory(msgs: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-50)))
  } catch { /* quota exceeded, ignore */ }
}

/* ── Typewriter hook ──────────────────────────── */

function useTypewriter(text: string, active: boolean, speed = 20) {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!active) { setDisplayed(text); setDone(true); return }
    setDisplayed("")
    setDone(false)
    const words = text.split(" ")
    let i = 0
    const interval = setInterval(() => {
      i += 2
      setDisplayed(words.slice(0, i).join(" "))
      if (i >= words.length) { clearInterval(interval); setDisplayed(text); setDone(true) }
    }, speed)
    return () => clearInterval(interval)
  }, [text, active, speed])
  return { displayed, done, skip: () => { setDisplayed(text); setDone(true) } }
}

/* ── Skeleton shimmer ─────────────────────────── */

function SkeletonBubble({ loadingText, seconds }: { loadingText: string; seconds: number }) {
  return (
    <div className="self-start max-w-[80%]">
      <div className="rounded-xl rounded-bl-sm px-3.5 py-3 bg-secondary">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-primary)]" />
          <span className="text-xs text-muted-foreground">{loadingText}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1 px-1">
        <span className="text-[10px] text-muted-foreground">{seconds}s</span>
        {seconds >= 10 && (
          <span className="text-[10px] text-muted-foreground">MCP-anrop kan ta upp till 5 min</span>
        )}
      </div>
    </div>
  )
}

/* ── Avatar ────────────────────────────────────── */

function SenoritaAvatar({ size = 56 }: { size?: number }) {
  return (
    <img
      src="/seniorita.png"
      alt="Seniorita"
      className="rounded-full shrink-0 object-cover"
      style={{ width: size, height: size }}
    />
  )
}

/* ── Copy button ──────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
      aria-label="Kopiera"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

/* ── Feedback buttons ─────────────────────────── */

function FeedbackButtons({ msgId: id, feedback, onFeedback }: {
  msgId: string; feedback?: "up" | "down" | null
  onFeedback: (id: string, fb: "up" | "down") => void
}) {
  return (
    <div className="flex items-center gap-1 mt-1">
      <button
        onClick={() => onFeedback(id, "up")}
        className={`p-0.5 rounded transition-colors ${feedback === "up" ? "text-[var(--brand-primary)]" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
        aria-label="Bra svar"
      >
        <ThumbsUp className="w-3 h-3" />
      </button>
      <button
        onClick={() => onFeedback(id, "down")}
        className={`p-0.5 rounded transition-colors ${feedback === "down" ? "text-red-500" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
        aria-label="Dåligt svar"
      >
        <ThumbsDown className="w-3 h-3" />
      </button>
    </div>
  )
}

/* ── Source badges (S3) ───────────────────────── */

function SourceBadges({ sources }: { sources: string[] }) {
  if (!sources.length) return null
  return (
    <div className="flex gap-1 mt-1">
      {sources.map((s) => (
        <span key={s} className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getSourceStyle(s)}`}>
          {s}
        </span>
      ))}
    </div>
  )
}

/* ── Undo button (S5) ─────────────────────────── */

function UndoButton({ message, onUndo }: { message: string; onUndo: (msg: string) => void }) {
  const [remaining, setRemaining] = useState(UNDO_TIMEOUT_MS / 1000)

  useEffect(() => {
    if (remaining <= 0) return
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining])

  if (remaining <= 0) return null

  return (
    <button
      onClick={() => onUndo(message)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-medium hover:bg-amber-100 transition-colors"
    >
      <Undo2 className="w-3 h-3" />
      Ångra ({remaining}s)
    </button>
  )
}

/* ── Action log (collapsible) ─────────────────── */

function ActionLog({ messages }: { messages: Message[] }) {
  const [expanded, setExpanded] = useState(false)
  const actions = messages.filter((m) => m.from === "bot" && m.sources && m.sources.length > 0)
  if (actions.length === 0) return null

  return (
    <div className="border-b bg-secondary/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={expanded}
        aria-controls="action-log"
      >
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {actions.length} {actions.length === 1 ? "datakälla använd" : "datakällor använda"}
        </span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {expanded && (
        <div id="action-log" className="px-4 pb-2 space-y-1">
          {actions.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {a.sources!.map((s) => (
                <span key={s} className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getSourceStyle(s)}`}>
                  {s}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Bot message with typewriter ──────────────── */

function BotBubble({ msg, isLatest, onFeedback, onSend }: {
  msg: Message; isLatest: boolean
  onFeedback: (id: string, fb: "up" | "down") => void
  onSend: (text: string) => void
}) {
  const { displayed, done, skip } = useTypewriter(msg.text, isLatest)
  return (
    <div className="self-start max-w-[88%] group">
      <div className="rounded-xl rounded-bl-sm px-3.5 py-2.5 text-sm leading-relaxed bg-secondary text-foreground">
        <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          <ReactMarkdown>{displayed}</ReactMarkdown>
        </div>
        {!done && (
          <button onClick={skip} className="text-xs text-muted-foreground hover:text-foreground mt-1">
            Visa allt
          </button>
        )}
      </div>
      {/* Source badges (S3) */}
      {msg.sources && <SourceBadges sources={msg.sources} />}
      {/* Confirmation buttons (S2) */}
      {msg.hasConfirmation && done && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onSend("Ja, kör!")}
            className="px-3 py-1.5 rounded-lg bg-[var(--brand-primary)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Bekräfta
          </button>
          <button
            onClick={() => onSend("Nej, avbryt.")}
            className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-accent transition-colors"
          >
            Avbryt
          </button>
        </div>
      )}
      {/* Undo button (S5) */}
      {msg.undoMessage && msg.undoExpires && msg.undoExpires > Date.now() && (
        <div className="mt-2">
          <UndoButton message={msg.undoMessage} onUndo={onSend} />
        </div>
      )}
      {/* Actions row */}
      <div className="flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={msg.text} />
        <FeedbackButtons msgId={msg.id} feedback={msg.feedback} onFeedback={onFeedback} />
      </div>
    </div>
  )
}

/* ── User message with edit ───────────────────── */

function UserBubble({ msg, onEdit }: { msg: Message; onEdit: (id: string, newText: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(msg.text)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  if (editing) {
    return (
      <div className="self-end max-w-[88%] flex gap-1.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { onEdit(msg.id, draft); setEditing(false) }
            if (e.key === "Escape") { setDraft(msg.text); setEditing(false) }
          }}
          className="flex-1 text-sm px-3 py-2 rounded-md border bg-card text-foreground outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={() => { onEdit(msg.id, draft); setEditing(false) }}
          className="px-2 py-1 text-xs rounded bg-[var(--brand-primary)] text-white"
        >
          Skicka
        </button>
      </div>
    )
  }
  return (
    <div className="self-end max-w-[88%] group relative">
      <div className="rounded-xl rounded-br-sm px-3.5 py-2.5 text-sm leading-relaxed bg-[var(--brand-primary)] text-white">
        {msg.text}
      </div>
      <button
        onClick={() => setEditing(true)}
        className="absolute -left-6 top-1/2 -translate-y-1/2 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        aria-label="Redigera"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  )
}

/* ── Main ChatPanel ───────────────────────────── */

const MIN_WIDTH = 320
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 400

export function ChatPanel() {
  const { chatOpen, toggleChat } = useUiStore()
  const pathname = usePathname()
  const [messages, setMessages] = useState<Message[]>(() => loadHistory())
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState("Seniorita tänker...")
  const [loadingSeconds, setLoadingSeconds] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [latestBotId, setLatestBotId] = useState<string | null>(null)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashFilter, setSlashFilter] = useState("")
  const [slashIndex, setSlashIndex] = useState(0)
  const isDragging = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const contextButtons = getSmartSuggestions(pathname)

  // Filtered slash commands (S1)
  const filteredCommands = useMemo(() => {
    if (!slashFilter) return SLASH_COMMANDS
    return SLASH_COMMANDS.filter((c) =>
      c.cmd.includes(slashFilter.toLowerCase()) || c.label.toLowerCase().includes(slashFilter.toLowerCase())
    )
  }, [slashFilter])

  // Persist messages
  useEffect(() => { saveHistory(messages) }, [messages])

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  // Ctrl+L keyboard shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "l") {
        e.preventDefault()
        toggleChat()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [toggleChat])

  // Focus input when chat opens
  useEffect(() => {
    if (chatOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [chatOpen])

  // Sync panel width to CSS custom property
  useEffect(() => {
    document.documentElement.style.setProperty("--chat-width", chatOpen ? `${panelWidth}px` : "0px")
    return () => { document.documentElement.style.setProperty("--chat-width", "0px") }
  }, [chatOpen, panelWidth])

  // Slash menu (S1)
  useEffect(() => {
    if (input.startsWith("/")) {
      setShowSlashMenu(true)
      setSlashFilter(input)
      setSlashIndex(0)
    } else {
      setShowSlashMenu(false)
    }
  }, [input])

  // Loading timer
  useEffect(() => {
    if (!loading) { setLoadingSeconds(0); return }
    const interval = setInterval(() => setLoadingSeconds((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [loading])

  // Drag resize
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    const startX = e.clientX
    const startW = panelWidth
    function onMove(ev: MouseEvent) {
      if (!isDragging.current) return
      const diff = startX - ev.clientX
      const newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + diff))
      setPanelWidth(newW)
    }
    function onUp() {
      isDragging.current = false
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }, [panelWidth])

  // Cancel request
  const cancelRequest = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { id: msgId(), from: "user", text: text.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setShowSlashMenu(false)
    setLoading(true)
    setLoadingText(getLoadingText(text))

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const history = messages
        .slice(-6)
        .map((m) => ({ role: m.from === "bot" ? "assistant" : "user", content: m.text }))
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history, page: pathname }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (!res.ok) {
        let errorText = data.error?.message ?? "Någonting gick fel."
        if (res.status === 401) errorText = "Autentisering misslyckades. Kontrollera att sb-channel är konfigurerad rätt."
        else if (res.status === 429) errorText = "För många anrop. Vänta en minut och försök igen."
        else if (res.status >= 500) errorText = "Servern svarar inte just nu. sb-channel kan behöva startas om."
        const errMsg: Message = { id: msgId(), from: "bot", text: errorText }
        setMessages((prev) => [...prev, errMsg])
        setLatestBotId(errMsg.id)
        return
      }
      const replyText = data.data?.message ?? data.reply ?? "Inget svar."
      const botMsg: Message = {
        id: msgId(),
        from: "bot",
        text: replyText,
        sources: detectSources(replyText),
        hasConfirmation: hasConfirmationRequest(replyText),
        undoMessage: detectUndo(replyText),
        undoExpires: detectUndo(replyText) ? Date.now() + UNDO_TIMEOUT_MS : undefined,
      }
      setMessages((prev) => [...prev, botMsg])
      setLatestBotId(botMsg.id)
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        const cancelMsg: Message = { id: msgId(), from: "bot", text: "Anropet avbröts." }
        setMessages((prev) => [...prev, cancelMsg])
        setLatestBotId(cancelMsg.id)
      } else {
        const errorMessage = err instanceof Error ? err.message : ""
        const isTimeout = errorMessage.includes("timeout") || errorMessage.includes("Failed to fetch")
        const errMsg: Message = {
          id: msgId(),
          from: "bot",
          text: isTimeout
            ? "Seniorita svarade inte i tid. Det kan bero på att ett MCP-anrop tog för lång tid. Försök igen, eller kolla att sb-channel körs på servern."
            : "Kunde inte nå servern. Kontrollera anslutningen.",
        }
        setMessages((prev) => [...prev, errMsg])
        setLatestBotId(errMsg.id)
      }
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }, [loading, messages, pathname])

  // Slash command selection (S1)
  const selectSlashCommand = useCallback((cmd: typeof SLASH_COMMANDS[number]) => {
    sendMessage(cmd.message)
  }, [sendMessage])

  // Edit + resend
  function handleEdit(id: string, newText: string) {
    if (!newText.trim()) return
    const idx = messages.findIndex((m) => m.id === id)
    if (idx === -1) return
    setMessages((prev) => prev.slice(0, idx))
    setTimeout(() => sendMessage(newText), 50)
  }

  // Feedback
  function handleFeedback(id: string, fb: "up" | "down") {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, feedback: m.feedback === fb ? null : fb } : m))
  }

  // Clear history
  function clearHistory() {
    const welcome = makeWelcome()
    setMessages([welcome])
    setLatestBotId(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  // Keyboard handling
  function handleKeyDown(e: React.KeyboardEvent) {
    // Slash menu navigation (S1)
    if (showSlashMenu && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashIndex((i) => (i + 1) % filteredCommands.length); return }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlashIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length); return }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); selectSlashCommand(filteredCommands[slashIndex]); return }
      if (e.key === "Escape") { e.preventDefault(); setShowSlashMenu(false); setInput(""); return }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // FAB (closed state)
  if (!chatOpen) {
    return (
      <button
        onClick={toggleChat}
        className="fixed z-50 cursor-pointer transition-transform duration-200 hover:scale-105"
        style={{
          bottom: 24,
          right: 24,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          borderRadius: "50%",
          border: "none",
          padding: 0,
          background: "transparent",
        }}
        aria-label="Öppna chatt (Ctrl+L)"
      >
        <SenoritaAvatar size={56} />
        <span
          className="absolute block rounded-full bg-[var(--status-ok)] border-2 border-white"
          style={{ width: 12, height: 12, top: 0, right: 0 }}
        />
      </button>
    )
  }

  // Sidebar (open state)
  return (
    <div
      className="fixed z-40 top-0 right-0 h-screen flex flex-col bg-card border-l shadow-lg overflow-hidden transition-[width] duration-200 ease-in-out"
      style={{ width: panelWidth }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={onDragStart}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--brand-primary)]/30 transition-colors z-10"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2.5">
          <SenoritaAvatar size={32} />
          <div>
            <span className="text-sm font-semibold text-foreground">Seniorita</span>
            <span className={`ml-2 inline-block w-1.5 h-1.5 rounded-full ${loading ? "bg-[var(--status-warn)] animate-pulse" : "bg-[var(--status-ok)]"}`} />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearHistory}
            className="p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground text-xs"
            title="Rensa historik"
          >
            Rensa
          </button>
          <button onClick={toggleChat} className="p-1 rounded-md hover:bg-accent transition-colors" aria-label="Stäng chatt (Ctrl+L)">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Action log */}
      <ActionLog messages={messages} />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2.5">
        {messages.map((msg) =>
          msg.from === "bot" ? (
            <BotBubble
              key={msg.id}
              msg={msg}
              isLatest={msg.id === latestBotId}
              onFeedback={handleFeedback}
              onSend={sendMessage}
            />
          ) : (
            <UserBubble key={msg.id} msg={msg} onEdit={handleEdit} />
          )
        )}
        {loading && <SkeletonBubble loadingText={loadingText} seconds={loadingSeconds} />}
        {/* Cancel button during loading */}
        {loading && (
          <button
            onClick={cancelRequest}
            className="self-start flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 transition-colors px-1"
            aria-label="Avbryt anrop"
          >
            <Square className="w-2.5 h-2.5" />
            Avbryt
          </button>
        )}
      </div>

      {/* Quick buttons */}
      <div className="border-t">
        <div className="flex items-center gap-1.5 px-3 py-2">
          <button
            onClick={() => sendMessage("Briefing")}
            disabled={loading}
            className="bg-[var(--brand-primary)] text-white rounded-md border border-[var(--brand-primary)] px-3.5 py-1.5 text-xs font-medium hover:opacity-90 transition-all disabled:opacity-40"
          >
            Briefing
          </button>
          <button
            onClick={() => sendMessage("Leads idag")}
            disabled={loading}
            className="bg-card text-foreground border rounded-md px-3.5 py-1.5 text-xs font-medium hover:bg-accent transition-all disabled:opacity-40"
          >
            Leads
          </button>
          <button
            onClick={() => sendMessage("Visa status")}
            disabled={loading}
            className="bg-card text-foreground border rounded-md px-3.5 py-1.5 text-xs font-medium hover:bg-accent transition-all disabled:opacity-40"
          >
            Status
          </button>
          {contextButtons.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="bg-secondary text-muted-foreground rounded-md w-[30px] h-[30px] flex items-center justify-center text-sm font-medium hover:bg-accent transition-all ml-auto shrink-0"
            >
              {expanded ? "x" : "..."}
            </button>
          )}
        </div>
        <div
          className="overflow-hidden transition-all duration-200 ease-in-out"
          style={{ maxHeight: expanded ? 120 : 0, opacity: expanded ? 1 : 0 }}
        >
          <div className="flex flex-wrap gap-1.5 px-3 pb-2">
            {contextButtons.map((label) => (
              <button
                key={label}
                onClick={() => sendMessage(label)}
                disabled={loading}
                className="bg-secondary text-secondary-foreground border rounded-md px-3 py-1.5 text-xs hover:bg-accent hover:text-foreground transition-all disabled:opacity-40"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="relative border-t p-3">
        {/* Slash menu (S1) */}
        {showSlashMenu && filteredCommands.length > 0 && (
          <div
            className="absolute bottom-full left-3 right-3 mb-1 bg-popover border rounded-xl shadow-lg overflow-hidden"
            role="listbox"
            aria-label="Kommandon"
          >
            {filteredCommands.map((cmd, idx) => (
              <button
                key={cmd.cmd}
                role="option"
                aria-selected={idx === slashIndex}
                onMouseDown={(e) => { e.preventDefault(); selectSlashCommand(cmd) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  idx === slashIndex ? "bg-accent text-foreground" : "hover:bg-accent/50 text-foreground"
                }`}
              >
                <span className="font-mono text-xs font-medium w-24 shrink-0">{cmd.cmd}</span>
                <span className="text-xs text-muted-foreground truncate">{cmd.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Skriv till Seniorita... (/ för kommandon)"
            disabled={loading}
            className="flex-1 text-sm px-3 py-2 rounded-md border bg-card text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:bg-secondary disabled:text-muted-foreground"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--brand-primary)] text-white hover:opacity-90 transition-colors disabled:bg-secondary disabled:text-muted-foreground"
          >
            Skicka
          </button>
        </div>
      </div>
    </div>
  )
}
