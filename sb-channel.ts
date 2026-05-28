#!/usr/bin/env bun
/**
 * SB Channel - Claude Code Channel-server for Seniorbolaget
 *
 * Tar emot HTTP POST från SB Shell (via Cloudflare Tunnel) och n8n (via Docker),
 * vidarebefordrar till Claude Code som channel-event, och returnerar Claudes svar
 * som HTTP-response (synkront request-response-mönster).
 *
 * Arkitektur:
 *   SB Shell (seniorbolaget.nexavo.app/api/chat) -> Cloudflare Tunnel -> localhost:8788
 *   n8n (Docker) -> 172.17.0.1:8788
 *   Denna server -> Claude Code (via stdio MCP)
 *   Claude Code -> reply tool -> HTTP response tillbaka till anroparen
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

// --- Konfiguration -----------------------------------------------------------
const PORT = parseInt(process.env.SB_CHANNEL_PORT || '8788', 10)
const AUTH_TOKEN = process.env.SB_CHANNEL_TOKEN || ''
const REPLY_TIMEOUT_MS = 300_000 // 5 min timeout - MCP-anrop (Meta+Sheets+Placid) kan ta tid

// --- Pending requests: väntar på svar från Claude ----------------------------
// När en HTTP POST kommer in skapas en Promise. När Claude anropar reply-tool
// resolvas den med svarstexten, som returneras som HTTP-response.
type PendingRequest = {
  resolve: (text: string) => void
  timer: ReturnType<typeof setTimeout>
}
const pending = new Map<string, PendingRequest>()
let nextId = 1

// --- MCP Server (Channel) ----------------------------------------------------
const mcp = new Server(
  { name: 'sb-channel', version: '1.0.0' },
  {
    capabilities: {
      experimental: { 'claude/channel': {} },
      tools: {},
    },
    instructions: [
      'Du är Seniorita, Seniorbolagets AI-assistent.',
      'Meddelanden från användare kommer som <channel source="sb-channel" chat_id="..." user_id="...">.',
      'Svara ALLTID med reply-verktyget. Skicka chat_id från taggen.',
      'Svara på svenska. Koncist och direkt. Inga em-dash.',
      'Följ instruktionerna i CLAUDE.md för tonlåge, brand guidelines och annonsregler.',
    ].join(' '),
  },
)

// --- Reply tool: Claude anropar detta för att skicka svar --------------------
mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'reply',
      description: 'Skicka svar tillbaka till användaren via SB Channel',
      inputSchema: {
        type: 'object' as const,
        properties: {
          chat_id: {
            type: 'string',
            description: 'Konversations-ID från channel-taggen',
          },
          text: {
            type: 'string',
            description: 'Svarsmeddelandet (på svenska)',
          },
        },
        required: ['chat_id', 'text'],
      },
    },
  ],
}))

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === 'reply') {
    const { chat_id, text } = req.params.arguments as {
      chat_id: string
      text: string
    }

    // Resolva den väntande HTTP-requesten
    const p = pending.get(chat_id)
    if (p) {
      clearTimeout(p.timer)
      pending.delete(chat_id)
      p.resolve(text)
    }

    return { content: [{ type: 'text', text: 'sent' }] }
  }
  throw new Error(`Okänt verktyg: ${req.params.name}`)
})

// --- Anslut till Claude Code via stdio ---------------------------------------
await mcp.connect(new StdioServerTransport())

// --- HTTP-server -------------------------------------------------------------
Bun.serve({
  port: PORT,
  // Binder till alla interface så att Docker-containers (n8n) kan nå via 172.17.0.1
  // Auth-token skyddar mot obehörig åtkomst
  hostname: '0.0.0.0',
  idleTimeout: 0,

  async fetch(req) {
    const url = new URL(req.url)

    // --- Healthcheck ---------------------------------------------------------
    if (req.method === 'GET' && url.pathname === '/health') {
      return Response.json({ status: 'ok', pending: pending.size })
    }

    // --- Chat endpoint -------------------------------------------------------
    if (req.method === 'POST' && (url.pathname === '/chat' || url.pathname === '/api/chat')) {
      // Auth-check (om token är konfigurerad)
      if (AUTH_TOKEN) {
        const authHeader = req.headers.get('Authorization') || ''
        const token = authHeader.replace('Bearer ', '')
        if (token !== AUTH_TOKEN) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
      }

      // Parsa request body
      let message: string
      let userId: string
      try {
        const body = await req.json()
        message = body.message || body.input || ''
        userId = body.user_id || 'anonymous'
      } catch {
        return Response.json(
          { error: 'Ogiltig JSON. Förväntat: { "message": "text", "user_id": "id" }' },
          { status: 400 },
        )
      }

      if (!message.trim()) {
        return Response.json({ error: 'Tomt meddelande' }, { status: 400 })
      }

      // Skapa ett unikt chat_id för denna request
      const chatId = String(nextId++)

      // Skapa en Promise som resolvas när Claude anropar reply-tool
      const replyPromise = new Promise<string>((resolve) => {
        const timer = setTimeout(() => {
          pending.delete(chatId)
          resolve('Tyvärr, jag kunde inte svara i tid. Försök igen.')
        }, REPLY_TIMEOUT_MS)

        pending.set(chatId, { resolve, timer })
      })

      // Skicka meddelandet till Claude som channel-event
      await mcp.notification({
        method: 'notifications/claude/channel',
        params: {
          content: message,
          meta: {
            chat_id: chatId,
            user_id: userId,
            path: url.pathname,
          },
        },
      })

      // Vänta på Claudes svar (eller timeout)
      const reply = await replyPromise

      return Response.json({ reply, chat_id: chatId })
    }

    // --- 404 för allt annat --------------------------------------------------
    return Response.json(
      { error: 'Inte hittad. Använd POST /chat eller GET /health' },
      { status: 404 },
    )
  },
})

// Logga till stderr (stdout är reserverad för MCP stdio-transport)
console.error(`[sb-channel] Lyssnar på port ${PORT}`)
console.error(`[sb-channel] Auth: ${AUTH_TOKEN ? 'aktiverad' : 'INGEN (alla kan anropa)'}`)
