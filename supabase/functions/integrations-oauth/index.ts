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

interface TokenData {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
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
        scopes: ["ads_management", "ads_read", "business_management", "pages_show_list"],
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
    case "linkedin":
      return {
        clientId: Deno.env.get("LINKEDIN_CLIENT_ID") ?? "",
        clientSecret: Deno.env.get("LINKEDIN_CLIENT_SECRET") ?? "",
        authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
        tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
        scopes: ["r_organization_social", "w_organization_social", "rw_organization_admin"],
        redirectUri,
      }
    case "tiktok":
      return {
        clientId: Deno.env.get("TIKTOK_CLIENT_KEY") ?? "",
        clientSecret: Deno.env.get("TIKTOK_CLIENT_SECRET") ?? "",
        authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
        tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
        scopes: ["user.info.basic", "video.publish"],
        redirectUri,
      }
    default:
      return null
  }
}

// ============================================
// Supabase Vault helpers
// ============================================

async function storeTokenInVault(
  supabaseAdmin: ReturnType<typeof createClient>,
  orgId: string,
  provider: string,
  tokenData: TokenData
): Promise<string> {
  const secretName = `oauth_${orgId}_${provider}`
  
  // Try to insert or update the secret using vault.secrets table
  // Supabase Vault stores secrets in vault.secrets
  const { data, error } = await supabaseAdmin.rpc('vault.create_secret', {
    secret: JSON.stringify(tokenData),
    name: secretName,
    description: `OAuth tokens for ${provider} - org ${orgId}`
  })

  if (error) {
    // If secret exists, update it
    if (error.message.includes('duplicate') || error.code === '23505') {
      const { data: updateData, error: updateError } = await supabaseAdmin.rpc('vault.update_secret', {
        secret: JSON.stringify(tokenData),
        name: secretName
      })
      if (updateError) {
        console.error('Failed to update vault secret:', updateError)
        throw updateError
      }
      return secretName
    }
    console.error('Failed to create vault secret:', error)
    throw error
  }
  
  return secretName
}

async function getTokenFromVault(
  supabaseAdmin: ReturnType<typeof createClient>,
  secretName: string
): Promise<TokenData | null> {
  const { data, error } = await supabaseAdmin.rpc('vault.read_secret', {
    name: secretName
  })

  if (error) {
    console.error('Failed to read vault secret:', error)
    return null
  }

  if (!data) return null
  
  try {
    return JSON.parse(data) as TokenData
  } catch {
    console.error('Failed to parse vault secret')
    return null
  }
}

async function deleteVaultSecret(
  supabaseAdmin: ReturnType<typeof createClient>,
  secretName: string
): Promise<void> {
  await supabaseAdmin.rpc('vault.delete_secret', {
    name: secretName
  })
}

// ============================================
// Provider-specific account info fetchers
// ============================================

