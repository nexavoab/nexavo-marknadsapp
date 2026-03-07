import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface GooglePubSubMessage {
  message: {
    data: string
    messageId: string
    publishTime: string
    attributes?: Record<string, string>
  }
  subscription: string
}

async function verifyGoogleJWT(authHeader: string): Promise<boolean> {
  // Google Pub/Sub sends JWT in Authorization header as "Bearer <token>"
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false
  }

  const token = authHeader.slice(7)
  
  // For production: verify JWT signature against Google's public keys
  // See: https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions
  
  try {
    // Decode JWT payload (without verification for now - add JWKS verification in production)
    const parts = token.split(".")
    if (parts.length !== 3) return false
    
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")))
    
    // Verify issuer and audience
    const expectedAudience = Deno.env.get("GOOGLE_PUBSUB_AUDIENCE") ?? ""
    if (expectedAudience && payload.aud !== expectedAudience) {
      console.error("Google Pub/Sub JWT audience mismatch")
      return false
    }
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      console.error("Google Pub/Sub JWT expired")
      return false
    }
    
    // Verify issuer is Google
    if (!payload.iss?.includes("accounts.google.com")) {
      console.error("Google Pub/Sub JWT issuer invalid")
      return false
    }
    
    return true
  } catch (e) {
    console.error("Failed to verify Google JWT:", e)
    return false
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // 1. Verify Google Pub/Sub JWT signature
  const authHeader = req.headers.get("authorization") ?? ""
  const googleSecret = Deno.env.get("GOOGLE_PUBSUB_SECRET") ?? ""
  
  if (googleSecret && !await verifyGoogleJWT(authHeader)) {
    console.error("Google webhook JWT verification failed")
    return new Response("Forbidden", { status: 403 })
  }

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  // 2. Parse request body
  let pubsubMessage: GooglePubSubMessage
  try {
    pubsubMessage = await req.json()
  } catch {
    console.error("Failed to parse Google Pub/Sub message")
    return new Response("Bad Request", { status: 400 })
  }

  // 3. Decode base64 message data
  let eventData: Record<string, unknown>
  try {
    const decodedData = atob(pubsubMessage.message.data)
    eventData = JSON.parse(decodedData)
  } catch {
    console.error("Failed to decode Pub/Sub message data")
    return new Response("Bad Request", { status: 400 })
  }

  // Extract external event ID for idempotency
  const externalEventId = pubsubMessage.message.messageId ?? crypto.randomUUID()
  
  // Determine event type from Google Ads webhook structure
  const resourceName = (eventData.resourceName as string) ?? ""
  const changeType = (eventData.changeEventType as string) ?? "UPDATED"
  const resourceType = resourceName.split("/")[0] ?? "unknown"
  const eventType = `${resourceType}.${changeType.toLowerCase()}`

  // 4. Idempotency: store in webhook_events table
  const { error } = await supabase.from("webhook_events").insert({
    provider: "google",
    external_event_id: externalEventId,
    event_type: eventType,
    payload: {
      message: eventData,
      attributes: pubsubMessage.message.attributes,
      publishTime: pubsubMessage.message.publishTime,
      subscription: pubsubMessage.subscription,
    },
    status: "pending",
  })

  // Handle duplicate events gracefully
  if (error?.code === "23505") {
    console.log("Duplicate webhook event received, ignoring:", externalEventId)
    return new Response("OK", { status: 200, headers: corsHeaders })
  }

  if (error) {
    console.error("Failed to store webhook event:", error)
    // Still return 200 to prevent Google from retrying
    return new Response("OK", { status: 200, headers: corsHeaders })
  }

  console.log("Google webhook event stored:", externalEventId, eventType)

  // 5. Return 200 IMMEDIATELY (async processing happens via database triggers/workers)
  return new Response("OK", { status: 200, headers: corsHeaders })
})
