import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callAIGateway } from "../_shared/ai-gateway.ts";

/**
 * @deprecated Use `run-preflight-check` edge function instead.
 * This endpoint is maintained for backwards compatibility.
 */

interface BrandGuardrail {
  id: string;
  name: string;
  description: string | null;
  rule_type: 'forbidden_words' | 'required_elements' | 'tone_check' | 'length_check' | 'custom';
  rule_config: Record<string, any>;
  severity: 'error' | 'warning' | 'info';
}

interface ViolationResult {
  guardrail_id: string;
  guardrail_name: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: string[];
}

const deprecatedHeaders = {
  'X-Deprecated': 'true',
  'X-Deprecation-Target': 'run-preflight-check',
};

const baseHeaders = { 
  ...corsHeaders, 
  ...deprecatedHeaders,
  'Content-Type': 'application/json' 
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: baseHeaders });
  }

  console.warn(JSON.stringify({
    event: "deprecated_endpoint_used",
    endpoint: "check-brand-guardrails",
    migration_target: "run-preflight-check",
    ts: new Date().toISOString(),
  }));

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: baseHeaders,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: baseHeaders,
      });
    }

    const { content, content_type = 'text' } = await req.json();

    if (!content) {
      return new Response(JSON.stringify({ error: 'Content is required' }), {
        status: 400,
        headers: baseHeaders,
      });
    }

    console.log(`[check-brand-guardrails] Checking for user ${user.id}, content type: ${content_type}`);

    const { data: guardrails, error: guardrailsError } = await supabaseClient
      .from('brand_guardrails')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (guardrailsError) {
      console.error('[check-brand-guardrails] Error fetching guardrails:', guardrailsError);
      throw guardrailsError;
    }

    console.log(`[check-brand-guardrails] Found ${guardrails?.length || 0} active guardrails`);

    const violations: ViolationResult[] = [];
    const contentLower = content.toLowerCase();

    for (const guardrail of (guardrails as BrandGuardrail[]) || []) {
      const config = guardrail.rule_config;

      switch (guardrail.rule_type) {
        case 'forbidden_words': {
          const words = (config.words as string[]) || [];
          const foundWords = words.filter(word => 
            contentLower.includes(word.toLowerCase())
          );
          if (foundWords.length > 0) {
            violations.push({
              guardrail_id: guardrail.id,
              guardrail_name: guardrail.name,
              severity: guardrail.severity,
              message: `Förbjudna ord hittade: ${foundWords.join(', ')}`,
              details: foundWords,
            });
          }
          break;
        }

        case 'required_elements': {
          const elements = (config.elements as string[]) || [];
          const missingElements = elements.filter(element => 
            !contentLower.includes(element.toLowerCase())
          );
          if (missingElements.length > 0) {
            violations.push({
              guardrail_id: guardrail.id,
              guardrail_name: guardrail.name,
              severity: guardrail.severity,
              message: `Saknade obligatoriska element: ${missingElements.join(', ')}`,
              details: missingElements,
            });
          }
          break;
        }

        case 'length_check': {
          const minLength = config.min_length as number | undefined;
          const maxLength = config.max_length as number | undefined;
          const contentLength = content.length;

          if (minLength && contentLength < minLength) {
            violations.push({
              guardrail_id: guardrail.id,
              guardrail_name: guardrail.name,
              severity: guardrail.severity,
              message: `Texten är för kort (${contentLength} tecken, minimum ${minLength})`,
            });
          }
          if (maxLength && contentLength > maxLength) {
            violations.push({
              guardrail_id: guardrail.id,
              guardrail_name: guardrail.name,
              severity: guardrail.severity,
              message: `Texten är för lång (${contentLength} tecken, maximum ${maxLength})`,
            });
          }
          break;
        }

        case 'tone_check': {
          const targetTone = config.target_tone as string;
          const forbiddenTones = (config.forbidden_tones as string[]) || [];
          
          if (targetTone || forbiddenTones.length > 0) {
            try {
              const result = await callAIGateway({
                model: 'google/gemini-2.5-flash',
                messages: [
                  {
                    role: 'system',
                    content: `Du är en expert på att analysera tonalitet i texter. Analysera tonen i texten och returnera ENDAST ett av dessa svar: "professional", "casual", "formal", "friendly", "aggressive", "neutral", "sales", "empathetic". Svara med ett enda ord.`
                  },
                  {
                    role: 'user',
                    content: content
                  }
                ],
                meta: { functionName: 'check-brand-guardrails' }
              });

              const detectedTone = (result.rawResponse as any).choices?.[0]?.message?.content?.toLowerCase()?.trim();
              
              console.log(`[check-brand-guardrails] Detected tone: ${detectedTone}, target: ${targetTone}, forbidden: ${forbiddenTones}`);

              if (targetTone && detectedTone !== targetTone.toLowerCase()) {
                violations.push({
                  guardrail_id: guardrail.id,
                  guardrail_name: guardrail.name,
                  severity: guardrail.severity,
                  message: `Fel tonalitet: "${detectedTone}" (förväntat: "${targetTone}")`,
                });
              }

              if (forbiddenTones.some(t => t.toLowerCase() === detectedTone)) {
                violations.push({
                  guardrail_id: guardrail.id,
                  guardrail_name: guardrail.name,
                  severity: guardrail.severity,
                  message: `Förbjuden tonalitet upptäckt: "${detectedTone}"`,
                });
              }
            } catch (aiError) {
              console.error('[check-brand-guardrails] AI tone check error:', aiError);
            }
          }
          break;
        }

        case 'custom': {
          const patterns = (config.patterns as string[]) || [];
          for (const pattern of patterns) {
            try {
              const regex = new RegExp(pattern, 'gi');
              const matches = content.match(regex);
              if (matches && matches.length > 0) {
                violations.push({
                  guardrail_id: guardrail.id,
                  guardrail_name: guardrail.name,
                  severity: guardrail.severity,
                  message: config.message || `Matchade mönster: ${pattern}`,
                  details: matches,
                });
              }
            } catch (regexError) {
              console.error(`[check-brand-guardrails] Invalid regex pattern: ${pattern}`, regexError);
            }
          }
          break;
        }
      }
    }

    console.log(`[check-brand-guardrails] Found ${violations.length} violations`);

    const severityOrder = { error: 0, warning: 1, info: 2 };
    violations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const hasErrors = violations.some(v => v.severity === 'error');
    const hasWarnings = violations.some(v => v.severity === 'warning');

    return new Response(JSON.stringify({
      passed: violations.length === 0,
      has_errors: hasErrors,
      has_warnings: hasWarnings,
      violations,
      checked_guardrails: guardrails?.length || 0,
    }), {
      status: 200,
      headers: baseHeaders,
    });

  } catch (error) {
    console.error('[check-brand-guardrails] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: baseHeaders,
    });
  }
});
