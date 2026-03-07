// Token-hantering
export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scopes: string[];
  metadata: Record<string, unknown>; // provider-specifikt (ad_account_id etc)
}

export interface ConnectionStatus {
  valid: boolean;
  expiresAt?: Date;
  scopes?: string[];
  error?: string;
}

export interface RateLimitInfo {
  remaining: number;
  resetAt: Date;
  limit: number;
}

// Normaliserat event-format — resten av systemet pratar aldrig direkt med Meta/Google
export type NormalizedEventType = 
  | "campaign.created"
  | "campaign.updated" 
  | "campaign.ended"
  | "campaign.rejected"
  | "payment.failed"
  | "account.disconnected";

export interface NormalizedEvent {
  type: NormalizedEventType;
  provider: IntegrationProvider;
  franchiseeId: string;
  organizationId: string;
  campaignId?: string;
  data: Record<string, unknown>;
  occurredAt: Date;
  externalEventId: string; // för idempotency
}

// Campaign-operationer
export interface CampaignParams {
  name: string;
  startDate: Date;
  endDate: Date;
  budgetCents: number;
  currency: string;
  targetAudience?: Record<string, unknown>;
  creativeUrl?: string;
}

export interface ExternalCampaignRef {
  provider: IntegrationProvider;
  externalId: string;
  url?: string;
}

export interface MetricsBatch {
  date: Date;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  reach: number;
}

// Capabilities (feature detection — inga if/else-kedjor)
export type IntegrationCapability =
  | "campaigns:create"
  | "campaigns:read"
  | "campaigns:update"
  | "metrics:read"
  | "audiences:create"
  | "creatives:upload"
  | "oauth:refresh";

export type IntegrationProvider = "meta" | "google" | "email" | "sms";

// Huvud-interfacet — alla adapters implementerar detta
export interface IntegrationAdapter {
  readonly provider: IntegrationProvider;
  readonly version: string;
  readonly capabilities: IntegrationCapability[];

  // Auth
  getOAuthUrl(state: OAuthState): Promise<string>;
  exchangeCode(code: string, state: OAuthState): Promise<TokenSet>;
  refreshToken(tokens: TokenSet): Promise<TokenSet>;
  revokeAccess(tokens: TokenSet): Promise<void>;

  // Health
  validateConnection(tokens: TokenSet): Promise<ConnectionStatus>;
  getRateLimitStatus(tokens: TokenSet): Promise<RateLimitInfo>;

  // Campaign (optional — kolla capabilities)
  createCampaign?(params: CampaignParams, tokens: TokenSet): Promise<ExternalCampaignRef>;
  updateCampaign?(id: string, params: Partial<CampaignParams>, tokens: TokenSet): Promise<void>;
  pauseCampaign?(id: string, tokens: TokenSet): Promise<void>;
  fetchMetrics?(ref: ExternalCampaignRef, dateRange: DateRange, tokens: TokenSet): Promise<MetricsBatch[]>;

  // Webhook
  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): Promise<boolean>;
  processWebhookEvent(rawBody: string, headers: Record<string, string>): Promise<NormalizedEvent>;
}

export interface OAuthState {
  organizationId: string;
  franchiseeId?: string;
  redirectUri: string;
  nonce: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}
