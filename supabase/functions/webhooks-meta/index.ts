import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
}

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

async function verifyMetaSignature(rawBody: string, signature: string, appSecret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody))
  const expected = "sha256=" + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")
  return timingSafeEqual(expected, signature)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // 1. Read RAW body BEFORE JSON parse (required for signature verification)
  const rawBody = await req.text()

  // 2. Verify signature FIRST
  const signature = req.headers.get("x-hub-signature-256") ?? ""
  const appSecret = Deno.env.get("META_APP_SECRET") ?? ""

  if (appSecret && !await verifyMetaSignature(rawBody, signature, appSecret)) {
    console.error("Meta webhook signature verification failed")
    return new Response("Forbidden", { status: 403 })
  }

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  // 3. Parse JSON body
  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody)
  } catch {
    console.error("Failed to parse webhook body as JSON")
    return new Response("Bad Request", { status: 400 })
  }

  // Extract external event ID for idempotency
  const externalEventId = (event.entry as Array<{ id: string }>)?.[0]?.id ?? crypto.randomUUID()
  
  // Determine event type from Meta webhook structure
  const eventObject = (event.object as string) ?? "unknown"
  const changes = (event.entry as Array<{ changes?: Array<{ field: string }> }>)?.[0]?.changes ?? []
  const eventType = changes.length > 0 
    ? `${eventObject}.${changes[0].field}` 
    : `${eventObject}.updated`

  // 4. Idempotency: store in webhook_events table
  const { error } = await supabase.from("webhook_events").insert({
    provider: "meta",
    external_event_id: externalEventId,
    event_type: eventType,
    payload: event,
    status: "pending",
  })

  // Handle duplicate events gracefully
  if (error?.code === "23505") {
    console.log("Duplicate webhook event received, ignoring:", externalEventId)
    return new Response("OK", { status: 200, headers: corsHeaders })
  }

  if (error) {
    console.error("Failed to store webhook event:", error)
    // Still return 200 to prevent Meta from retrying
    return new Response("OK", { status: 200, headers: corsHeaders })
  }

  console.log("Meta webhook event stored:", externalEventId, eventType)

  // 5. Return 200 IMMEDIATELY (async processing happens via database triggers/workers)
  return new Response("OK", { status: 200, headers: corsHeaders })
})
