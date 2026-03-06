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
export type CampaignChannel = 'facebook' | 'instagram' | 'google' | 'print' | 'display'

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
  | 'google_display' | 'google_search'
  | 'print_a4' | 'print_a5' | 'print_a3'
  | 'email_header'

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
