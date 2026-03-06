import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://esm.sh/zod@3.22.4";
import { withBrand, BrandContextV1, corsHeaders } from "../_shared/withBrand.ts";
import { callAIGatewayJSON } from "../_shared/ai-gateway.ts";
import { guardianGate, guardianBlockedResponse } from "../_shared/guardianGate.ts";

interface LearningSignal {
  signal_type: string;
  signal_key: string;
  positive_count: number;
  negative_count: number;
}

const GOAL_TRANSLATIONS: Record<string, string> = {
  leads: 'Generera leads',
  revenue: 'Öka omsättning',
  awareness: 'Bygga varumärkeskännedom',
  retention: 'Öka kundlojalitet',
};

const ARCHETYPE_GUIDELINES: Record<string, string> = {
  'Caregiver': 'Omtänksam, trygg - undvik aggressiv säljton',
  'Sage': 'Kunnig, pålitlig - fokusera på fakta',
  'Hero': 'Inspirerande, modig - uppmuntra handling',
  'Innocent': 'Optimistisk, enkel - håll budskapet ljust',
  'Explorer': 'Äventyrlig, frihet - betona möjligheter',
};

const BodySchema = z.object({
  slotName: z.string().optional(),
  goalType: z.string().optional(),
  channels: z.union([z.array(z.string()), z.string()]).optional(),
  budget: z.string().optional(),
  periodTheme: z.string().optional(),
  accountGoal: z.object({
    primary_goal: z.string(),
    north_star_metric: z.string(),
    target_value: z.number(),
  }).optional(),
  userId: z.string().uuid().optional(),
});

async function fetchLearningSignals(supabase: any, userId: string | null): Promise<string> {
  if (!userId) return '';
  
  try {
    const { data: signals } = await supabase
      .from('ai_learning_signals')
      .select('signal_type, signal_key, positive_count, negative_count')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('updated_at', { ascending: false })
      .limit(50);
    
    if (!signals || signals.length === 0) return '';

    const contentPrefs: string[] = [];
    const avoidPatterns: string[] = [];

    for (const signal of signals as LearningSignal[]) {
      const total = (signal.positive_count || 0) + (signal.negative_count || 0);
      if (total < 2) continue;
      
      const positiveRate = (signal.positive_count || 0) / total;
      if (signal.signal_type === 'content_preference') {
        if (positiveRate >= 0.7) contentPrefs.push(`${signal.signal_key} (${Math.round(positiveRate * 100)}% positivt)`);
        else if (positiveRate <= 0.3) avoidPatterns.push(`${signal.signal_key}`);
      }
    }

    if (contentPrefs.length === 0 && avoidPatterns.length === 0) return '';

    return `
LÄRANDE FRÅN FEEDBACK:
${contentPrefs.length > 0 ? `FUNGERAR BRA: ${contentPrefs.join(', ')}` : ''}
${avoidPatterns.length > 0 ? `UNDVIK: ${avoidPatterns.join(', ')}` : ''}`;
  } catch {
    return '';
  }
}

