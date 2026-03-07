import type {
  IntegrationAdapter,
  IntegrationProvider,
  IntegrationCapability,
  TokenSet,
  ConnectionStatus,
  RateLimitInfo,
  OAuthState,
  CampaignParams,
  ExternalCampaignRef,
  MetricsBatch,
  DateRange,
  NormalizedEvent,
} from "../types";

const META_API_BASE = "https://graph.facebook.com/v19.0";

export class MetaAdapter implements IntegrationAdapter {
  readonly provider: IntegrationProvider = "meta";
  readonly version = "1.0.0";
  readonly capabilities: IntegrationCapability[] = [
    "campaigns:create",
    "campaigns:read",
    "campaigns:update",
    "metrics:read",
    "oauth:refresh",
  ];

  // OAuth
  async getOAuthUrl(state: OAuthState): Promise<string> {
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_META_APP_ID ?? "",
      redirect_uri: state.redirectUri,
      scope: "ads_management,ads_read,business_management",
      state: JSON.stringify({ ...state, nonce: state.nonce }),
      response_type: "code",
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
  }

  async exchangeCode(code: string, state: OAuthState): Promise<TokenSet> {
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_META_APP_ID ?? "",
      client_secret: import.meta.env.META_APP_SECRET ?? "",
      redirect_uri: state.redirectUri,
      code,
    });

    const res = await fetch(`${META_API_BASE}/oauth/access_token?${params}`);
    if (!res.ok) throw new Error(`Meta OAuth failed: ${await res.text()}`);
    const data = await res.json();

    // Byt mot long-lived token
    const llParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: import.meta.env.VITE_META_APP_ID ?? "",
      client_secret: import.meta.env.META_APP_SECRET ?? "",
      fb_exchange_token: data.access_token,
    });

    const llRes = await fetch(`${META_API_BASE}/oauth/access_token?${llParams}`);
    const llData = await llRes.json();

    return {
      accessToken: llData.access_token,
      expiresAt: new Date(Date.now() + (llData.expires_in ?? 5184000) * 1000),
      scopes: ["ads_management", "ads_read", "business_management"],
      metadata: {},
    };
  }

  async refreshToken(tokens: TokenSet): Promise<TokenSet> {
    // Meta long-lived tokens kan inte refreshas med refresh_token
    // Istället: extended token (60 dagar) — byt ut access_token
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: import.meta.env.VITE_META_APP_ID ?? "",
      client_secret: import.meta.env.META_APP_SECRET ?? "",
      fb_exchange_token: tokens.accessToken,
    });

    const res = await fetch(`${META_API_BASE}/oauth/access_token?${params}`);
    if (!res.ok) throw new Error(`Meta token refresh failed: ${await res.text()}`);
    const data = await res.json();

    return {
      ...tokens,
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + (data.expires_in ?? 5184000) * 1000),
    };
  }

  async revokeAccess(tokens: TokenSet): Promise<void> {
    await fetch(`${META_API_BASE}/me/permissions`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
  }

  async validateConnection(tokens: TokenSet): Promise<ConnectionStatus> {
    try {
      const res = await fetch(`${META_API_BASE}/me?fields=id,name`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      if (!res.ok) return { valid: false, error: `HTTP ${res.status}` };
      return { valid: true, expiresAt: tokens.expiresAt, scopes: tokens.scopes };
    } catch (e) {
      return { valid: false, error: String(e) };
    }
  }

  async getRateLimitStatus(_tokens: TokenSet): Promise<RateLimitInfo> {
    // Meta rate limits returneras i headers — lagras vid varje API-anrop
    // Returnera defaults tills vi har real data
    return { remaining: 200, resetAt: new Date(Date.now() + 3600000), limit: 200 };
  }

  // Webhook-säkerhet — HMAC-SHA256
  async verifyWebhookSignature(
    rawBody: string,
    headers: Record<string, string>
  ): Promise<boolean> {
    const signature = headers["x-hub-signature-256"] ?? "";
    const secret = import.meta.env.META_APP_SECRET ?? "";

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const expected =
      "sha256=" +
      Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    // Timing-safe comparison
    if (expected.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  }

  async processWebhookEvent(
    rawBody: string,
    _headers: Record<string, string>
  ): Promise<NormalizedEvent> {
    const event = JSON.parse(rawBody);
    // Meta webhook payload: entry[].changes[].value
    const entry = event.entry?.[0];
    const change = entry?.changes?.[0];

    return {
      type: "campaign.updated",
      provider: "meta",
      franchiseeId: change?.value?.ad_account_id ?? "unknown",
      organizationId: "unknown", // resolvas från DB via ad_account_id
      campaignId: change?.value?.campaign_id,
      data: change?.value ?? {},
      occurredAt: new Date(entry?.time ? entry.time * 1000 : Date.now()),
      externalEventId: event.id ?? `meta-${Date.now()}`,
    };
  }

  // Campaign operations
  async createCampaign(
    params: CampaignParams,
    tokens: TokenSet
  ): Promise<ExternalCampaignRef> {
    const adAccountId = String(tokens.metadata.ad_account_id ?? "");
    const res = await fetch(`${META_API_BASE}/act_${adAccountId}/campaigns`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: params.name,
        objective: "OUTCOME_AWARENESS",
        status: "PAUSED",
        special_ad_categories: [],
      }),
    });

    if (!res.ok) throw new Error(`Meta createCampaign failed: ${await res.text()}`);
    const data = await res.json();
    return {
      provider: "meta",
      externalId: data.id,
      url: `https://www.facebook.com/adsmanager/manage/campaigns?ids=${data.id}`,
    };
  }

  async fetchMetrics(
    ref: ExternalCampaignRef,
    dateRange: DateRange,
    tokens: TokenSet
  ): Promise<MetricsBatch[]> {
    const params = new URLSearchParams({
      fields: "impressions,clicks,spend,reach,actions",
      time_range: JSON.stringify({
        since: dateRange.start.toISOString().split("T")[0],
        until: dateRange.end.toISOString().split("T")[0],
      }),
      time_increment: "1",
      access_token: tokens.accessToken,
    });

    const res = await fetch(`${META_API_BASE}/${ref.externalId}/insights?${params}`);
    if (!res.ok) throw new Error(`Meta fetchMetrics failed: ${await res.text()}`);
    const data = await res.json();

    return (data.data ?? []).map(
      (d: Record<string, unknown>) => ({
        date: new Date(d.date_start as string),
        impressions: Number(d.impressions ?? 0),
        clicks: Number(d.clicks ?? 0),
        spend: Math.round(Number(d.spend ?? 0) * 100),
        conversions: Number(
          (d.actions as Array<{ action_type: string; value: string }> | undefined)?.find(
            (a) => a.action_type === "lead"
          )?.value ?? 0
        ),
        reach: Number(d.reach ?? 0),
      })
    );
  }
}
