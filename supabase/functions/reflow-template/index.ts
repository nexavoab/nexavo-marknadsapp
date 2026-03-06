import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ElementInfo {
  id: string;
  type: string;
  role?: string;
  groupId?: string;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontWeight?: number;
}

interface GroupInfo {
  id: string;
  type: string;
  role?: string;
  label?: string;
  elementIds: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

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

  try {
    const { 
      elements, 
      groups,
      sourceWidth, 
      sourceHeight, 
      targetFormat, 
      targetWidth, 
      targetHeight 
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('Missing LOVABLE_API_KEY');
    }

    console.log(`Reflowing from ${sourceWidth}x${sourceHeight} to ${targetFormat} (${targetWidth}x${targetHeight})`);
    console.log(`Elements: ${elements?.length}, Groups: ${groups?.length}`);

    // Prepare element info for AI
    const elementInfos: ElementInfo[] = elements.map((el: any) => ({
      id: el.id,
      type: el.type,
      role: el.role,
      groupId: el.groupId,
      text: el.text?.substring(0, 50), // Truncate long text
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      fontSize: el.fontSize,
      fontWeight: el.fontWeight
    }));

    // Prepare group info
    const groupInfos: GroupInfo[] = (groups || []).map((g: any) => ({
      id: g.id,
      type: g.type,
      role: g.role,
      label: g.label,
      elementIds: g.elementIds
    }));

    // Calculate scale factors
    const scaleX = targetWidth / sourceWidth;
    const scaleY = targetHeight / sourceHeight;
    const aspectChange = (targetWidth / targetHeight) / (sourceWidth / sourceHeight);

    const systemPrompt = `You are an expert Graphic Designer and Layout Engine specializing in responsive design adaptation.

TASK: Intelligently reflow design elements from ${sourceWidth}x${sourceHeight}px to ${targetFormat} format (${targetWidth}x${targetHeight}px).

SCALE FACTORS:
- Horizontal scale: ${scaleX.toFixed(3)}
- Vertical scale: ${scaleY.toFixed(3)}
- Aspect ratio change: ${aspectChange.toFixed(3)} (${aspectChange > 1 ? 'wider' : 'taller'})

SOURCE ELEMENTS:
${JSON.stringify(elementInfos, null, 2)}

GROUP HIERARCHY:
${JSON.stringify(groupInfos, null, 2)}

DESIGN RULES:
1. HIERARCHY PRESERVATION:
   - Elements in 'header' groups stay at top
   - Elements in 'hero' groups get prominent center placement
   - Elements in 'cta' groups stay accessible (bottom third for vertical, right side for horizontal)
   - Elements in 'footer' groups stay at bottom

2. ROLE-BASED POSITIONING:
   - 'h1' (main headline): Large, prominent, usually upper area
   - 'h2' (subheadline): Below h1, smaller but visible
   - 'logo': Corner placement (top-left or top-center)
   - 'cta'/'button': Easy to find, often bottom or center-right
   - 'background': Fill entire canvas (0,0 at full size)
   - 'hero_image': Fill available space, maintain aspect ratio
   - 'badge'/'icon': Keep relative position to parent elements

3. FONT SCALING:
   - Scale fontSize proportionally but with limits:
   - Minimum: 12px
   - Maximum: 120px for h1, 72px for h2, 48px for body
   - For ${aspectChange > 1.3 ? 'much wider' : aspectChange < 0.7 ? 'much taller' : 'similar'} aspect: ${aspectChange > 1.3 ? 'reduce font sizes slightly' : aspectChange < 0.7 ? 'increase font sizes slightly' : 'scale proportionally'}

4. SPACING RULES:
   - Maintain minimum 20px padding from edges
   - Keep proportional spacing between grouped elements
   - Never overlap text on critical image areas

5. SIZE CONSTRAINTS:
   - Canvas is EXACTLY ${targetWidth}x${targetHeight}px
   - All elements must fit within canvas bounds
   - Background/hero images can extend edge-to-edge

RETURN ONLY VALID JSON (no markdown, no explanation):
{
  "updates": [
    {
      "id": "element_id",
      "x": number,
      "y": number,
      "width": number,
      "height": number,
      "fontSize": number (optional, only for text elements)
    }
  ],
  "notes": "Brief description of layout changes made"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate the reflowed layout JSON now.' }
        ],
        temperature: 0.3 // Lower temperature for more consistent layouts
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Reflow API error:', errorText);
      throw new Error(`Reflow generation failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('Raw AI response:', content.substring(0, 500));

    // Parse JSON from response
    let result;
    try {
      // Remove markdown code blocks if present
      const jsonStr = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      
      // Fallback: Simple proportional scaling
      console.log('Using fallback proportional scaling');
      result = {
        updates: elements.map((el: any) => {
          const newX = Math.round(el.x * scaleX);
          const newY = Math.round(el.y * scaleY);
          const newWidth = Math.round(el.width * scaleX);
          const newHeight = Math.round(el.height * scaleY);
          
          // Scale font size with aspect-aware adjustment
          let newFontSize = el.fontSize;
          if (newFontSize) {
            const fontScale = Math.min(scaleX, scaleY);
            newFontSize = Math.round(el.fontSize * fontScale);
            newFontSize = Math.max(12, Math.min(120, newFontSize));
          }

          return {
            id: el.id,
            x: Math.max(0, Math.min(targetWidth - newWidth, newX)),
            y: Math.max(0, Math.min(targetHeight - newHeight, newY)),
            width: Math.min(targetWidth, newWidth),
            height: Math.min(targetHeight, newHeight),
            ...(newFontSize ? { fontSize: newFontSize } : {})
          };
        }),
        notes: 'Fallback proportional scaling applied'
      };
    }

    // Validate updates
    if (!result.updates || !Array.isArray(result.updates)) {
      throw new Error('Invalid response format: missing updates array');
    }

    // Ensure all coordinates are within bounds
    result.updates = result.updates.map((update: any) => ({
      ...update,
      x: Math.max(0, Math.min(targetWidth - (update.width || 10), update.x || 0)),
      y: Math.max(0, Math.min(targetHeight - (update.height || 10), update.y || 0)),
      width: Math.min(targetWidth, update.width || 100),
      height: Math.min(targetHeight, update.height || 100)
    }));

    console.log(`Reflow complete: ${result.updates.length} elements updated`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Reflow error:', errorMessage);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      updates: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