async function fetchProviderAccountInfo(
  provider: string,
  accessToken: string
): Promise<{ accountId: string; accountName: string } | null> {
  try {
    switch (provider) {
      case "meta": {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${accessToken}`
        )
        if (!response.ok) return null
        const data = await response.json()
        return { accountId: data.id, accountName: data.name }
      }
      case "google": {
        // Google Ads uses a different endpoint
        return { accountId: "pending", accountName: "Google Ads Account" }
      }
      case "linkedin": {
        const response = await fetch(
          "https://api.linkedin.com/v2/me",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (!response.ok) return null
        const data = await response.json()
        return { accountId: data.id, accountName: `${data.localizedFirstName} ${data.localizedLastName}` }
      }
      case "tiktok": {
        return { accountId: "pending", accountName: "TikTok Account" }
      }
      default:
        return null
    }
  } catch (err) {
    console.error(`Failed to fetch ${provider} account info:`, err)
    return null
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const provider = url.searchParams.get("provider")
  const action = url.searchParams.get("action")

  if (!provider || !["meta", "google", "linkedin", "tiktok"].includes(provider)) {
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
  // ACTION: AUTHORIZE - Start OAuth flow
  // ============================================
  if (action === "authorize" || action === "initiate") {
    let organizationId: string | null = null
    
    // Try to get from body first
    try {
      const body = await req.json()
      organizationId = body.organizationId
    } catch {
      // Try to get from auth header
      const authHeader = req.headers.get("authorization")
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))
        if (user) {
          const { data: appUser } = await supabase
            .from("app_users")
            .select("organization_id")
            .eq("auth_id", user.id)
            .single()
          organizationId = appUser?.organization_id
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
    if (provider === "tiktok") {
      params.set("client_key", config.clientId)
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
    const frontendUrl = Deno.env.get("FRONTEND_URL") ?? "http://localhost:5173"

    if (error) {
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
      return Response.redirect(`${frontendUrl}/hq/integrations?error=invalid_state`)
    }

    // Delete used state token
    await supabase.from("oauth_states").delete().eq("state_token", state)

    // Check expiry
    if (new Date(stateData.expires_at) < new Date()) {
      return Response.redirect(`${frontendUrl}/hq/integrations?error=state_expired`)
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
      return Response.redirect(`${frontendUrl}/hq/integrations?error=token_exchange_failed`)
    }

    const tokens: TokenData = await tokenResponse.json()

    // Store tokens in Vault
    const secretName = await storeTokenInVault(
      supabase,
      stateData.organization_id,
      provider,
      tokens
    )

    // Fetch account info from provider
    const accountInfo = await fetchProviderAccountInfo(provider, tokens.access_token)

    // Calculate expiration
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null

    // Store/update social_connections
    const { error: upsertError } = await supabase
      .from("social_connections")
      .upsert({
        org_id: stateData.organization_id,
        provider,
        provider_account_id: accountInfo?.accountId ?? null,
        provider_account_name: accountInfo?.accountName ?? null,
        vault_secret_id: secretName,
        scopes: config.scopes,
        status: "active",
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "org_id,provider",
      })

    if (upsertError) {
      console.error("Failed to store social connection:", upsertError)
      return Response.redirect(`${frontendUrl}/hq/integrations?error=storage_failed`)
    }

    return Response.redirect(`${frontendUrl}/hq/integrations?success=true&provider=${provider}`)
  }

  // ============================================
  // ACTION: REFRESH tokens
  // ============================================
  if (action === "refresh") {
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
    const { data: appUser } = await supabase
      .from("app_users")
      .select("organization_id")
      .eq("auth_id", user.id)
      .single()

    if (!appUser?.organization_id) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Get social connection
    const { data: connection } = await supabase
      .from("social_connections")
      .select("*")
      .eq("org_id", appUser.organization_id)
      .eq("provider", provider)
      .single()

    if (!connection || !connection.vault_secret_id) {
      return new Response(JSON.stringify({ error: "No connection found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Get tokens from Vault
    const tokens = await getTokenFromVault(supabase, connection.vault_secret_id)
    if (!tokens || !tokens.refresh_token) {
      return new Response(JSON.stringify({ error: "No refresh token available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Refresh tokens
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: tokens.refresh_token,
        grant_type: "refresh_token",
      }),
    })

    if (!tokenResponse.ok) {
      console.error("Token refresh failed:", await tokenResponse.text())
      // Mark connection as expired
      await supabase
        .from("social_connections")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", connection.id)

      return new Response(JSON.stringify({ error: "Token refresh failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const newTokens: TokenData = await tokenResponse.json()
    
    // Merge with existing refresh_token if not provided
    const mergedTokens: TokenData = {
      ...newTokens,
      refresh_token: newTokens.refresh_token ?? tokens.refresh_token,
    }

    // Store new tokens in Vault
    await storeTokenInVault(supabase, appUser.organization_id, provider, mergedTokens)

    // Update social_connections
    const expiresAt = newTokens.expires_in
      ? new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
      : null

    await supabase
      .from("social_connections")
      .update({
        status: "active",
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // ============================================
  // ACTION: DISCONNECT - Revoke and remove connection
  // ============================================
  if (action === "disconnect") {
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

    const { data: appUser } = await supabase
      .from("app_users")
      .select("organization_id")
      .eq("auth_id", user.id)
      .single()

    if (!appUser?.organization_id) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Get connection
    const { data: connection } = await supabase
      .from("social_connections")
      .select("*")
      .eq("org_id", appUser.organization_id)
      .eq("provider", provider)
      .single()

    if (connection?.vault_secret_id) {
      // Delete from Vault
      await deleteVaultSecret(supabase, connection.vault_secret_id)
    }

    // Delete connection
    await supabase
      .from("social_connections")
      .delete()
      .eq("org_id", appUser.organization_id)
      .eq("provider", provider)

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
