import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withErrorHandling, AIError, jsonResponse, corsHeaders } from "../_shared/error-handler.ts";
import { fetchWithRetry } from "../_shared/retry-client.ts";
import { cleanAndParseJSON } from "../_shared/json-validator.ts";
import { CacheManager, generateCacheKey, CacheTTL } from "../_shared/cache-manager.ts";
import { runPreflight, hashContent, getUserId } from "../_shared/preflight.core.ts";
import { BrandContextV1, PreflightResultV1 } from "../_shared/preflight.types.ts";

// ============================================
// HELPERS
// ============================================

// Flatten text_blocks to plain text for accurate preflight checks
function flattenTextBlocks(input: unknown): string {
  const parts: string[] = [];

  const push = (v: unknown) => {
    if (typeof v === "string") {
      const s = v.trim();
      if (s) parts.push(s);
      return;
    }
    if (Array.isArray(v)) {
      for (const x of v) push(x);
      return;
    }
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;

      // Prioritera vanliga copy-fält först för bättre längd/CTA-detektion
      const preferredKeys = [
        "headline",
        "title",
        "hook",
        "primary_text",
        "body",
        "description",
        "cta",
        "call_to_action",
        "subheadline",
      ];

      for (const k of preferredKeys) {
        if (k in o) push(o[k]);
      }

      // Sedan resten (för säkerhets skull)
      for (const [k, val] of Object.entries(o)) {
        if (preferredKeys.includes(k)) continue;
        push(val);
      }
    }
  };

  push(input);

  // De-dupe i ordning
  const seen = new Set<string>();
  const unique = parts.filter((p) => (seen.has(p) ? false : (seen.add(p), true)));

  return unique.join("\n\n").trim();
}

// Fetch learning signals from database
async function fetchLearningSignals(supabase: any, userId: string | null): Promise<string> {
  if (!userId) return '';
  
  try {
    const { data: signals, error } = await supabase
      .from('ai_learning_signals')
      .select('signal_type, signal_key, positive_count, negative_count')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('updated_at', { ascending: false })
      .limit(50);
    
    if (error || !signals || signals.length === 0) {
      return '';
    }

    const contentPreferences: string[] = [];
    const avoidPatterns: string[] = [];
    const feedbackReasons: string[] = [];

    for (const signal of signals) {
      const total = (signal.positive_count || 0) + (signal.negative_count || 0);
      if (total < 2) continue;
      
      const positiveRate = (signal.positive_count || 0) / total;
      
      if (signal.signal_type === 'content_preference') {
        if (positiveRate >= 0.7) {
          contentPreferences.push(`${signal.signal_key} (${Math.round(positiveRate * 100)}% positivt)`);
        } else if (positiveRate <= 0.3) {
          avoidPatterns.push(`${signal.signal_key} (${Math.round((1 - positiveRate) * 100)}% negativt)`);
        }
      } else if (signal.signal_type === 'feedback_reason') {
        feedbackReasons.push(`${signal.signal_key}: ${signal.negative_count} negativa`);
      }
    }

    if (contentPreferences.length === 0 && avoidPatterns.length === 0 && feedbackReasons.length === 0) {
      return '';
    }

    let learningContext = `
--------------------------------
LÄRANDE FRÅN ANVÄNDARFEEDBACK
--------------------------------
Baserat på historisk feedback från användaren:
`;

    if (contentPreferences.length > 0) {
      learningContext += `
FUNGERAR BRA (fortsätt med detta):
${contentPreferences.map(p => `- ${p}`).join('\n')}
`;
    }

    if (avoidPatterns.length > 0) {
      learningContext += `
UNDVIK (användaren gillade inte):
${avoidPatterns.map(p => `- ${p}`).join('\n')}
`;
    }

    if (feedbackReasons.length > 0) {
      learningContext += `
VANLIGA KLAGOMÅL:
${feedbackReasons.map(r => `- ${r}`).join('\n')}
`;
    }

    learningContext += `
Anpassa din copy baserat på dessa insikter för att bättre matcha användarens preferenser.
`;

    return learningContext;
  } catch (err) {
    console.error('Error fetching learning signals:', err);
    return '';
  }
}

