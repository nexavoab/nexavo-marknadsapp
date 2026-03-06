import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withErrorHandling, AIError, jsonResponse } from "../_shared/error-handler.ts";
import { callAIGatewayJSON } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChannelPlan {
  channel: string;
  budget: number;
  budgetPercent: number;
  frequency: string;
  kpis: {
    targetCTR?: number;
    targetCPL?: number;
    targetConversions?: number;
  };
  contentFormats: string[];
  bestTiming: string;
  notes: string;
}

interface CalendarEntry {
  id: string;
  date: string;
  dayOfWeek: string;
  channel: string;
  contentType: string;
  title: string;
  status: string;
  notes?: string;
}

interface WeeklyFlighting {
  week: number;
  startDate: string;
  endDate: string;
  spend: number;
  focus: string;
  channels: string[];
}

interface CampaignPackResponse {
  brief: {
    campaignName: string;
    goal: string;
    targetAudience: string;
    keyMessage: string;
    emotionalHook: string;
    callToAction: string;
    uniqueAngle: string;
    differentiators: string[];
  };
  concept: {
    headline: string;
    subheadline: string;
    visualDirection: string;
    toneDescription: string;
    keyVisuals: string[];
    colorMood: string;
  };
  channelPlan: ChannelPlan[];
  calendar: CalendarEntry[];
  flighting: WeeklyFlighting[];
  contentVariants: Record<string, {
    headline: string;
    primaryText: string;
    cta: string;
    hypothesis: string;
  }[]>;
  tracking: {
    campaignNamingStandard: string;
    utmCampaign: string;
    utmSource: Record<string, string>;
    utmMedium: Record<string, string>;
    kpiChecklist: { metric: string; target: string; channel: string }[];
  };
  qaChecklist: {
    id: string;
    category: string;
    item: string;
    required: boolean;
  }[];
}

const GOAL_TRANSLATIONS: Record<string, string> = {
  lead_generation: 'Generera leads och bokningar',
  brand_awareness: 'Bygga varumärkeskännedom',
  recruitment: 'Rekrytering av personal',
  retention: 'Öka kundlojalitet',
  other: 'Generellt kampanjmål'
};

const CHANNEL_LABELS: Record<string, string> = {
  meta: 'Meta (Facebook/Instagram)',
  google: 'Google Ads',
  email: 'E-post',
  sms: 'SMS',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  display: 'Display',
  print: 'Print',
  event: 'Event'
};

