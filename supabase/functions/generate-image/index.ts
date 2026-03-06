import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.22.4";
import { withBrand, BrandContextV1, corsHeaders } from "../_shared/withBrand.ts";
import { callAIGatewayImage } from "../_shared/ai-gateway.ts";

const BodySchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  aspectRatio: z.string().optional(),
  stylePreset: z.string().optional(),
  variant: z.string().optional(),
  platform: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  negativePrompt: z.string().optional(),
  imageModel: z.string().optional(), // Allow caller to specify model (e.g., flash vs pro)
});

// Anti-AI/Stock photo negative prompts
const DEFAULT_NEGATIVE_PROMPTS = [
  "text", "logos", "watermarks", "typography", "letters", "words", "labels", "signs",
  "plastic skin", "airbrushed", "overly smooth skin", "perfect symmetry",
  "stock photo", "studio lighting", "ring light", "corporate blue",
  "posed smile", "looking at camera", "model-perfect", "fashion photography",
  "CGI", "3D render", "illustration", "cartoon", "anime",
  "blurred faces", "distorted hands", "extra fingers", "deformed"
].join(", ");

const styleModifiers: Record<string, string> = {
  professional: "clean professional lighting, corporate setting, trust-inspiring, sharp details",
  creative: "vibrant colors, dynamic composition, artistic flair, eye-catching visuals",
  minimalist: "minimalist design, clean white space, simple composition, elegant simplicity",
  brand: "warm natural lighting, Swedish summer feeling, authentic emotions, cozy atmosphere",
  studio: "clean studio lighting, white background, professional setting, sharp details"
};

const platformOptimizations: Record<string, string> = {
  'instagram-feed': "perfect for Instagram feed, square composition, scroll-stopping",
  'instagram-story': "vertical format for Stories, full-screen impact, mobile-optimized",
  'facebook': "optimized for Facebook feed, engaging, shareable content",
  'linkedin': "professional LinkedIn post, business-appropriate",
};

const aspectDescriptions: Record<string, string> = {
  '1:1': 'square format (1:1)',
  '9:16': 'vertical portrait format (9:16)',
  '4:5': 'portrait format (4:5)',
  '1.91:1': 'wide landscape format (1.91:1)',
  '16:9': 'wide landscape format (16:9)'
};

export default withBrand(async ({ brand, trace_id, body, brandPrompt }) => {
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'invalid_body', trace_id, details: parsed.error.issues }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { prompt, aspectRatio, stylePreset, variant, platform, width, height, negativePrompt, imageModel } = parsed.data;

  console.log(JSON.stringify({
    at: 'generate-image.start',
    trace_id,
    brand_id: brand.brand_id,
    context_version: brand.context_version,
    prompt: prompt.substring(0, 50),
    aspectRatio,
    platform,
  }));

  // Build brand guidelines from V1 context
  const brandGuidelines = [
    `Brand: ${brand.identity.name}`,
    brand.voice.tone ? `Tone: ${brand.voice.tone}` : null,
    brand.identity.archetype ? `Personality: ${brand.identity.archetype}` : null,
  ].filter(Boolean).join('. ') || "Suitable for marketing, conveying trust and professionalism.";

  let enhancedPrompt: string;

  // Determine negative prompts to use
  const effectiveNegativePrompt = negativePrompt || DEFAULT_NEGATIVE_PROMPTS;

  // If this is a complete moodboard prompt with anti-plastic filters, trust it completely
  if (prompt.includes('MANDATORY TECHNICAL STYLE') || prompt.includes('ABSOLUTELY FORBIDDEN') || prompt.includes('Contax T2') || prompt.includes('Hasselblad')) {
    console.log(JSON.stringify({ at: 'generate-image.moodboard_mode', trace_id }));
    // Art Director prompts already have quality baked in, just add negative prompts
    enhancedPrompt = `${prompt}\n\nNEGATIVE PROMPT (DO NOT INCLUDE): ${effectiveNegativePrompt}`;
  } else {
    // Standard image generation with our usual enhancements
    enhancedPrompt = `Create a professional marketing image: ${prompt}. 
Style: ${styleModifiers[stylePreset || 'professional'] || styleModifiers.professional}. 
Format: ${aspectDescriptions[aspectRatio || '1:1'] || aspectDescriptions['1:1']}.
${platform ? platformOptimizations[platform] || '' : ''}
${brandGuidelines}
Ultra high resolution, photorealistic quality.

NEGATIVE PROMPT (DO NOT INCLUDE): ${effectiveNegativePrompt}`;

    if (variant === 'B') {
      enhancedPrompt += " Alternative creative interpretation with different angle or composition.";
    }
    if (width && height) {
      enhancedPrompt += ` Optimized for ${width}x${height} pixels.`;
    }
  }

  const { imageUrl, textContent } = await callAIGatewayImage({
    messages: [{ role: 'user', content: enhancedPrompt }],
    ...(imageModel && { model: imageModel }), // Use caller-specified model if provided
  }, {
    'X-Trace-Id': trace_id,
    'X-Brand-Id': brand.brand_id,
    'X-Context-Version': String(brand.context_version),
  });

  console.log(JSON.stringify({
    at: 'generate-image.complete',
    trace_id,
    brand_id: brand.brand_id,
    variant,
    platform,
  }));

  return new Response(JSON.stringify({
    trace_id,
    imageUrl,
    message: textContent || 'Image generated successfully',
    variant: variant || null,
    platform: platform || null
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
