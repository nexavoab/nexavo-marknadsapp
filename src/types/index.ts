export type UserRole = 'hq_admin' | 'franchisee'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface ToneTraits {
  formality: number    // 0-1
  modernity: number    // 0-1
  emotion: number      // 0-1
  volume: number       // 0-1
}

export interface VisualIdentityColors {
  primary: string
  secondary?: string
  accent?: string
  background?: string
  text_dark?: string
  text_light?: string
  gradient?: string
}

export interface VisualIdentityLogos {
  primary_url: string
  dark_bg_url?: string
  icon_url?: string
  svg_url?: string
  min_size_px: number
  safe_zone_percent: number
}

export interface VisualIdentityTypography {
  heading_font: string
  body_font: string
  accent_font?: string
  google_fonts_url?: string
}

export interface VisualIdentityImagery {
  style_description?: string
  forbidden_styles: string[]
  example_urls: string[]
}

export interface Brand {
  id: string
  organization_id: string
  name: string
  tone_traits: ToneTraits
  colors: VisualIdentityColors
  logos: VisualIdentityLogos
  typography: VisualIdentityTypography
  imagery: VisualIdentityImagery
  forbidden_words: string[]
  required_disclaimers: string[]
  created_at: string
  updated_at: string
}

export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'archived'
export type CampaignChannel = 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'google' | 'print' | 'display' | 'email'

export interface Campaign {
  id: string
  organization_id: string
  brand_id: string
  name: string
  description?: string
  status: CampaignStatus
  channels: CampaignChannel[]
  start_date?: string
  end_date?: string
  target_persona?: Record<string, unknown>
  key_messages: string[]
  created_by?: string
  created_at: string
  updated_at: string
}

export type TemplateFormat =
  | 'facebook_feed' | 'facebook_story'
  | 'instagram_feed' | 'instagram_story'
  | 'linkedin_post' | 'linkedin_article'
  | 'tiktok_video' | 'tiktok_spark'
  | 'google_display' | 'google_search'
  | 'print_a4' | 'print_a5' | 'print_a3' | 'print_flyer'
  | 'email_header' | 'email_newsletter'

export interface Template {
  id: string
  organization_id: string
  brand_id: string
  name: string
  format: TemplateFormat
  layout: Record<string, unknown>
  preview_url?: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export type AssetType = 'image' | 'composite' | 'copy' | 'pdf'

export interface Asset {
  id: string
  organization_id: string
  campaign_id?: string
  template_id?: string
  name: string
  type: AssetType
  format?: TemplateFormat
  storage_path: string
  public_url?: string
  thumbnail_url?: string
  dimensions?: { width: number; height: number }
  file_size_bytes?: number
  mime_type?: string
  copy_text?: string
  download_count: number
  created_at: string
  updated_at: string
}

export interface Franchisee {
  id: string
  organization_id: string
  name: string
  region?: string
  contact_email?: string
  contact_phone?: string
  address?: {
    street?: string
    city?: string
    zip?: string
    country?: string
  }
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============ Sprint 4: Campaign Types ============

export interface CampaignFormat {
  type: TemplateFormat
  copy: string
  headline: string
  cta: string
  image_prompt: string
  generated_image_url?: string
  composite_url?: string
  approved: boolean
}

export interface CampaignConcept {
  headline: string
  subheadline: string
  keyMessage: string
  visualDirection: string
  emotionalHook: string
}

export interface CampaignDraft {
  id?: string
  brand_id?: string
  name: string
  description: string
  channels: CampaignChannel[]
  start_date: string
  end_date: string
  concept?: CampaignConcept
  formats: CampaignFormat[]
  status: CampaignStatus
}

export interface AppUser {
  id: string
  auth_id: string
  organization_id: string
  franchisee_id?: string
  role: UserRole
  email: string
  name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

// ============ Sprint V2: Extended Schema (WAS-369) ============

export interface Chain {
  id: string
  organization_id: string
  name: string
  slug: string
  logo_url?: string
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface LocalVariant {
  id: string
  asset_id: string
  franchisee_id: string
  organization_id: string
  storage_path: string
  variables_snapshot: Record<string, unknown>
  generation_status: GenerationStatus
  created_at: string
  updated_at: string
}

export interface AnnualPlan {
  id: string
  organization_id: string
  brand_id: string
  year: number
  name: string
  notes?: string
  created_at: string
  updated_at: string
}

export type SlotStatus = 'planned' | 'scheduled' | 'active' | 'completed' | 'cancelled'

export interface CampaignSlot {
  id: string
  annual_plan_id: string
  organization_id: string
  campaign_id?: string
  title: string
  slot_start: string  // DATE as ISO string
  slot_end: string    // DATE as ISO string
  channels: CampaignChannel[]
  budget_sek?: number
  status: SlotStatus
  color?: string
  created_at: string
  updated_at: string
}

export interface AutomationRule {
  id: string
  organization_id: string
  name: string
  trigger: string
  trigger_conditions: Record<string, unknown>
  action: string
  action_config: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export type WebhookStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying'

export interface WebhookEvent {
  id: string
  organization_id: string
  automation_rule_id?: string
  event_type: string
  payload: Record<string, unknown>
  status: WebhookStatus
  attempts: number
  max_attempts: number
  next_retry_at?: string
  created_at: string
  updated_at: string
}
