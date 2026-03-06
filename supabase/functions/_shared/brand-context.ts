// Central Brand Context Helper
// Used by all edge functions that need brand profile data
// Schema version: 2 - Added context_version for cache invalidation

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const BRAND_CONTEXT_SCHEMA_VERSION = 2;

export interface BrandContext {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  tone_of_voice: string;
  brand_archetype: string | null;
  mission_statement: string | null;
  target_audience_desc: string | null;
  banned_words: string[];
  required_phrases: string[];
  primary_color: string | null;
  secondary_color: string | null;
  tone_traits: {
    formality?: number;
    emotion?: number;
    volume?: number;
    modernity?: number;
  } | null;
  brief: {
    why_now?: any;
    goals?: string[];
    problems?: string[];
    priorities?: any[];
  } | null;
  strategy: {
    mission?: string;
    vision?: string;
    positioning?: any;
  } | null;
  insights: {
    customer?: any[];
    internal?: any[];
    competitor?: any[];
  } | null;
  /** Version number that increments on profile updates */
  context_version: number;
  /** Schema version for compatibility checks */
  schema_version: number;
}

export interface BrandContextOptions {
  userId?: string;
  brandProfileId?: string;
  includeCompetitors?: boolean;
  includeGuardrails?: boolean;
}

/**
 * Fetches brand context for AI prompt injection
 * Can fetch by userId (gets default profile) or by specific brandProfileId
 */
export async function getBrandContext(
  supabase: any,
  options: BrandContextOptions
): Promise<BrandContext | null> {
  const { userId, brandProfileId, includeCompetitors, includeGuardrails } = options;

  try {
    let query = supabase
      .from("brand_profiles")
      .select("*");

    if (brandProfileId) {
      query = query.eq("id", brandProfileId);
    } else if (userId) {
      // Get default or first active profile for user
      query = query.eq("user_id", userId).eq("is_active", true);
    } else {
      console.warn("getBrandContext: No userId or brandProfileId provided");
      return null;
    }

    const { data: profiles, error } = await query.order("is_default", { ascending: false }).limit(1);

    if (error) {
      console.error("Error fetching brand profile:", error);
      return null;
    }

    if (!profiles || profiles.length === 0) {
      console.log("No brand profile found");
      return null;
    }

    const profile = profiles[0];

    const context: BrandContext = {
      id: profile.id,
      name: profile.name,
      slug: profile.slug,
      tagline: profile.tagline,
      tone_of_voice: profile.tone_of_voice,
      brand_archetype: profile.brand_archetype,
      mission_statement: profile.mission_statement,
      target_audience_desc: profile.target_audience_desc,
      banned_words: profile.banned_words || [],
      required_phrases: profile.required_phrases || [],
      primary_color: profile.primary_color,
      secondary_color: profile.secondary_color,
      tone_traits: profile.tone_traits,
      brief: profile.brief,
      strategy: profile.strategy,
      insights: profile.insights,
      context_version: profile.context_version ?? 1,
      schema_version: BRAND_CONTEXT_SCHEMA_VERSION,
    };

    return context;
  } catch (error) {
    console.error("Error in getBrandContext:", error);
    return null;
  }
}

/**
 * BrandContextV1 - New structured format for brand context
 */
export interface BrandContextV1 {
  schema_version: 1;
  brand_id: string;
  context_version: number;
  identity: {
    name: string;
    tagline?: string;
    archetype?: string;
  };
  voice: {
    tone: string;
    traits?: Record<string, unknown>;
    banned_words?: string[];
    required_phrases?: string[];
  };
  strategy: {
    mission?: string;
    vision?: string;
    positioning?: string;
    audience?: string;
  };
  defaults: {
    headline: string;
    body: string;
  };
}

/**
 * Normalized brand structure for internal use
 */
interface NormalizedBrand {
  name: string;
  tagline?: string;
  archetype?: string;
  tone: string;
  tone_traits?: Record<string, unknown>;
  mission?: string;
  vision?: string;
  positioning?: string;
  audience?: string;
  banned_words: string[];
  required_phrases: string[];
  defaults: { headline: string; body: string };
  goals?: string[];
}

/**
 * Normalizes both legacy BrandContext and BrandContextV1 to a unified structure
 */
