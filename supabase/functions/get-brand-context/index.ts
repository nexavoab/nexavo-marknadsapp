import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * GET BRAND CONTEXT - Edge Function
 * 
 * ============================================
 * PAYLOAD FORMAT (REQUEST):
 * ============================================
 * POST /functions/v1/get-brand-context
 * Headers:
 *   Authorization: Bearer <supabase_access_token>
 *   Content-Type: application/json
 * 
 * Body:
 * {
 *   "brandId": string (required) - UUID of the brand_profiles record,
 *   "guideMode": "PUBLISHED" | "DRAFT" (optional, default: "PUBLISHED")
 * }
 * 
 * ============================================
 * RESPONSE FORMAT:
 * ============================================
 * Returns BrandContextV1 object with:
 * - identity: { name, mission, vision, tagline, archetype }
 * - positioning: { statement, elevator_pitch, target_audience, unique_value }
 * - tone_of_voice: { description, traits: Record<string, number>, example }
 * - audience_personas: PersonaSummary[]
 * - persona_rules: { personas, default_persona_id }
 * - active_channels: Array<{ channel, purpose }>
 * - channel_rules: ChannelRule[]
 * - recent_decisions: Array<{ question, decision, rationale, decided_by, decided_at }>
 * - facts: { services, service_areas, guarantees, key_claims, legal_notes, verified_facts }
 * - evidence: BrandEvidenceItem[]
 * - guardrails: Guardrail[]
 * - tone_rules: ToneRules
 * - forbidden_terms: string[] (matchable words/phrases)
 * - required_terms: string[] (matchable words/phrases)
 * - policy_negatives: string[] (AI prompt instructions)
 * - policy_positives: string[] (AI prompt instructions)
 * - seasonalContext: { currentDate, currentSeason, upcomingEvents }
 * - industryTrends: { lastUpdated, trends }
 * - topPerformingContent: { headlines, ctas, subjectLines }
 * - meta: { brand_id, guide_version_id, guide_mode, generated_at, completeness_score, completeness_breakdown }
 * 
 * ============================================
 * NOTE: This function uses the legacy `brand_profiles` table schema.
 * The Nexavo Marknadsapp uses a simpler `brands` table.
 * For the new app, consider creating a simplified version or
 * adapting the frontend to use this format.
 * ============================================
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

type GuideMode = "PUBLISHED" | "DRAFT";
type GuardrailSeverity = "hard" | "soft";
type GuardrailScope = "global" | "channel" | "persona" | "tone" | "claims";

interface BrandFact {
  id: string;
  claim: string;
  type: string;
  status: "verified" | "unverified" | "forbidden";
  evidence_ids: string[];
  notes?: string;
}

interface BrandEvidenceItem {
  id: string;
  title: string;
  source_type: string;
  source_ref: string;
  excerpt?: string;
  verified: boolean;
  expires_at?: string;
}

interface Guardrail {
  id: string;
  name: string;
  severity: GuardrailSeverity;
  scope: GuardrailScope;
  rule: string;
  reason?: string;
  config?: Record<string, unknown>;
  // Matchable terms for preflight
  forbidden_terms: string[];
  required_terms: string[];
}

interface ChannelRule {
  channel: string;
  purpose?: string;
  constraints: {
    max_chars?: number;
    min_chars?: number;
    required_sections?: string[];
    forbidden_sections?: string[];
    hashtag_policy?: string;
    emoji_policy?: string;
    cta_required?: boolean;
  };
  forbidden_terms: string[];
  required_terms: string[];
  rules?: Record<string, unknown>;
}

interface PersonaSummary {
  id: string;
  name: string;
  segment: string;
  summary: string;
  goals: string[];
  fears: string[];
  trust_triggers: string[];
  tone_preference: string;
}

interface ToneRules {
  target: string;
  do: string[];
  dont: string[];
  banned_words: string[];
  reading_level?: string;
}