export default withBrand(async ({ brand, trace_id, body, brandPrompt, supabase, admin, req }) => {
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'invalid_body', trace_id, details: parsed.error.issues }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { slotName, goalType, channels, budget, periodTheme, accountGoal, userId } = parsed.data;

  console.log(JSON.stringify({
    at: 'generate-concept.start',
    trace_id,
    brand_id: brand.brand_id,
    context_version: brand.context_version,
    slotName,
    goalType,
    hasAccountGoal: !!accountGoal,
  }));

  // Fetch learning signals using user-scoped client
  const learningContext = userId ? await fetchLearningSignals(supabase, userId) : '';

  const channelList = Array.isArray(channels) ? channels.join(', ') : channels || 'ej specificerade';

  // Build account goal context
  const accountGoalContext = accountGoal ? `
KONTO-MÅL:
- Primärmål: ${GOAL_TRANSLATIONS[accountGoal.primary_goal] || accountGoal.primary_goal}
- North Star: ${accountGoal.north_star_metric}
- Målvärde: ${accountGoal.target_value}` : '';

  // Build archetype guideline from V1
  const archetypeGuideline = brand.identity.archetype 
    ? ARCHETYPE_GUIDELINES[brand.identity.archetype] || '' 
    : '';

  const systemPrompt = `Du är en erfaren marknadsföringsexpert som skapar kampanjkoncept.

KRITISKT - GISSA ALDRIG:
- Om information saknas → var explicit med vad som saknas
- Basera ALLA påståenden på faktisk input-data

${brandPrompt}
${archetypeGuideline ? `ARKETYPSRIKTLINJE: ${archetypeGuideline}` : ''}
${accountGoalContext}
${learningContext}

Returnera JSON med:
{
  "concept": {
    "huvudbudskap": "1-2 meningar",
    "målgrupp": "vem riktar vi oss till",
    "emotionell_hook": "vad ska de känna",
    "erbjudande_cta": "konkret call-to-action",
    "kanalspecifika_tips": ["tips per kanal"],
    "email_body": "Naturligt email-innehåll som löpande text"
  },
  "brand_guide_alignment": 0-100,
  "brand_guide_notes": ["hur konceptet följer Brand Guide"],
  "brand_guide_violations": [],
  "learning_applied": []
}`;

  const userPrompt = `Skapa kampanjkoncept för:
KAMPANJ: ${slotName || 'Ny kampanj'}
MÅL: ${goalType === 'lead_generation' ? 'Generera leads' : goalType === 'brand_awareness' ? 'Bygga varumärke' : goalType || 'Ej specificerat'}
KANALER: ${channelList}
BUDGET: ${budget || 'Ej specificerad'}
TEMA: ${periodTheme || 'Generell'}

Returnera JSON.`;

  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  const result = await callAIGatewayJSON<{
    concept: {
      huvudbudskap?: string;
      målgrupp?: string;
      emotionell_hook?: string;
      erbjudande_cta?: string;
      kanalspecifika_tips?: string[];
      email_body?: string;
    };
    brand_guide_alignment?: number;
    brand_guide_notes?: string[];
    brand_guide_violations?: string[];
    learning_applied?: string[];
  }>({
    model: 'google/gemini-2.5-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
  }, {
    'X-Trace-Id': trace_id,
    'X-Brand-Id': brand.brand_id,
    'X-Context-Version': String(brand.context_version),
  });

  const conceptText = result.concept?.email_body || 
    `${result.concept?.huvudbudskap || ''}\n\n${result.concept?.emotionell_hook || ''}\n\n${result.concept?.erbjudande_cta || ''}`;

  console.log(JSON.stringify({
    at: 'generate-concept.complete',
    trace_id,
    brand_id: brand.brand_id,
    alignment: result.brand_guide_alignment,
  }));

  // Guardian Gate validation on generated content
  let preflight = null;
  try {
    const gate = await guardianGate(req, {
      brand_profile_id: brand.brand_id,
      channel: Array.isArray(channels) ? channels[0] || "general" : "general",
      content: conceptText,
      asset_type: "campaign_concept",
    }, { policy: "fail_closed", mode: "user", source: "generate-concept" });

    preflight = gate.preflight;

    if (gate.blocked) {
      return guardianBlockedResponse(gate.preflight);
    }
  } catch (gateErr) {
    console.warn(JSON.stringify({ at: 'generate-concept.guardian_gate_error', trace_id, error: String(gateErr) }));
    // Continue without blocking if gate fails (fail_open for generation)
  }

  return new Response(JSON.stringify({
    trace_id,
    concept: conceptText,
    conceptStructured: result.concept,
    brand_guide_alignment: result.brand_guide_alignment,
    brand_guide_notes: result.brand_guide_notes || [],
    brand_guide_violations: result.brand_guide_violations || [],
    learning_applied: result.learning_applied || [],
    brandContextApplied: true,
    feedbackApplied: learningContext.length > 0,
    preflight
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
