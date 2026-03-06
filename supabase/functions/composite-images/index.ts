import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withErrorHandling, AIError, jsonResponse, corsHeaders } from "../_shared/error-handler.ts";
import { callAIGatewayImage } from "../_shared/ai-gateway.ts";

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

  const { foregroundImage, backgroundImage, instruction, options } = await req.json();

  if (!foregroundImage || !backgroundImage) {
    throw new AIError("Both foreground and background images are required", 400, "BAD_REQUEST");
  }

  const compositeOptions = options || {};
  const position = compositeOptions.position || 'center';
  const scale = compositeOptions.scale || 100;
  const addShadow = compositeOptions.addShadow !== false;
  const addReflection = compositeOptions.addReflection || false;

  const positionMap: Record<string, string> = {
    'top-left': 'in the top-left area',
    'top-center': 'at the top center',
    'top-right': 'in the top-right area',
    'center-left': 'on the left side, vertically centered',
    'center': 'centered in the scene',
    'center-right': 'on the right side, vertically centered',
    'bottom-left': 'in the bottom-left area',
    'bottom-center': 'at the bottom center',
    'bottom-right': 'in the bottom-right area',
  };
  const positionText = positionMap[position] || 'centered in the scene';
  const scaleText = scale !== 100 ? `Scale the foreground to approximately ${scale}% of natural size.` : '';
  const userPrompt = instruction || 'Place the foreground naturally onto the background.';

  const systemPrompt = `You are an expert image compositor. Combine these two images following these rules:

CRITICAL PRESERVATION RULES - FOLLOW EXACTLY:
1. Image 1 is the FOREGROUND subject. You MUST:
   - PRESERVE the EXACT original colors - NEVER change, shift, tint, or alter any color
   - PRESERVE the EXACT patterns, textures, logos, text, and all visual details
   - PRESERVE the EXACT shape and proportions
   
2. Image 2 is the BACKGROUND scene.
3. NEVER modify, recolor, stylize, or artistically interpret the foreground subject.

COMPOSITING INSTRUCTIONS:
- Place the foreground ${positionText}
${scaleText ? `- ${scaleText}` : ''}
- Match the lighting direction from the background onto the foreground edges
${addShadow ? '- Add a natural, realistic ground shadow' : '- Do NOT add shadows'}
${addReflection ? '- Add a subtle reflection if surface appears reflective' : ''}

USER REQUEST: ${userPrompt}`;

  console.log('[composite-images] Starting:', { position, scale, addShadow });

  const { imageUrl } = await callAIGatewayImage({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: systemPrompt },
        { type: 'image_url', image_url: { url: foregroundImage } },
        { type: 'image_url', image_url: { url: backgroundImage } }
      ]
    }],
  });

  console.log('[composite-images] Success');

  return jsonResponse({ imageUrl, message: 'Images composited successfully' });
}));