interface BrandContextV1 {
  identity: {
    name: string;
    mission: string;
    vision: string;
    tagline: string;
    archetype: string;
  };
  positioning: {
    statement: string;
    elevator_pitch: string;
    target_audience: string;
    unique_value: string;
  };
  tone_of_voice: {
    description: string;
    traits: Record<string, number>;
    example: string;
  };
  audience_personas: PersonaSummary[];
  persona_rules: {
    personas: PersonaSummary[];
    default_persona_id?: string;
  };
  active_channels: Array<{ channel: string; purpose: string }>;
  channel_rules: ChannelRule[];
  recent_decisions: Array<{
    question: string;
    decision: string;
    rationale: string;
    decided_by: string;
    decided_at: string;
  }>;
  facts: {
    services: Array<{ name: string; description?: string }>;
    service_areas: string[];
    guarantees: string[];
    key_claims: BrandFact[];
    legal_notes: string[];
    verified_facts: Record<string, unknown>;
  };
  evidence: BrandEvidenceItem[];
  guardrails: Guardrail[];
  tone_rules: ToneRules;
  // Matchable terms for preflight (not policy text)
  forbidden_terms: string[];  // Words/phrases to match against
  required_terms: string[];   // Words/phrases that should be present
  // Policy instructions for AI prompts (human-readable)
  policy_negatives: string[]; // Instructions like "Undvik att vara för formell"
  policy_positives: string[]; // Instructions like "Var varm och personlig"
  meta: {
    brand_id: string;
    guide_version_id: string;
    guide_mode: GuideMode;
    generated_at: string;
    completeness_score: number;
    completeness_breakdown: Record<string, boolean>;
  };
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require Authorization header (401 if missing)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { brandId, guideMode = "PUBLISHED" } = await req.json();

    if (!brandId) {
      throw new Error("brandId is required");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Use anon key + user's auth token for RLS
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // First verify access to brand profile (RLS will enforce this)
    const { data: profileRaw, error: profileError } = await supabase
      .from('brand_profiles')
      .select('*')
      .eq('id', brandId)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      if (profileError.code === 'PGRST116') {
        throw new Error("Brand profile not found or access denied");
      }
      throw new Error(`Could not fetch brand profile: ${profileError.message}`);
    }

    // ============================================
    // PARENT/CHILD INHERITANCE LOGIC
    // ============================================
    let profile = profileRaw;
    let parentProfile = null;
    
    // If this is a child brand, fetch parent and merge inherited fields
    if (profileRaw.parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('brand_profiles')
        .select('*')
        .eq('id', profileRaw.parent_id)
        .single();
      
      if (!parentError && parent) {
        parentProfile = parent;
        
        // Merge inherited fields from parent
        profile = {
          ...profileRaw,
          // INHERITED fields (from parent)
          primary_color: parent.primary_color,
          secondary_color: parent.secondary_color,
          logo_url: parent.logo_url,
          brand_archetype: parent.brand_archetype,
          tone_of_voice: parent.tone_of_voice,
          tone_traits: parent.tone_traits,
          visual_identity: parent.visual_identity,
          strategy: parent.strategy,
          mission_statement: parent.mission_statement,
          banned_words: parent.banned_words || [],
          required_phrases: parent.required_phrases || [],
          // OVERRIDE fields (child if exists, else parent)
          tagline: profileRaw.tagline || parent.tagline,
          target_audience_desc: profileRaw.target_audience_desc || parent.target_audience_desc,
          // Add parent info for context
          _parent_name: parent.name,
          _is_child: true,
          _display_name: profileRaw.location_name 
            ? `${parent.name} ${profileRaw.location_name}`
            : parent.name,
        };
        
        console.log("Child brand inheritance applied:", {
          childId: brandId,
          parentId: parent.id,
          locationName: profileRaw.location_name,
        });
      }
    }