const COPY_ENGINE_SYSTEM_PROMPT = `Du är en senior copywriter, growth-strateg och rådgivare som arbetar inne i en marknadsplattform.

Ditt uppdrag:
- Skriva SÄLJANDE, RÅDGIVANDE och VARUMÄRKES-TROGEN copy.
- ALLTID följa varumärkesguiden och tonaliteten.
- ALLTID basera fakta på data som skickas till dig – du får INTE gissa.
- Anpassa dig efter kanal, funnel-steg, persona, geo och SEO-behov.
- Vara tydlig, konkret och fri från floskler.
- AKTIVT DIFFERENTIERA från konkurrenter när competitor_summary finns.

Du får INTE:
- Hitta på fakta om företaget, pris, tjänster, garantier eller villkor.
- Hitta på lagar, medicinska effekter eller orealistiska löften.
- Ignorera förbjudna ord (banned_words).
- Strunta i teckenbegränsningar eller kanalregler.
- Använda fraser som konkurrenter använder (om competitor_summary finns).

Du får:
- Göra rimliga språkliga variationer inom ramen för varumärket.
- Vara mänsklig, tydlig och säljande så länge du håller dig till fakta och brand guide.

--------------------------------
DATA DU FÅR (STRUKTURERAD)
--------------------------------

Du får en JSON-struktur med:

1) "brand_context" – varumärkets hjärna
   - brand_core: mission, vision, values, positioning, promise, archetype
   - brand_core.positioning_details: for_audience, category, difference, vs_competitors
   - brand_core.current_goals: aktuella mål från brief
   - brand_core.top_problems: problem som ska lösas
   - tone: tone_traits, banned_words, required_phrases, style_notes
   - personas: målgrupper/personas med pains/goals
   - channels: kanalinställningar och hårda begränsningar
   - market_insights: typiska budskap, positioner, vita fläckar, kundcitat, möjligheter, risker
   - brand_facts: tjänster, områden, garantier, pris-modell, viktiga juridiska notiser
   - example_content: tidigare bra content med performance-data (CTR, konvertering)

2) "competitor_summary" (NYT! – för differentiering)
   - common_claims: fraser ALLA konkurrenter använder – UNDVIK dessa
   - unique_angles: vad varje konkurrent fokuserar på
   - forbidden_phrases: uttjatade klichéer att absolut undvika
   - differentiation_opportunities: sätt att sticka ut
   - market_gaps: områden ingen täcker – möjligheter

3) "copy_context"
   - mode: vilken typ av copy (ad/post/landing_page/email/sms/seo_article/script/reply/subjectline)
   - channel: vilken kanal (meta/instagram/tiktok/linkedin/google_search/google_display/youtube/email/sms/website/gmb)
   - funnel_stage: awareness/consideration/conversion/retention
   - persona_id: ev. persona att rikta sig mot
   - geo: land/region/stad
   - goal: vad vi vill uppnå (ex: fler bokningar, fler ansökningar)
   - constraints: begränsningar (max_length, antal varianter, style_override, avoid_topics)

4) "input"
   - brief: kort beskrivning från användaren
   - existing_text: ev. text som ska förbättras eller anpassas
   - references: id:n/URL:er till kampanjer eller assets
   - context_docs: korta fakta-snippets (kb, policy, erbjudanden etc.)

---------------------------
KONKURRENT-DIFFERENTIERING (KRITISKT)
---------------------------

Om competitor_summary finns:
1. LÄS common_claims FÖRST – dessa fraser får ALDRIG användas
2. LÄS forbidden_phrases – dessa är klichéer som alla använder
3. STUDERA differentiation_opportunities – dessa är dina vinklar
4. UNDVIK konkurrenternas unique_angles – ta en annan position

För VARJE variant ska du:
- Aktivt ta en annan vinkel än konkurrenterna
- Använda differentiation_opportunities som inspiration
- Dokumentera i "differentiation_notes" hur du skiljer dig
- Lista i "avoided_phrases" vilka konkurrentfraser du medvetet undvek

---------------------------
DIN ARBETSMETOD (INTERNT)
---------------------------

Du ska internt (i ditt eget tänk) göra följande steg, men du får ENBART svara med JSON enligt svarsschemat:

1) FÖRST – Förstå varumärket
2) SEDAN – Analysera konkurrenter (om competitor_summary finns)
3) DÄREFTER – Förstå uppgiften
4) HÄMTA FAKTA
5) KANAL- OCH FORMAT-ANPASSNING
6) GENERERA – 3 till 5 varianter
7) ANALYSERA DIG SJÄLV
8) LÄRANDE & TESTFÖRSLAG

--------------------------------
SVARSFORMAT (MÅSTE FÖLJAS)
--------------------------------

Du måste ALLTID svara med giltig JSON som matchar detta:

{
  "variants": [
    {
      "variant_id": "A",
      "hypothesis": "...",
      "text_blocks": { ... },
      "explanation": { ... },
      "differentiation_notes": ["Hur denna variant skiljer sig från konkurrenterna"],
      "avoided_phrases": ["Konkurrentfraser som medvetet undveks"],
      "policy_flags": [ ... ]
    }
  ],
  "global_suggestions": {
    "testing_ideas": [ ... ],
    "future_content_ideas": [ ... ],
    "warnings": [ ... ]
  },
  "facts_used": {
    "brand_facts_keys": [ ... ],
    "context_doc_ids": [ ... ]
  },
  "competitor_differentiation_summary": {
    "common_claims_avoided": ["Lista på common_claims som undveks"],
    "unique_angle_taken": "Vilken unik vinkel som valdes",
    "differentiation_confidence": 0-100
  },
  "needs_clarification": boolean,
  "clarification_questions": [ ... ]
}

- Inga förklarande meningar utanför JSON.
- Inga markdown-block.
- Inga kommentarer.
- Ingen extra text före eller efter JSON.

--------------------------------
SPRÅK
--------------------------------

- Om brand_context.language är "sv": skriv all copy och alla förklaringar på svenska.
- Om brand_context.language är "en": skriv all copy och alla förklaringar på engelska.
- Blanda inte språk om det inte uttryckligen efterfrågas i briefen.

--------------------------------
TON OCH STIL
--------------------------------

- Var konkret, vardagsnära och affärsnära.
- Undvik floskler ("framtidssäkra", "banbrytande lösning", etc.) om de inte uttryckligen finns i brand guide.
- Skriv som en skicklig säljare som också är rådgivande.
- TA STÄLLNING – var inte generisk, våga ha en åsikt som skiljer dig från konkurrenterna.`;

