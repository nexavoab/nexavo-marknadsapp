// Central Brand Context Wrapper for Edge Functions
// Ensures brand_id is required, validates access, and injects brand context

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";
import { getBrandContext, BrandContext, formatBrandContextForPrompt } from './brand-context.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * BrandContextV1 - Stable schema for edge function payloads
 */
export interface BrandContextV1 {
  schema_version: 1;
  brand_id: string;
  context_version: number;
  identity: {
    name: string;
    tagline?: string;
    archetype?: string;
  };
  voice: {
    tone: string;
    traits?: Record<string, unknown>;
    banned_words?: string[];
    required_phrases?: string[];
  };
  strategy: {
    mission?: string;
    vision?: string;
    positioning?: string;
    audience?: string;
  };
  defaults: {
    headline: string;
    body: string;
  };
}

/**
 * Creates a user-scoped Supabase client from the request's Authorization header.
 * This ensures RLS policies are applied based on the authenticated user.
 */
function createClientFromRequest(req: Request): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });
}

/**
 * Creates a service-role client for operations that need to bypass RLS.
 * Use sparingly and only when absolutely necessary (e.g., system tables like ai_tasks).
 */
function createAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Validates that the current user has access to the specified brand.
 * Uses RLS on brand_profiles - if user can select it, they have access.
 */
async function assertBrandAccess(supabase: SupabaseClient, brand_id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('brand_profiles')
    .select('id')
    .eq('id', brand_id)
    .limit(1);
  
  if (error || !data?.length) return false;
  return true;
}

// Base schema for brand-required payloads
const BaseBrandPayload = z.object({
  brand_id: z.string().uuid().optional(),
  brandProfileId: z.string().uuid().optional(),
  context_version: z.number().int().positive().optional(),
}).refine(data => data.brand_id || data.brandProfileId, {
  message: 'Either brand_id or brandProfileId is required'
});

export interface WithBrandArgs {
  req: Request;
  /** User-scoped client (RLS) - USE FOR READS */
  supabase: SupabaseClient;
  /** Service role client - ONLY for approved writes (e.g., ai_tasks) */
  admin: SupabaseClient;
  /** Brand context in V1 schema */
  brand: BrandContextV1;
  trace_id: string;
  body: Record<string, unknown>;
  /** Pre-formatted brand context for prompt injection */
  brandPrompt: string;
}

type BrandHandler = (args: WithBrandArgs) => Promise<Response>;

/**
 * Convert BrandContext to BrandContextV1 for consistent handler interface
 */
function toBrandContextV1(ctx: BrandContext): BrandContextV1 {
  const positioning = typeof ctx.strategy?.positioning === 'string' 
    ? ctx.strategy.positioning 
    : ctx.strategy?.positioning?.statement;
  
  return {
    schema_version: 1,
    brand_id: ctx.id,
    context_version: ctx.context_version ?? 1,
    identity: {
      name: ctx.name,
      tagline: ctx.tagline ?? undefined,
      archetype: ctx.brand_archetype ?? undefined,
    },
    voice: {
      tone: ctx.tone_of_voice || 'klar, varm och förtroendeingivande',
      traits: ctx.tone_traits ?? undefined,
      banned_words: ctx.banned_words ?? undefined,
      required_phrases: ctx.required_phrases ?? undefined,
    },
    strategy: {
      mission: ctx.mission_statement ?? ctx.strategy?.mission ?? undefined,
      vision: ctx.strategy?.vision ?? undefined,
      positioning: positioning ?? undefined,
      audience: ctx.target_audience_desc ?? undefined,
    },
    defaults: {
      headline: ctx.tagline || ctx.name || 'Upptäck mer',
      body: ctx.mission_statement || 'Vi hjälper dig att lyckas.',
    },
  };
}

/**
 * Check if legacy fallback is disabled via ENV kill switch
 */
function isLegacyFallbackDisabled(): boolean {
  return Deno.env.get('BRAND_LEGACY_FALLBACK') === 'off';
}

/**
 * Wrapper for edge functions that require brand context.
 * Validates brand_id, checks user access via RLS, fetches brand profile, and injects context.
 * 
 * @example
 * ```ts
 * import { withBrand } from "../_shared/withBrand.ts";
 * 
 * export default withBrand(async ({ brand, trace_id, body, brandPrompt, supabase, admin }) => {
 *   // Use supabase for reads (RLS-enforced)
 *   // Use admin only for system writes (e.g., ai_tasks)
 *   // Use brandPrompt for AI system prompts
 *   return new Response(JSON.stringify({ ok: true, trace_id }), {
 *     headers: { 'Content-Type': 'application/json' }
 *   });
 * });
 * ```
 */