function normalizeToV1(ctx: BrandContextV1 | BrandContext): NormalizedBrand {
  const isV1 = (ctx as BrandContextV1).schema_version === 1 &&
               'identity' in ctx &&
               'voice' in ctx;

  if (isV1) {
    const v1 = ctx as BrandContextV1;
    return {
      name: v1.identity.name,
      tagline: v1.identity.tagline,
      archetype: v1.identity.archetype,
      tone: v1.voice.tone,
      tone_traits: v1.voice.traits,
      mission: v1.strategy.mission,
      vision: v1.strategy.vision,
      positioning: v1.strategy.positioning,
      audience: v1.strategy.audience,
      banned_words: v1.voice.banned_words ?? [],
      required_phrases: v1.voice.required_phrases ?? [],
      defaults: v1.defaults,
      goals: undefined,
    };
  }

  // Legacy format
  const lg = ctx as BrandContext;
  const pos = typeof lg.strategy?.positioning === 'string'
    ? lg.strategy.positioning
    : (lg.strategy?.positioning as Record<string, unknown>)?.statement as string | undefined;

  return {
    name: lg.name,
    tagline: lg.tagline ?? undefined,
    archetype: lg.brand_archetype ?? undefined,
    tone: lg.tone_of_voice || 'klar, varm och förtroendeingivande',
    tone_traits: lg.tone_traits ?? undefined,
    mission: lg.mission_statement ?? lg.strategy?.mission,
    vision: lg.strategy?.vision,
    positioning: pos,
    audience: lg.target_audience_desc ?? undefined,
    banned_words: lg.banned_words ?? [],
    required_phrases: lg.required_phrases ?? [],
    defaults: {
      headline: lg.tagline || lg.name || 'Upptäck mer',
      body: lg.mission_statement || 'Vi hjälper dig att lyckas.',
    },
    goals: lg.brief?.goals,
  };
}

/**
 * Generates a prompt section for brand context injection.
 * Supports both legacy BrandContext and the newer BrandContextV1 format.
 * - Limits lists to prevent prompt bloat
 * - Trims long strings
 * - Omits empty sections entirely
 * - Includes defaults section for LLM fallbacks
 */
export function formatBrandContextForPrompt(
  context: BrandContextV1 | BrandContext | null
): string {
  if (!context) return '';

  const MAX_LIST_ITEMS = 8;
  const MAX_TEXT = 140;
  const MAX_HEADLINE = 60;

  const trim = (s?: string, max = MAX_TEXT) =>
    s ? (s.length > max ? s.slice(0, max - 3) + '...' : s) : '';

  const c = normalizeToV1(context);
  const out: string[] = [];

  // Identity
  out.push(`VARUMÄRKE: ${c.name}`);
  if (c.tagline) out.push(`TAGLINE: ${trim(c.tagline)}`);
  if (c.archetype) out.push(`ARKETYP: ${c.archetype}`);

  // Voice
  out.push(`TONALITET: ${trim(c.tone)}`);
  if (c.tone_traits && typeof c.tone_traits === 'object') {
    const t = c.tone_traits as Record<string, unknown>;
    const traits: string[] = [];
    if (typeof t.formality === 'number')
      traits.push(t.formality > 50 ? 'formell' : 'informell');
    if (typeof t.emotion === 'number')
      traits.push(t.emotion > 50 ? 'emotionell' : 'saklig');
    if (typeof t.modernity === 'number')
      traits.push(t.modernity > 50 ? 'modern' : 'klassisk');
    if (traits.length) out.push(`TONKARAKTÄR: ${traits.join(', ')}`);
  }

  // Strategy
  if (c.audience) out.push(`MÅLGRUPP: ${trim(c.audience)}`);
  if (c.mission) out.push(`MISSION: ${trim(c.mission)}`);
  if (c.vision) out.push(`VISION: ${trim(c.vision)}`);
  if (c.positioning) out.push(`POSITIONERING: ${trim(c.positioning)}`);

  // Goals (legacy only)
  if (c.goals?.length) {
    out.push(`MÅL: ${c.goals.slice(0, 3).map(g => trim(g, 50)).join(', ')}`);
  }

  // Guardrails
  if (c.banned_words.length) {
    out.push(`FÖRBJUDNA ORD: ${c.banned_words.slice(0, MAX_LIST_ITEMS).join(', ')}`);
  }
  if (c.required_phrases.length) {
    out.push(`NYCKELFRASER: ${c.required_phrases.slice(0, MAX_LIST_ITEMS).join(', ')}`);
  }

  // Defaults for LLM fallback
  out.push(`DEFAULT RUBRIK: ${trim(c.defaults.headline, MAX_HEADLINE)}`);
  out.push(`DEFAULT TEXT: ${trim(c.defaults.body)}`);

  return out.join('\n');
}

/**
 * Creates Supabase client with service role for admin operations
 */
export function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey);
}