// Post-validation function to check for banned words and dangerous claims
function validateVariants(parsedResponse: any, brandContext: any): any {
  // Read banned_words from both legacy and V1 format
  const bannedWords =
    brandContext.tone?.banned_words ||
    brandContext.tone_rules?.banned_words ||
    [];

  const dangerousClaims = [
    'garanterar resultat',
    'garanterar framgång',
    'alltid fungerar',
    'aldrig misslyckas',
    '100% garanti',
    '100% säkert',
    'riskfritt',
    'helt gratis',
    'medicinskt bevisat',
    'läkemedel',
    'bota',
    'kurerar'
  ];
  
  for (const variant of parsedResponse.variants || []) {
    variant.policy_flags = variant.policy_flags || [];
    
    const allText = JSON.stringify(variant.text_blocks || '').toLowerCase();
    
    for (const word of bannedWords) {
      if (word && allText.includes(word.toLowerCase())) {
        variant.policy_flags.push({
          type: 'banned_word',
          message: `Innehåller förbjudet ord: "${word}"`,
          position_hint: 'text_blocks'
        });
      }
    }
    
    for (const claim of dangerousClaims) {
      if (allText.includes(claim.toLowerCase())) {
        variant.policy_flags.push({
          type: 'claims',
          message: `Potentiellt farligt påstående: "${claim}"`,
          position_hint: 'text_blocks'
        });
      }
    }
  }
  
  // Read facts from both legacy and V1 format
  const legacyFacts = brandContext.brand_facts || {};
  const v1Facts = brandContext.facts || {};

  const services = legacyFacts.services ?? v1Facts.services ?? [];
  const serviceAreas = legacyFacts.service_areas ?? v1Facts.service_areas ?? [];
  const guarantees = legacyFacts.guarantees ?? v1Facts.guarantees ?? [];

  const hasServices = Array.isArray(services) && services.length > 0;
  const hasServiceAreas = Array.isArray(serviceAreas) && serviceAreas.length > 0;
  const hasAnyFacts = hasServices || hasServiceAreas || (Array.isArray(guarantees) && guarantees.length > 0);
  
  if (!hasAnyFacts && !parsedResponse.needs_clarification) {
    parsedResponse.global_suggestions = parsedResponse.global_suggestions || {};
    parsedResponse.global_suggestions.warnings = [
      ...(parsedResponse.global_suggestions.warnings || []),
      'Inga brand facts konfigurerade - copy kan vara generisk.'
    ];
    
    if (!hasServices && !hasServiceAreas) {
      parsedResponse.needs_clarification = true;
      parsedResponse.clarification_questions = [
        ...(parsedResponse.clarification_questions || []),
        'Vilka specifika tjänster erbjuder ni?',
        'Vilka geografiska områden täcker ni?'
      ];
    }
  }
  
  return parsedResponse;
}