    // Get latest version ID for this brand
    const { data: latestVersion } = await supabase
      .from('brand_profile_versions')
      .select('id, version_number')
      .eq('brand_profile_id', brandId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Stable guide_version_id (no Date.now() to ensure traceability)
    const guideVersionId = latestVersion?.id || `draft_${brandId}`;

    // Parallel fetch all required data (RLS protects each table)
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const [
      personasResult,
      decisionsResult,
      factsResult,
      evidenceResult,
      guardrailsResult,
      channelPackagesResult,
      topContentResult,
      upcomingEventsResult,
      currentSeasonResult,
      trendsResult
    ] = await Promise.all([
      supabase
        .from('personas')
        .select('*')
        .eq('brand_profile_id', brandId)
        .eq('is_active', true),
      
      supabase
        .from('workshop_decisions')
        .select('*')
        .eq('brand_profile_id', brandId)
        .order('decided_at', { ascending: false })
        .limit(15),
      
      // brand_facts: one row per brand (use maybeSingle)
      supabase
        .from('brand_facts')
        .select('*')
        .eq('brand_profile_id', brandId)
        .maybeSingle(),
      
      supabase
        .from('brand_evidence')
        .select('*')
        .eq('brand_profile_id', brandId)
        .eq('is_active', true),
      
      supabase
        .from('brand_guardrails')
        .select('*')
        .eq('brand_profile_id', brandId)
        .eq('is_active', true),
      
      supabase
        .from('channel_guardrail_packages')
        .select('*')
        .eq('brand_profile_id', brandId)
        .eq('is_active', true),
      
      // Top performing content
      supabase
        .from('content_performance')
        .select('content_text, content_type, avg_ctr, times_used')
        .eq('brand_profile_id', brandId)
        .order('avg_ctr', { ascending: false })
        .limit(10),
      
      // Upcoming seasonal events (next 60 days)
      supabase
        .from('seasonal_calendar')
        .select('*')
        .gte('start_date', today)
        .lte('start_date', futureDate)
        .order('start_date', { ascending: true })
        .limit(5),
      
      // Current season
      supabase
        .from('seasonal_calendar')
        .select('*')
        .eq('event_type', 'season')
        .lte('start_date', today)
        .gte('end_date', today)
        .maybeSingle(),
      
      // Industry trends
      supabase
        .from('expert_knowledge_updates')
        .select('*')
        .lte('valid_from', today)
        .or(`valid_until.is.null,valid_until.gte.${today}`)
        .order('confidence_score', { ascending: false })
        .limit(10)
    ]);

    const personas = personasResult.data || [];
    const decisions = decisionsResult.data || [];
    const brandFacts = factsResult.data; // single row or null
    const brandEvidence = evidenceResult.data || [];
    const guardrails = guardrailsResult.data || [];
    const channelPackages = channelPackagesResult.data || [];
    const topContent = topContentResult.data || [];
    const upcomingEvents = upcomingEventsResult.data || [];
    const currentSeason = currentSeasonResult.data;
    const trends = trendsResult.data || [];

    // Log any non-critical errors
    if (personasResult.error) console.error("Personas fetch error:", personasResult.error);
    if (decisionsResult.error) console.error("Decisions fetch error:", decisionsResult.error);
    if (factsResult.error) console.error("Facts fetch error:", factsResult.error);
    if (evidenceResult.error) console.error("Evidence fetch error:", evidenceResult.error);
    if (guardrailsResult.error) console.error("Guardrails fetch error:", guardrailsResult.error);
    if (channelPackagesResult.error) console.error("Channel packages fetch error:", channelPackagesResult.error);

    // Build the context packet
    const contextPacket = buildContextPacket(
      brandId,
      guideMode as GuideMode,
      guideVersionId,
      profile,
      personas,
      decisions,
      brandFacts,
      brandEvidence,
      guardrails,
      channelPackages
    );

    // Add seasonal context
    (contextPacket as unknown as Record<string, unknown>).seasonalContext = {
      currentDate: today,
      currentSeason: currentSeason?.event_name || null,
      upcomingEvents: upcomingEvents.map((e: Record<string, unknown>) => ({
        name: e.event_name,
        type: e.event_type,
        date: e.start_date,
        daysUntil: Math.ceil((new Date(e.start_date as string).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        messagingTips: e.messaging_tips,
        keywords: e.keywords,
      })),
    };

    // Add industry trends
    (contextPacket as unknown as Record<string, unknown>).industryTrends = {
      lastUpdated: today,
      trends: trends.map((t: Record<string, unknown>) => ({
        title: t.title,
        insight: t.content,
        type: t.knowledge_type,
        source: t.source_name,
        relevance: t.confidence_score,
      })),
    };

    // Add top performing content
    (contextPacket as unknown as Record<string, unknown>).topPerformingContent = {
      headlines: topContent.filter((c: Record<string, unknown>) => c.content_type === 'headline'),
      ctas: topContent.filter((c: Record<string, unknown>) => c.content_type === 'cta'),
      subjectLines: topContent.filter((c: Record<string, unknown>) => c.content_type === 'subject_line'),
    };

    console.log("Brand context generated:", {
      brandId,
      guideMode,
      guideVersionId,
      completeness: contextPacket.meta.completeness_score,
      personaCount: contextPacket.audience_personas.length,
      channelCount: contextPacket.active_channels.length,
      decisionCount: contextPacket.recent_decisions.length,
      factCount: contextPacket.facts.key_claims.length,
      evidenceCount: contextPacket.evidence.length,
      guardrailCount: contextPacket.guardrails.length,
      channelRuleCount: contextPacket.channel_rules.length,
      forbiddenTermsCount: contextPacket.forbidden_terms.length,
      requiredTermsCount: contextPacket.required_terms.length,
    });

    return new Response(JSON.stringify(contextPacket), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-brand-context:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

// ============================================
// BUILD CONTEXT PACKET
// ============================================

function buildContextPacket(
  brandId: string,
  guideMode: GuideMode,
  guideVersionId: string,
  profile: Record<string, unknown>,
  personas: Record<string, unknown>[],
  decisions: Record<string, unknown>[],
  brandFacts: Record<string, unknown> | null,
  brandEvidence: Record<string, unknown>[],
  guardrails: Record<string, unknown>[],
  channelPackages: Record<string, unknown>[]
): BrandContextV1 {
  const strategy = (profile.strategy || {}) as Record<string, unknown>;
  const brief = (profile.brief || {}) as Record<string, unknown>;
  const insights = (profile.insights || {}) as Record<string, unknown>;
  const toneTraits = (profile.tone_traits || {}) as Record<string, number>;

  // Parse enabled_channels
  const enabledChannels = profile.enabled_channels || {};
  const activeChannels: Array<{ channel: string; purpose: string }> = [];
  
  if (Array.isArray(enabledChannels)) {
    enabledChannels.forEach((ch: string) => {
      activeChannels.push({ channel: ch, purpose: '' });
    });
  } else if (typeof enabledChannels === 'object') {
    Object.entries(enabledChannels).forEach(([key, val]: [string, unknown]) => {
      const channelData = val as { enabled?: boolean; notes?: string };
      if (channelData?.enabled) {
        activeChannels.push({ channel: key, purpose: channelData.notes || '' });
      }
    });
  }

  // Build persona summaries
  const personaSummaries: PersonaSummary[] = personas.map((p) => ({
    id: (p.id as string) || "",
    name: (p.name as string) || "Unnamed",
    segment: (p.segment_type as string) || "",
    summary: (p.life_situation as string) || "",
    goals: Array.isArray(p.goals) ? p.goals : [],
    fears: Array.isArray(p.fears) ? p.fears : [],
    trust_triggers: Array.isArray(p.trust_triggers) ? p.trust_triggers : [],
    tone_preference: (p.tone_preference as string) || "",
  }));

  // Build channel rules from packages - extract matchable terms
  const channelRules: ChannelRule[] = channelPackages.map((pkg) => {
    const rules = (pkg.rules || {}) as Record<string, unknown>;
    return {
      channel: (pkg.channel as string) || "",
      purpose: (pkg.description as string) || "",
      constraints: {
        max_chars: rules.max_chars as number | undefined,
        min_chars: rules.min_chars as number | undefined,
        required_sections: rules.required_sections as string[] | undefined,
        forbidden_sections: rules.forbidden_sections as string[] | undefined,
        hashtag_policy: rules.hashtag_policy as string | undefined,
        emoji_policy: rules.emoji_policy as string | undefined,
        cta_required: rules.cta_required as boolean | undefined,
      },
      // Extract matchable terms
      forbidden_terms: extractTermsFromArray(rules.forbidden_words as string[] | undefined),
      required_terms: extractTermsFromArray(rules.required_phrases as string[] | undefined),
      rules: rules,
    };
  });

  // Build facts from brand_facts table (single row per brand)
  const factsData = brandFacts || {} as Record<string, unknown>;
  const services = (factsData.services || []) as Array<{ name: string; description?: string }>;
  const serviceAreas = (factsData.service_areas || []) as string[];
  const guarantees = (factsData.guarantees || []) as string[];
  const keyClaims = (factsData.key_claims || []) as Array<{ claim: string; status?: string }>;
  const legalNotes = (factsData.legal_notes || []) as string[];
  const verifiedFacts = (factsData.verified_facts || {}) as Record<string, unknown>;

  // Convert key_claims to BrandFact format
  const keyClaimsFacts: BrandFact[] = keyClaims.map((claim, index) => ({
    id: `claim_${index}`,
    claim: typeof claim === 'string' ? claim : claim.claim || '',
    type: 'other',
    status: (typeof claim === 'object' && claim.status) ? claim.status as "verified" | "unverified" | "forbidden" : 'unverified',
    evidence_ids: [],
    notes: undefined,
  }));

  // Build evidence items
  const evidenceItems: BrandEvidenceItem[] = brandEvidence.map((e) => ({
    id: (e.id as string) || "",
    title: (e.source_name as string) || (e.claim_text as string)?.substring(0, 50) || "Untitled",
    source_type: (e.evidence_type as string) || "internal_note",
    source_ref: (e.source_url as string) || (e.source_document_url as string) || "",
    excerpt: (e.claim_text as string) || "",
    verified: Boolean(e.verified_at),
    expires_at: e.expires_at as string | undefined,
  }));

  // Build guardrails with separated matchable terms
  const guardrailItems: Guardrail[] = guardrails.map((g) => {
    const config = (g.rule_config || {}) as Record<string, unknown>;
    return {
      id: (g.id as string) || "",
      name: (g.name as string) || "",
      severity: mapSeverity(g.severity as string),
      scope: mapScope(g.rule_type as string),
      rule: (g.description as string) || (g.name as string) || "",
      reason: config.reason as string | undefined,
      config: config,
      // Extract matchable terms (words/phrases that can be string-matched)
      forbidden_terms: extractTermsFromArray(config.forbidden_words as string[] | undefined),
      required_terms: extractTermsFromArray(config.required_elements as string[] | undefined),
    };
  });

  // Build tone rules
  const bannedWords = extractTermsFromArray(profile.banned_words as string[] | undefined);
  const toneRules: ToneRules = {
    target: (profile.tone_of_voice as string) || "",
    do: extractToneDos(toneTraits, strategy),
    dont: extractToneDonts(toneTraits),
    banned_words: bannedWords,
    reading_level: "normal",
  };

  // Build aggregated MATCHABLE forbidden terms (words/phrases for string matching)
  const forbiddenTerms = buildForbiddenTerms(bannedWords, guardrailItems, channelRules);
  
  // Build aggregated MATCHABLE required terms
  const requiredTerms = buildRequiredTerms(guardrailItems, channelRules, profile);
  
  // Build policy instructions (human-readable, for AI prompts)
  const policyNegatives = buildPolicyNegatives(toneRules, guardrailItems);
  const policyPositives = buildPolicyPositives(toneRules, guardrailItems, profile);

  return {
    identity: {
      name: (profile.name as string) || "Ej angivet",
      mission: (profile.mission_statement as string) || (strategy.mission as Record<string, unknown>)?.text as string || "Ej definierat",
      vision: (strategy.vision as Record<string, unknown>)?.text as string || (brief.vision as string) || "Ej definierat",
      tagline: (profile.tagline as string) || "Ej definierat",
      archetype: (profile.brand_archetype as string) || "Ej definierat",
    },
    positioning: {
      statement: (strategy.positioning as Record<string, unknown>)?.statement as string || (insights.positioning as string) || "Ej definierat",
      elevator_pitch: (strategy.positioning as Record<string, unknown>)?.elevator_pitch as string || (brief.elevator_pitch as string) || "Ej definierat",
      target_audience: (profile.target_audience_desc as string) || (strategy.positioning as Record<string, unknown>)?.target as string || "Ej definierat",
      unique_value: (strategy.positioning as Record<string, unknown>)?.differentiator as string || (insights.differentiator as string) || "Ej definierat",
    },
    tone_of_voice: {
      description: (profile.tone_of_voice as string) || "Ej definierat",
      traits: toneTraits,
      example: (profile.voice_analysis as string) || "",
    },
    audience_personas: personaSummaries,
    persona_rules: {
      personas: personaSummaries,
      default_persona_id: personaSummaries[0]?.id,
    },
    active_channels: activeChannels,
    channel_rules: channelRules,
    recent_decisions: decisions.map((d) => ({
      question: (d.question_label as string) || (d.question_id as string) || "",
      decision: (d.selected_option as string) || (d.custom_decision as string) || "",
      rationale: (d.rationale as string) || "",
      decided_by: (d.decided_by as string) || "",
      decided_at: (d.decided_at as string) || "",
    })),
    facts: {
      services,
      service_areas: serviceAreas,
      guarantees,
      key_claims: keyClaimsFacts,
      legal_notes: legalNotes,
      verified_facts: verifiedFacts,
    },
    evidence: evidenceItems,
    guardrails: guardrailItems,
    tone_rules: toneRules,
    // Matchable terms for preflight
    forbidden_terms: forbiddenTerms,
    required_terms: requiredTerms,
    // Policy instructions for AI prompts
    policy_negatives: policyNegatives,
    policy_positives: policyPositives,
    meta: {
      brand_id: brandId,
      guide_version_id: guideVersionId,
      guide_mode: guideMode,
      generated_at: new Date().toISOString(),
      completeness_score: calculateCompleteness(profile, personas, decisions, brandFacts, brandEvidence, guardrails),
      completeness_breakdown: getCompletenessBreakdown(profile, personas, decisions, brandFacts, brandEvidence, guardrails),
    },
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractTermsFromArray(arr: string[] | undefined): string[] {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.filter(t => typeof t === 'string' && t.trim().length > 0).map(t => t.trim().toLowerCase());
}

function mapSeverity(severity: string): GuardrailSeverity {
  if (severity === 'error' || severity === 'hard') return 'hard';
  return 'soft';
}

function mapScope(ruleType: string): GuardrailScope {
  const scopeMap: Record<string, GuardrailScope> = {
    'forbidden_words': 'tone',
    'required_elements': 'global',
    'channel_specific': 'channel',
    'persona_specific': 'persona',
    'claims': 'claims',
    'tone': 'tone',
  };
  return scopeMap[ruleType] || 'global';
}

function extractToneDos(
  toneTraits: Record<string, number>,
  strategy: Record<string, unknown>
): string[] {
  const dos: string[] = [];
  
  // Extract positive traits (high values)
  Object.entries(toneTraits).forEach(([trait, value]) => {
    if (value >= 70) {
      dos.push(`Var ${trait.toLowerCase()}`);
    }
  });

  // Add from strategy if available
  const voice = (strategy.voice as Record<string, unknown>) || {};
  if (Array.isArray(voice.do)) {
    dos.push(...voice.do);
  }

  return dos;
}

function extractToneDonts(toneTraits: Record<string, number>): string[] {
  const donts: string[] = [];
  
  // Extract negative traits (low values mean avoid the opposite)
  Object.entries(toneTraits).forEach(([trait, value]) => {
    if (value <= 30) {
      donts.push(`Undvik att vara för ${trait.toLowerCase()}`);
    }
  });

  return donts;
}

// Build matchable forbidden terms (just words/phrases, no full sentences)
function buildForbiddenTerms(
  bannedWords: string[],
  guardrails: Guardrail[],
  channelRules: ChannelRule[]
): string[] {
  const terms: Set<string> = new Set();

  // Add banned words directly
  bannedWords.forEach((word) => terms.add(word.toLowerCase()));

  // Add from guardrails
  guardrails.forEach((g) => {
    g.forbidden_terms.forEach((term) => terms.add(term));
  });

  // Add from channel rules
  channelRules.forEach((ch) => {
    ch.forbidden_terms.forEach((term) => terms.add(term));
  });

  return Array.from(terms).filter(t => t.length > 0);
}

// Build matchable required terms
function buildRequiredTerms(
  guardrails: Guardrail[],
  channelRules: ChannelRule[],
  profile: Record<string, unknown>
): string[] {
  const terms: Set<string> = new Set();

  // Add required phrases from profile
  const requiredPhrases = extractTermsFromArray(profile.required_phrases as string[] | undefined);
  requiredPhrases.forEach((phrase) => terms.add(phrase));

  // Add from guardrails
  guardrails.forEach((g) => {
    g.required_terms.forEach((term) => terms.add(term));
  });

  // Add from channel rules
  channelRules.forEach((ch) => {
    ch.required_terms.forEach((term) => terms.add(term));
  });

  return Array.from(terms).filter(t => t.length > 0);
}

// Build policy negatives (human-readable instructions for AI prompts)
function buildPolicyNegatives(
  toneRules: ToneRules,
  guardrails: Guardrail[]
): string[] {
  const policies: string[] = [];

  // Add tone don'ts as policy
  toneRules.dont.forEach((dont) => policies.push(dont));

  // Add banned words as policy instruction
  if (toneRules.banned_words.length > 0) {
    policies.push(`Använd aldrig orden: ${toneRules.banned_words.slice(0, 10).join(', ')}`);
  }

  // Add guardrail rules as policy (the full description/reason)
  guardrails.forEach((g) => {
    if (g.severity === 'hard' && g.rule) {
      policies.push(g.rule);
    }
  });

  return policies;
}

// Build policy positives (human-readable instructions for AI prompts)
function buildPolicyPositives(
  toneRules: ToneRules,
  guardrails: Guardrail[],
  profile: Record<string, unknown>
): string[] {
  const policies: string[] = [];

  // Add tone do's
  toneRules.do.forEach((d) => policies.push(d));

  // Add required phrases as policy
  const requiredPhrases = profile.required_phrases as string[] | undefined;
  if (requiredPhrases && requiredPhrases.length > 0) {
    policies.push(`Inkludera när lämpligt: ${requiredPhrases.slice(0, 5).join(', ')}`);
  }

  return policies;
}

function calculateCompleteness(
  profile: Record<string, unknown>,
  personas: unknown[],
  decisions: unknown[],
  facts: Record<string, unknown> | null,
  evidence: unknown[],
  guardrails: unknown[]
): number {
  const breakdown = getCompletenessBreakdown(profile, personas, decisions, facts, evidence, guardrails);
  const completed = Object.values(breakdown).filter(Boolean).length;
  const total = Object.keys(breakdown).length;
  return Math.round((completed / total) * 100);
}

function getCompletenessBreakdown(
  profile: Record<string, unknown>,
  personas: unknown[],
  decisions: unknown[],
  facts: Record<string, unknown> | null,
  evidence: unknown[],
  guardrails: unknown[]
): Record<string, boolean> {
  const strategy = (profile.strategy || {}) as Record<string, unknown>;
  const factsData = facts || {} as Record<string, unknown>;
  
  return {
    has_name: Boolean(profile.name),
    has_mission: Boolean(profile.mission_statement || (strategy.mission as Record<string, unknown>)?.text),
    has_tagline: Boolean(profile.tagline),
    has_positioning: Boolean((strategy.positioning as Record<string, unknown>)?.statement),
    has_tone_description: Boolean(profile.tone_of_voice),
    has_tone_traits: Boolean(profile.tone_traits && Object.keys(profile.tone_traits as object).length > 0),
    has_personas: personas.length > 0,
    has_channels: Boolean(
      profile.enabled_channels && 
      (Array.isArray(profile.enabled_channels) 
        ? (profile.enabled_channels as unknown[]).length > 0
        : Object.values(profile.enabled_channels as object).some((v: unknown) => (v as { enabled?: boolean })?.enabled)
      )
    ),
    has_decisions: decisions.length > 0,
    has_archetype: Boolean(profile.brand_archetype),
    // Check array length, not just existence (empty arrays are falsy for completeness)
    has_facts: Boolean(
      (Array.isArray(factsData.services) && (factsData.services as unknown[]).length > 0) ||
      (Array.isArray(factsData.guarantees) && (factsData.guarantees as unknown[]).length > 0) ||
      (Array.isArray(factsData.key_claims) && (factsData.key_claims as unknown[]).length > 0)
    ),
    has_evidence: Array.isArray(evidence) && evidence.length > 0,
    has_guardrails: Array.isArray(guardrails) && guardrails.length > 0,
  };
}