serve(withErrorHandling(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestData = await req.json();
  const {
    slotId,
    slotName,
    goalType,
    channels,
    budget,
    startDate,
    endDate,
    personaId,
    offerId,
    periodLabel,
    brandProfileId,
    conceptSummary
  } = requestData;

  console.log('[generate-campaign-pack] Starting:', { 
    slotName, 
    goalType, 
    channels,
    hasPersona: !!personaId,
    hasBrandProfile: !!brandProfileId 
  });

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch brand profile
  let brandProfile = null;
  if (brandProfileId) {
    const { data } = await supabase
      .from('brand_profiles')
      .select('*')
      .eq('id', brandProfileId)
      .single();
    brandProfile = data;
  }

  // Fetch persona if provided
  let persona = null;
  if (personaId) {
    const { data } = await supabase
      .from('personas')
      .select('*')
      .eq('id', personaId)
      .single();
    persona = data;
  }

  // Fetch brand facts
  let brandFacts = null;
  if (brandProfileId) {
    const { data } = await supabase
      .from('brand_facts')
      .select('*')
      .eq('brand_profile_id', brandProfileId)
      .maybeSingle();
    brandFacts = data;
  }

  // Parse budget
  const budgetNum = parseInt(budget?.replace(/[^\d]/g, '') || '10000', 10);
  
  // Calculate campaign duration
  const start = new Date(startDate || Date.now());
  const end = new Date(endDate || Date.now() + 14 * 24 * 60 * 60 * 1000);
  const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 14;
  const durationWeeks = Math.ceil(durationDays / 7);

  // Build system prompt
  const systemPrompt = `Du är en erfaren marknadsföringsbyrå som skapar kompletta kampanjpaket.

VARUMÄRKE:
${brandProfile ? `
- Namn: ${brandProfile.name}
- Mission: ${brandProfile.mission_statement || 'Ej angiven'}
- Tonalitet: ${brandProfile.tone_of_voice || 'Professionell'}
- Arketyp: ${brandProfile.brand_archetype || 'Ej angiven'}
- Målgrupp: ${brandProfile.target_audience_desc || 'Ej angiven'}
${brandProfile.banned_words?.length ? `- Förbjudna ord: ${brandProfile.banned_words.join(', ')}` : ''}
${brandProfile.required_phrases?.length ? `- Obligatoriska fraser: ${brandProfile.required_phrases.join(', ')}` : ''}
` : 'Inget varumärke angivet - använd generell professionell ton.'}

${persona ? `
MÅLPERSONA:
- Namn: ${persona.name}
- Segment: ${persona.segment_type}
- Ålder: ${persona.age_range || 'Ej angiven'}
- Mål: ${persona.goals?.join(', ') || 'Ej angivna'}
- Rädslor: ${persona.fears?.join(', ') || 'Ej angivna'}
- Triggers: ${persona.trigger_words?.join(', ') || 'Ej angivna'}
- Undvik: ${persona.avoid_words?.join(', ') || 'Ej angivna'}
- Tonpreferens: ${persona.tone_preference || 'Ej angiven'}
` : ''}

${brandFacts ? `
FAKTA:
- Tjänster: ${JSON.stringify(brandFacts.services || [])}
- Serviceområden: ${brandFacts.service_areas?.join(', ') || 'Ej angivna'}
- Garantier: ${brandFacts.guarantees?.join(', ') || 'Ej angivna'}
- Prismodell: ${brandFacts.price_model || 'Ej angiven'}
` : ''}

Returnera ett komplett kampanjpaket i JSON-format med:
1. brief - kampanjbrief med mål, målgrupp, budskap
2. concept - kreativt koncept
3. channelPlan - budgetfördelning och KPI:er per kanal
4. calendar - publiceringsschema för kampanjperioden
5. flighting - veckovis budgetfördelning
6. contentVariants - 2-3 textvarianter per kanal
7. tracking - UTM-parametrar och KPI-checklista
8. qaChecklist - kvalitetschecklista

Svara ENDAST med giltig JSON.`;

  const userPrompt = `Skapa ett komplett kampanjpaket för:

KAMPANJ: ${slotName}
MÅL: ${GOAL_TRANSLATIONS[goalType] || goalType}
KANALER: ${channels?.map((c: string) => CHANNEL_LABELS[c] || c).join(', ') || 'Ej valda'}
BUDGET: ${budget || 'Ej angiven'} (totalt ${budgetNum} kr)
PERIOD: ${periodLabel || 'Generell'}
STARTDATUM: ${startDate || 'Ej angivet'}
SLUTDATUM: ${endDate || 'Ej angivet'}
LÄNGD: ${durationDays} dagar (${durationWeeks} veckor)

${conceptSummary ? `BEFINTLIGT KONCEPT:\n${conceptSummary}\n\nBygg vidare på detta koncept.` : ''}

Generera ett komplett kampanjpaket med budget per kanal, publiceringsschema, textvarianter och tracking-setup.`;

  console.log('[generate-campaign-pack] Calling AI...');

  const result = await callAIGatewayJSON<CampaignPackResponse>({
    model: 'google/gemini-2.5-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
  });

  console.log('[generate-campaign-pack] AI response received');

  // Build complete campaign pack
  const campaignPack = {
    id: crypto.randomUUID(),
    slotId,
    createdAt: new Date().toISOString(),
    
    brief: result.brief || {
      campaignName: slotName,
      goal: GOAL_TRANSLATIONS[goalType] || goalType,
      targetAudience: persona?.name || brandProfile?.target_audience_desc || 'Generell målgrupp',
      keyMessage: '',
      emotionalHook: '',
      callToAction: '',
      uniqueAngle: '',
      differentiators: []
    },
    
    concept: result.concept || {
      headline: '',
      subheadline: '',
      visualDirection: '',
      toneDescription: brandProfile?.tone_of_voice || 'Professionell',
      keyVisuals: [],
      colorMood: ''
    },
    
    channelPlan: result.channelPlan || channels?.map((channel: string, index: number) => ({
      channel,
      budget: Math.round(budgetNum / (channels?.length || 1)),
      budgetPercent: Math.round(100 / (channels?.length || 1)),
      frequency: 'Daglig',
      kpis: {
        targetCTR: 2.0,
        targetCPL: 100,
        targetConversions: 10
      },
      contentFormats: ['Bild', 'Text'],
      bestTiming: '08:00-10:00, 18:00-20:00',
      notes: ''
    })) || [],
    
    totalBudget: budgetNum,
    
    contentPack: Object.entries(result.contentVariants || {}).map(([channel, variants]) => ({
      channel,
      variants: (variants as any[]).map((v, i) => ({
        id: `${channel}-${i}`,
        channel,
        mode: 'ad',
        language: 'sv',
        text_blocks: {
          headline: v.headline,
          primary_text: v.primaryText,
          cta: v.cta
        },
        explanation: {
          reasoning: v.hypothesis,
          how_it_uses_brand_guide: ''
        },
        meta: {
          hypothesis: v.hypothesis,
          funnel_stage: goalType === 'brand_awareness' ? 'awareness' : 'conversion',
          recommended_use: channel
        },
        policy_flags: []
      })),
      recommendedVariant: `${channel}-0`,
      hypothesis: (variants as any[])[0]?.hypothesis || ''
    })),
    
    calendar: result.calendar || [],
    flighting: result.flighting || [],
    
    tracking: result.tracking || {
      campaignNamingStandard: `${brandProfile?.name || 'brand'}_${new Date().getFullYear()}_${goalType}_${slotName.toLowerCase().replace(/\s+/g, '_')}`,
      utmCampaign: slotName.toLowerCase().replace(/\s+/g, '_'),
      utmSource: Object.fromEntries((channels || []).map((c: string) => [c, c])),
      utmMedium: Object.fromEntries((channels || []).map((c: string) => [c, c === 'email' ? 'email' : c === 'sms' ? 'sms' : 'cpc'])),
      kpiChecklist: [
        { metric: 'CTR', target: '2%', channel: 'alla' },
        { metric: 'CPL', target: '100 kr', channel: 'alla' },
        { metric: 'Konverteringar', target: '10+', channel: 'alla' }
      ],
      pixelEvents: ['ViewContent', 'Lead', 'CompleteRegistration']
    },
    
    qaChecklist: result.qaChecklist || [
      { id: '1', category: 'copy', item: 'Kontrollera stavning och grammatik', required: true },
      { id: '2', category: 'copy', item: 'Verifiera att CTA är tydlig', required: true },
      { id: '3', category: 'brand', item: 'Kontrollera tonalitet mot Brand Guide', required: true },
      { id: '4', category: 'brand', item: 'Inga förbjudna ord används', required: true },
      { id: '5', category: 'tracking', item: 'UTM-parametrar är korrekta', required: true },
      { id: '6', category: 'tracking', item: 'Pixel-events är konfigurerade', required: true },
      { id: '7', category: 'visual', item: 'Bilder är godkända för användning', required: true },
      { id: '8', category: 'legal', item: 'Juridiska villkor är korrekta', required: false }
    ].map(item => ({ ...item, checked: false })),
    
    personaId: personaId || null,
    segmentType: persona?.segment_type || null,
    goalType,
    
    guardianScore: 85,
    brandAlignmentScore: result.concept?.headline ? 80 : 60
  };

  console.log('[generate-campaign-pack] Pack created:', { 
    packId: campaignPack.id,
    channels: campaignPack.channelPlan.length,
    calendarEntries: campaignPack.calendar.length
  });

  return jsonResponse({
    success: true,
    pack: campaignPack
  });
}));
