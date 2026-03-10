import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { campaignBrief, targetChannels, brandContext } = body;

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

    const channelList = Array.isArray(targetChannels) ? targetChannels.join(', ') : 'instagram';
    const brandName = brandContext?.name || 'Varumärket';

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: `Du är en kreativ copywriter. Returnera ALLTID valid JSON, inget annat.`,
        messages: [{
          role: 'user',
          content: `Skapa 3 kampanjkoncept för: "${campaignBrief || 'Kampanj'}" på kanalerna: ${channelList}.

Returnera ENBART denna JSON (ingen extra text):
{"concepts":[{"headline":"Rubrik här","subheadline":"Underrubrik här","keyMessage":"Kärnbudskap här","visualDirection":"Visuell beskrivning","emotionalHook":"Emotionell krok"}]}`
        }]
      })
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      throw new Error(`Anthropic ${anthropicRes.status}: ${errText}`);
    }

    const data = await anthropicRes.json();
    const text = data?.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`Kunde inte parsa JSON: ${text.substring(0,200)}`);
    
    const result = JSON.parse(match[0]);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('generate-concept error:', err);
    return new Response(JSON.stringify({ error: String(err), concepts: [] }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
