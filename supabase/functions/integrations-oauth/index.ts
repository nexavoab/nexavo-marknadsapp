import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface OAuthConfig {
  clientId: string
  clientSecret: string
  authorizeUrl: string
  tokenUrl: string
  scopes: string[]
  redirectUri: string
}

function getProviderConfig(provider: string): OAuthConfig | null {
  const baseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const redirectUri = `${baseUrl}/functions/v1/integrations-oauth?action=callback&provider=${provider}`

  switch (provider) {
    case "meta":
      return {
        clientId: Deno.env.get("META_APP_ID") ?? "",
        clientSecret: Deno.env.get("META_APP_SECRET") ?? "",
        authorizeUrl: "https://www.facebook.com/v18.0/dialog/oauth",
        tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
        scopes: ["ads_management", "ads_read", "business_management"],
        redirectUri,
      }
    case "google":
      return {
        clientId: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
        clientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
        authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes: ["https://www.googleapis.com/auth/adwords"],
        redirectUri,
      }
    default:
      return null
  }
}

async function encryptToken(token: string): Promise<string> {
  // In production, use proper encryption with a key from secrets
  // For now, base64 encode (replace with actual encryption)
  return btoa(token)
}

async function decryptToken(encrypted: string): Promise<string> {
  // In production, use proper decryption
  return atob(encrypted)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const provider = url.searchParams.get("provider")
  const action = url.searchParams.get("action")

  if (!provider || !["meta", "google"].includes(provider)) {
    return new Response(JSON.stringify({ error: "Invalid provider" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const config = getProviderConfig(provider)
  if (!config) {
    return new Response(JSON.stringify({ error: "Provider not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  // ============================================
  // ACTION: INITIATE OAuth flow
  // ============================================
  if (action === "initiate") {
    // Get organization ID from request body or auth
    let organizationId: string | null = null
    try {
      const body = await req.json()
      organizationId = body.organizationId
    } catch {
      // Try to get from auth header
      const authHeader = req.headers.get("authorization")
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))
        if (user) {
          const { data: membership } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", user.id)
            .single()
          organizationId = membership?.organization_id
        }
      }
    }

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "Organization ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Generate state token for CSRF protection
    const state = btoa(JSON.stringify({
      nonce: crypto.randomUUID(),
      organizationId,
      provider,
      timestamp: Date.now(),
    }))

    // Store state in database for validation
    await supabase.from("oauth_states").insert({
      state_token: state,
      provider,
      organization_id: organizationId,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min expiry
    })

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(" "),
      response_type: "code",
      state,
    })

    // Provider-specific params
    if (provider === "google") {
      params.set("access_type", "offline")
      params.set("prompt", "consent")
    }

    const authUrl = `${config.authorizeUrl}?${params.toString()}`

    return new Response(JSON.stringify({ url: authUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // ============================================
  // ACTION: CALLBACK from OAuth provider
  // ============================================
  if (action === "callback") {
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    const error = url.searchParams.get("error")

    if (error) {
      // Redirect to error page
      const frontendUrl = Deno.env.get("FRONTEND_URL") ?? "http://localhost:5173"
      return Response.redirect(`${frontendUrl}/hq/integrations?error=${error}`)
    }

    if (!code || !state) {
      return new Response(JSON.stringify({ error: "Missing code or state" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Validate state token
    const { data: stateData, error: stateError } = await supabase
      .from("oauth_states")
      .select("*")
      .eq("state_token", state)
      .single()

    if (stateError || !stateData) {
      return new Response(JSON.stringify({ error: "Invalid state token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Delete used state token
    await supabase.from("oauth_states").delete().eq("state_token", state)

    // Check expiry
    if (new Date(stateData.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "State token expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", await tokenResponse.text())
      const frontendUrl = Deno.env.get("FRONTEND_URL") ?? "http://localhost:5173"
      return Response.redirect(`${frontendUrl}/hq/integrations?error=token_exchange_failed`)
    }

    const tokens = await tokenResponse.json()

    // Encrypt tokens before storage
    const encryptedAccessToken = await encryptToken(tokens.access_token)
    const encryptedRefreshToken = tokens.refresh_token 
      ? await encryptToken(tokens.refresh_token) 
      : null

    // Store/update integration
    const { error: upsertError } = await supabase
      .from("integrations")
      .upsert({
        organization_id: stateData.organization_id,
        provider,
        status: "active",
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expires_at: tokens.expires_in 
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        scopes: config.scopes,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "organization_id,provider",
      })

    if (upsertError) {
      console.error("Failed to store integration:", upsertError)
      const frontendUrl = Deno.env.get("FRONTEND_URL") ?? "http://localhost:5173"
      return Response.redirect(`${frontendUrl}/hq/integrations?error=storage_failed`)
    }

    // Redirect to success page
    const frontendUrl = Deno.env.get("FRONTEND_URL") ?? "http://localhost:5173"
    return Response.redirect(`${frontendUrl}/hq/integrations?success=true&provider=${provider}`)
  }

  // ============================================
  // ACTION: REFRESH tokens
  // ============================================
  if (action === "refresh") {
    // Get organization ID from auth
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Get integration
    const { data: integration } = await supabase
      .from("integrations")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .eq("provider", provider)
      .single()

    if (!integration || !integration.refresh_token_encrypted) {
      return new Response(JSON.stringify({ error: "No refresh token available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Decrypt refresh token
    const refreshToken = await decryptToken(integration.refresh_token_encrypted)

    // Refresh tokens
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!tokenResponse.ok) {
      console.error("Token refresh failed:", await tokenResponse.text())
      // Mark integration as needing reauth
      await supabase
        .from("integrations")
        .update({ status: "expired" })
        .eq("id", integration.id)

      return new Response(JSON.stringify({ error: "Token refresh failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const tokens = await tokenResponse.json()

    // Encrypt and store new tokens
    const encryptedAccessToken = await encryptToken(tokens.access_token)
    const encryptedRefreshToken = tokens.refresh_token 
      ? await encryptToken(tokens.refresh_token) 
      : integration.refresh_token_encrypted

    await supabase
      .from("integrations")
      .update({
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expires_at: tokens.expires_in 
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