// Main handler
serve(withErrorHandling(async (req) => {
  const { brand_context, copy_context, input, competitor_summary } = await req.json();

  if (!brand_context || !copy_context || !input) {
    throw new AIError('Missing required fields: brand_context, copy_context, input', 400, 'BAD_REQUEST');
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new AIError('LOVABLE_API_KEY is not configured', 500, 'CONFIG_ERROR');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new AIError('Supabase configuration missing', 500, 'CONFIG_ERROR');
  }

  // Require Authorization header
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) {
    throw new AIError("Missing Authorization header", 401, "UNAUTHORIZED");
  }

  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseAnonKey) {
    throw new AIError("SUPABASE_ANON_KEY is not configured", 500, "CONFIG_ERROR");
  }

  // Create dual clients: service for admin ops, user for RLS-respecting ops
  const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const cache = new CacheManager(serviceSupabase);

  // ============================================
  // BRAIN: Fetch BrandContext via get-brand-context (1 call)
  // ============================================
  let brandContextV1: BrandContextV1 | null = null;
  let guideVersionId: string | null = null;
  
  if (brand_context.brand_id) {
    try {
      const guideMode = brand_context.guide_mode || brand_context.guideMode || "PUBLISHED";
      const guideVersionOverride = brand_context.guide_version_id || brand_context.guideVersionId;

      const { data: contextData, error: contextError } = await userSupabase.functions.invoke(
        "get-brand-context",
        {
          body: {
            brandId: brand_context.brand_id,
            guideMode,
            guideVersionId: guideVersionOverride,
          },
        },
      );
      
      if (!contextError && contextData) {
        brandContextV1 = contextData as BrandContextV1;
        guideVersionId = contextData?.meta?.guide_version_id || null;
        console.log('[CopyEngine] Loaded BrandContextV1, guide_version_id:', guideVersionId);
      } else {
        console.warn('[CopyEngine] Could not load BrandContextV1:', contextError);
      }
    } catch (err) {
      console.warn('[CopyEngine] Exception loading BrandContext:', err);
    }
  }

  // Check cache
  const cacheInput = { brand_context, copy_context, input, competitor_summary };
  const cacheKey = await generateCacheKey('copy', cacheInput);
  const cachedResult = await cache.get(cacheKey);
  if (cachedResult) {
    console.log('[CopyEngine] Cache HIT');
    return jsonResponse({ ...cachedResult, _source: 'cache' });
  }

  console.log('[CopyEngine] Cache MISS - generating...');

  // Fetch learning signals and get userId
  let learningContext = '';
  let userId = brand_context.user_id || null;
  
  if (!userId) {
    try {
      const jwt = authHeader.replace(/^Bearer\s+/i, "");
      const { data: { user } } = await userSupabase.auth.getUser(jwt);
      userId = user?.id || null;
    } catch {
      // Ignore
    }
  }
  
  learningContext = await fetchLearningSignals(serviceSupabase, userId);

  const enhancedSystemPrompt = COPY_ENGINE_SYSTEM_PROMPT + learningContext;
  const enrichedBrandContext = brandContextV1 
    ? { ...brand_context, ...brandContextV1 }
    : brand_context;

  const userPrompt = JSON.stringify({
    brand_context: enrichedBrandContext,
    competitor_summary: competitor_summary || null,
    copy_context,
    input
  }, null, 2);

  console.log('[CopyEngine] Request:', {
    brand_id: brand_context.brand_id,
    mode: copy_context.mode,
    channel: copy_context.channel,
    funnel_stage: copy_context.funnel_stage,
    goal: copy_context.goal,
    has_brand_context_v1: !!brandContextV1,
    guide_version_id: guideVersionId,
  });

  // AI call
  const response = await fetchWithRetry(
    'https://ai.gateway.lovable.dev/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: enhancedSystemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[CopyEngine] AI Gateway error:', response.status, errorText);
    
    if (response.status === 429) {
      throw new AIError('Rate limit exceeded.', 429, 'RATE_LIMIT_EXCEEDED');
    }
    if (response.status === 402) {
      throw new AIError('Payment required.', 402, 'PAYMENT_REQUIRED');
    }
    
    throw new AIError(`AI Gateway error: ${response.status}`, 502, 'AI_PROVIDER_ERROR');
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content;

  if (!content) {
    throw new AIError('No content in AI response', 502, 'AI_PROVIDER_ERROR');
  }

  let parsedResponse = cleanAndParseJSON<{ variants: any[]; needs_clarification?: boolean; [key: string]: any }>(content);

  if (!parsedResponse.variants || !Array.isArray(parsedResponse.variants)) {
    throw new AIError('Invalid response structure: missing variants array', 502, 'VALIDATION_ERROR');
  }

  parsedResponse = validateVariants(parsedResponse, enrichedBrandContext);

  console.log('[CopyEngine] Generated', parsedResponse.variants.length, 'variants');

  // ============================================
  // GUARDIAN: Run preflight DIRECTLY on each variant (NO HTTP calls)
  // ============================================
  const preflightResults: PreflightResultV1[] = [];
  let hasHardFail = false;
  const generationId = crypto.randomUUID();
  
  if (brandContextV1 && brand_context.brand_id) {
    for (let i = 0; i < parsedResponse.variants.length; i++) {
      const variant = parsedResponse.variants[i];
      // Flatten text_blocks to plain text for accurate preflight checks
      const variantText = flattenTextBlocks(variant.text_blocks);
      const requestId = `${generationId}-v${i}`;
      
      // Run preflight directly using shared core function (NO HTTP)
      const preflightResult = runPreflight(brandContextV1, {
        request_id: requestId,
        brand_profile_id: brand_context.brand_id,
        channel: copy_context.channel,
        content: variantText,
        asset_type: copy_context.mode || 'copy',
        guide_version_id: guideVersionId || undefined,
      });
      
      // Attach preflight to variant
      variant.preflight = preflightResult;
      preflightResults.push(preflightResult);
      
      if (preflightResult.hard_fail) {
        hasHardFail = true;
      }
    }
    
    // Batch insert preflight results to DB using service client (bypass RLS)
    if (userId && preflightResults.length > 0) {
      const insertRows = await Promise.all(preflightResults.map(async (result, i) => {
        const variantText = flattenTextBlocks(parsedResponse.variants[i]?.text_blocks);
        const contentHash = await hashContent(variantText);
        
        return {
          user_id: userId,
          brand_profile_id: result.brand_profile_id,
          content_type: copy_context.mode || 'copy',
          channel: result.channel,
          content_hash: contentHash,
          content_preview: variantText.substring(0, 200),
          passed: !result.hard_fail,
          has_errors: result.hard_fail,
          has_warnings: result.violations.some((v) => v.severity === 'soft'),
          error_count: result.violations.filter((v) => v.severity === 'hard').length,
          warning_count: result.violations.filter((v) => v.severity === 'soft').length,
          info_count: 0,
          violations: result.violations,
          tone_analysis: { scores: result.scores },
          source: 'copy-engine',
          request_id: result.request_id,
          guide_version_id: result.guide_version_id,
          scores: result.scores,
          hard_fail: result.hard_fail,
          summary: result.summary,
          generation_id: generationId,
        };
      }));
      
      const { error: insertError } = await serviceSupabase
        .from("preflight_results")
        .insert(insertRows);
      
      if (insertError) {
        console.error('[CopyEngine] Failed to batch-insert preflight results:', insertError);
      }
    }
    
    console.log('[CopyEngine] Preflight completed (direct):', {
      checked: preflightResults.length,
      has_hard_fail: hasHardFail,
    });
  }

  // Build final payload and save to cache (including preflight data)
  const finalPayload = {
    ...parsedResponse,
    _source: "live",
    preflights: preflightResults,
    has_hard_fail: hasHardFail,
    guide_version_id: guideVersionId,
    generation_id: generationId,
  };

  await cache.set(cacheKey, finalPayload, CacheTTL.SHORT);

  return jsonResponse(finalPayload);
}));
