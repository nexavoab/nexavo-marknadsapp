import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withErrorHandling, AIError, jsonResponse, corsHeaders } from "../_shared/error-handler.ts";
import { callAIGatewayJSON, callAIGateway } from "../_shared/ai-gateway.ts";

interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'rectangle' | 'circle' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: 'normal' | 'bold' | 'italic';
  fill?: string;
  align?: 'left' | 'center' | 'right';
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  src?: string;
  radius?: number;
  points?: number[];
  zIndex?: number;
  binding?: string | null;
}

interface CanvasData {
  elements: CanvasElement[];
  width: number;
  height: number;
  backgroundColor?: string;
}

serve(withErrorHandling(async (req) => {
  // Auth check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const body = await req.json();
  const { prompt, width, height, brandContext, remix, textImprovement, originalText, improvement, personaRemix, persona, currentLayout } = body;

  // Handle persona remix request
  if (personaRemix && persona && currentLayout) {
    console.log(`[generate-template-layout] Persona remix: ${persona}`);
    
    const personaStyles: Record<string, string> = {
      'premium': 'Lyxig och exklusiv känsla. Mörka färger, elegant typografi, generöst whitespace.',
      'budget': 'Prisvärt och tillgängligt. Starka färger, stora prissiffror, energisk.',
      'eco': 'Hållbart och naturligt. Jordfärger, organiska former, lugn ton.',
      'playful': 'Rolig och energisk. Glada färger, rundade former, ungdomlig.',
      'professional': 'Seriös och pålitlig. Dämpade färger, rak layout, förtroendegivande.',
      'minimalist': 'Ren och enkel. Mycket whitespace, begränsad färgpalett.',
    };

    const personaSystemPrompt = `Du är en expert på att omdesigna print-material baserat på personas.
PERSONA: ${personaStyles[persona] || personaStyles['professional']}

VIKTIGT: 
1. Behåll samma innehåll och budskap
2. Ändra färger, typsnitt för att matcha personan
3. Returnera ENDAST giltig JSON utan markdown

Dimensioner: ${currentLayout.width}x${currentLayout.height}`;

    const canvasData = await callAIGatewayJSON<CanvasData>({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: personaSystemPrompt },
        { role: 'user', content: `Transformera till "${persona}" stil:\n${JSON.stringify(currentLayout, null, 2)}` }
      ],
    });

    canvasData.elements = canvasData.elements.map((el, idx) => ({
      ...el,
      id: el.id || `el_${idx}`,
      zIndex: el.zIndex ?? idx,
      rotation: el.rotation ?? 0,
    }));

    return jsonResponse({ canvasData, persona });
  }

  // Handle text improvement request
  if (textImprovement && originalText) {
    console.log(`[generate-template-layout] Text improvement: ${improvement}`);
    
    const improvementPrompts: Record<string, string> = {
      'sälj': 'Gör texten mer säljande och övertygande.',
      'kortare': 'Komprimera texten till färre ord utan att tappa budskapet.',
      'formell': 'Skriv om med professionell och formell ton.',
      'lekfull': 'Gör texten mer lekfull och engagerande.',
    };

    const result = await callAIGateway({
      model: 'google/gemini-2.5-flash',
      messages: [
        { 
          role: 'system', 
          content: `Du är en expert på marknadsföringstexter på svenska. Returnera ENDAST den förbättrade texten.
${brandContext?.toneOfVoice ? `Tonalitet: ${brandContext.toneOfVoice}` : ''}` 
        },
        { role: 'user', content: `${improvementPrompts[improvement] || 'Förbättra texten.'}\n\nOriginal: "${originalText}"` }
      ],
    });

    const textContent = (result.rawResponse as any).choices?.[0]?.message?.content;
    return jsonResponse({ improvedText: textContent?.trim() || originalText });
  }

  // Handle layout generation
  if (!prompt) {
    throw new AIError('Prompt is required', 400, 'BAD_REQUEST');
  }

  console.log(`[generate-template-layout] Generating: "${prompt}", ${width}x${height}, remix: ${remix}`);

  const remixInstruction = remix 
    ? `\n\nVIKTIGT: Generera en HELT NY variation med annorlunda placering, färgschema, typsnitt och komposition.`
    : '';

  const systemPrompt = `Du är en expert på att designa print-material och skyltar.
Returnera ENDAST giltig JSON utan markdown.

Canvas-dimensioner: ${width}x${height} pixlar

JSON-schema:
{
  "elements": [
    {
      "id": "unikt_id",
      "type": "text" | "rectangle" | "circle" | "image",
      "x": nummer, "y": nummer,
      "width": nummer, "height": nummer,
      "rotation": 0, "zIndex": nummer,
      "text": "Texten" (för text),
      "fontSize": nummer, "fontFamily": "Inter|Playfair Display|Montserrat|Roboto",
      "fontStyle": "normal|bold", "fill": "#hexfärg", "align": "left|center|right",
      "cornerRadius": nummer (för rectangle), "radius": nummer (för circle),
      "src": "" (för image)
    }
  ],
  "width": ${width},
  "height": ${height},
  "backgroundColor": "#hexfärg"
}

DESIGNPRINCIPER:
1. Visuellt tilltalande layout med tydlig hierarki
2. Använd bakgrundsformer för kontrast
3. Stora läsbara typsnitt för rubriker (40-60px)
4. Se till att text har tillräcklig kontrast

${brandContext ? `VARUMÄRKE:
- Primärfärg: ${brandContext.primaryColor || '#000000'}
- Sekundärfärg: ${brandContext.secondaryColor || '#666666'}
- Tonalitet: ${brandContext.toneOfVoice || 'professionell'}` : ''}
${remixInstruction}`;

  let canvasData: CanvasData;
  try {
    canvasData = await callAIGatewayJSON<CanvasData>({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Skapa en layout för: ${prompt}` }
      ],
    });
  } catch (parseError) {
    console.error('[generate-template-layout] Parse failed, using fallback');
    canvasData = {
      elements: [
        {
          id: 'bg_1', type: 'rectangle', x: 0, y: 0, width: width, height: height,
          fill: brandContext?.primaryColor || '#f3f4f6', zIndex: 0,
        },
        {
          id: 'headline_1', type: 'text', x: width / 2 - 150, y: height / 3, width: 300,
          text: prompt.substring(0, 30), fontSize: 48, fontFamily: 'Montserrat',
          fontStyle: 'bold', fill: '#000000', align: 'center', zIndex: 1,
        },
      ],
      width, height, backgroundColor: '#ffffff',
    };
  }

  canvasData.elements = canvasData.elements.map((el, idx) => ({
    ...el,
    id: el.id || `el_${idx}`,
    zIndex: el.zIndex ?? idx,
    rotation: el.rotation ?? 0,
  }));

  console.log('[generate-template-layout] Success');

  return jsonResponse({ canvasData });
}));