export function withBrand(handler: BrandHandler) {
  return async (req: Request): Promise<Response> => {
    const trace_id = crypto.randomUUID();
    const jsonHeaders = { ...corsHeaders, 'X-Trace-Id': trace_id, 'Content-Type': 'application/json' };

    // Handle CORS preflight and HEAD
    if (req.method === 'OPTIONS' || req.method === 'HEAD') {
      return new Response(null, { headers: { ...corsHeaders, 'X-Trace-Id': trace_id } });
    }

    // Reject unsupported methods (GET, DELETE)
    if (req.method === 'GET' || req.method === 'DELETE') {
      return new Response(
        JSON.stringify({ error: 'method_not_allowed', trace_id, allowed: ['POST', 'PUT', 'PATCH'] }),
        { status: 405, headers: { ...jsonHeaders, 'Allow': 'POST, PUT, PATCH, OPTIONS, HEAD' } }
      );
    }

    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      console.error(JSON.stringify({ at: 'withBrand.parse_error', trace_id }));
      return new Response(
        JSON.stringify({ error: 'invalid_json', trace_id }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // Check for legacy fields and handle based on kill switch
    const hasLegacyFields = 'brandTruth' in body || 'brandGuide' in body;
    if (hasLegacyFields) {
      const legacyFields = Object.keys(body).filter(k => ['brandTruth', 'brandGuide'].includes(k));
      
      console.warn(JSON.stringify({
        at: 'withBrand.deprecated_payload',
        trace_id,
        fields: legacyFields,
        ts: new Date().toISOString(),
      }));

      // Kill switch: if BRAND_LEGACY_FALLBACK=off, reject legacy payloads
      if (isLegacyFallbackDisabled()) {
        return new Response(
          JSON.stringify({ 
            error: 'legacy_payload_rejected', 
            trace_id,
            details: `Legacy fields detected: ${legacyFields.join(', ')}. Use brand_id and context_version instead.`,
          }),
          { status: 400, headers: jsonHeaders }
        );
      }
    }

    // Validate base payload structure
    const parsed = BaseBrandPayload.safeParse(body);
    if (!parsed.success) {
      console.warn(JSON.stringify({ at: 'withBrand.validation_error', trace_id, issues: parsed.error.issues }));
      return new Response(
        JSON.stringify({ error: 'invalid_body', trace_id, details: parsed.error.issues }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const brand_id = (body.brand_id || body.brandProfileId) as string;
    const context_version = body.context_version ?? null;
    
    console.log(JSON.stringify({ 
      at: 'withBrand.invoke', 
      trace_id, 
      brand_id, 
      context_version 
    }));

    // Create user-scoped client for access check and reads
    const supabase = createClientFromRequest(req);
    
    // Validate user has access to this brand via RLS
    const hasAccess = await assertBrandAccess(supabase, brand_id);
    if (!hasAccess) {
      console.warn(JSON.stringify({ at: 'withBrand.forbidden', trace_id, brand_id }));
      return new Response(
        JSON.stringify({ error: 'forbidden', trace_id }),
        { status: 403, headers: jsonHeaders }
      );
    }

    // Create admin client for system writes (e.g., ai_tasks)
    const admin = createAdminClient();
    
    // Use admin to fetch full brand context (may need fields user can't see)
    const brandContext = await getBrandContext(admin, { brandProfileId: brand_id });
    
    if (!brandContext) {
      console.error(JSON.stringify({ at: 'withBrand.not_found', trace_id, brand_id }));
      return new Response(
        JSON.stringify({ error: 'brand_not_found', trace_id }),
        { status: 404, headers: jsonHeaders }
      );
    }

    // Convert to V1 schema
    const brand = toBrandContextV1(brandContext);

    // Context version mismatch check
    const requestedVersion = body.context_version as number | undefined;
    const actualVersion = brand.context_version;
    const versionMismatch = requestedVersion !== undefined && requestedVersion !== actualVersion;
    
    if (versionMismatch) {
      console.warn(JSON.stringify({
        at: 'withBrand.context_version_mismatch',
        trace_id,
        brand_id,
        requested: requestedVersion,
        actual: actualVersion,
      }));
    }

    // Pre-format brand context for AI prompts - use V1 whitelist for consistency
    const brandPrompt = formatBrandContextForPrompt(brand);

    // Call the handler with all context
    try {
      const response = await handler({ req, supabase, admin, brand, trace_id, body, brandPrompt });
      
      // Ensure headers are included in response
      const newHeaders = new Headers(response.headers);
      Object.entries(jsonHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });
      
      // Add version mismatch header if applicable
      if (versionMismatch) {
        newHeaders.set('X-Context-Version-Mismatch', 'true');
        newHeaders.set('X-Context-Version-Actual', String(actualVersion));
      }
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      console.error(JSON.stringify({ 
        at: 'withBrand.handler_error', 
        trace_id, 
        error: error instanceof Error ? error.message : String(error) 
      }));
      return new Response(
        JSON.stringify({ error: 'internal_error', trace_id }),
        { status: 500, headers: jsonHeaders }
      );
    }
  };
}

// Export utilities for handlers that need custom validation
export { corsHeaders, createClientFromRequest, createAdminClient, BaseBrandPayload };
