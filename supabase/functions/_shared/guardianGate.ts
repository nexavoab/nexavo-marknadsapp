// supabase/functions/_shared/guardianGate.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { BrandContextV1, PreflightResultV1 } from "./preflight.types.ts";
import { runPreflight, hashContent } from "./preflight.core.ts";
import { corsHeaders } from "./cors.ts";

// ============================================
// TYPES
// ============================================

export type GuardianPolicy = "fail_closed" | "fail_open";
export type GuardianMode = "user" | "service";

export interface GuardianGateInput {
  request_id?: string;
  brand_profile_id: string;
  channel: string;
  content: string;
  asset_type: string;
  guide_mode?: "PUBLISHED" | "DRAFT" | string;
  guide_version_id?: string;
}

export interface GuardianGateOptions {
  policy?: GuardianPolicy; // default fail_closed
  mode?: GuardianMode; // default user
  source?: string; // e.g. "execute-pending-action"
}

export interface GuardianGateResponse {
  preflight: PreflightResultV1 | null;
  hard_fail: boolean;
  blocked: boolean;
  guide_version_id?: string;
}

// corsHeaders imported from ./cors.ts

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Returns a standardized 409 response when Guardian blocks an action.
 */
export function guardianBlockedResponse(preflight: PreflightResultV1 | null): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error_code: "GUARDIAN_BLOCKED",
      message: "Blockerad av Guardian. Åtgärda blockerande fel innan du kan fortsätta.",
      preflight,
    }),
    {
      status: 409,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    },
  );
}

/**
 * Returns a standardized 409 response when Guardian Gate itself fails.
 */
export function guardianGateFailedResponse(message = "Guardian kunde inte validera. Försök igen."): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error_code: "GUARDIAN_GATE_FAILED",
      message,
    }),
    {
      status: 409,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    },
  );
}

// hashContent imported from ./preflight.core.ts

/**
 * Flattens variant text_blocks to a string for preflight checking.
 */
export function gateContentFromVariantTextBlocks(text_blocks: unknown): string {
  if (typeof text_blocks === "string") return text_blocks;
  if (!text_blocks) return "";
  
  try {
    if (Array.isArray(text_blocks)) {
      return text_blocks
        .map((block: any) => {
          if (typeof block === "string") return block;
          if (block && typeof block === "object") {
            return block.text || block.content || block.value || JSON.stringify(block);
          }
          return String(block);
        })
        .join("\n");
    }
    
    if (typeof text_blocks === "object") {
      const obj = text_blocks as Record<string, unknown>;
      const values = Object.values(obj)
        .filter((v) => typeof v === "string" || (v && typeof v === "object"))
        .map((v) => (typeof v === "string" ? v : JSON.stringify(v)));
      return values.join("\n");
    }
    
    return JSON.stringify(text_blocks);
  } catch {
    return JSON.stringify(text_blocks ?? "");
  }
}

// ============================================
// GUARDIAN GATE
// ============================================

/**
 * Fail-closed Guardian Gate:
 * - If brand context cannot be loaded => block (unless policy=fail_open)
 * - If preflight cannot be executed => block (unless policy=fail_open)
 * - If preflight hard_fail => blocked when policy=fail_closed
 *
 * @param req - The incoming request (for auth header)
 * @param input - Guardian Gate input parameters
 * @param opts - Options: policy, mode, source
 */
export async function guardianGate(
  req: Request,
  input: GuardianGateInput,
  opts: GuardianGateOptions = {},
): Promise<GuardianGateResponse> {
  const policy: GuardianPolicy = opts.policy ?? "fail_closed";
  const mode: GuardianMode = opts.mode ?? "user";
  const source = opts.source ?? "guardian-gate";

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    if (policy === "fail_open") {
      return { blocked: false, hard_fail: false, preflight: null };
    }
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const canService = Boolean(supabaseServiceKey);

  // In user mode we require Authorization (RLS). In service mode we require service key.
  if (mode === "user" && !authHeader) {
    if (policy === "fail_open") {
      return { blocked: false, hard_fail: false, preflight: null };
    }
    throw new Error("Missing Authorization header (user mode)");
  }
  if (mode === "service" && !canService) {
    if (policy === "fail_open") {
      return { blocked: false, hard_fail: false, preflight: null };
    }
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (service mode)");
  }

  // Create Supabase client based on mode
  const clientKey = mode === "service" ? supabaseServiceKey! : supabaseAnonKey;
  const clientOpts = mode === "user" && authHeader
    ? { global: { headers: { Authorization: authHeader } } }
    : undefined;
  
  const userSupabase = createClient(supabaseUrl, clientKey, clientOpts);

  // 1) Load BrandContextV1 (fail-closed)
  const { data: ctx, error: ctxErr } = await userSupabase.functions.invoke("get-brand-context", {
    body: {
      brandId: input.brand_profile_id,
      guideMode: input.guide_mode ?? "PUBLISHED",
      guideVersionId: input.guide_version_id,
    },
  });

  if (ctxErr || !ctx) {
    console.error("[GuardianGate] Could not load BrandContextV1:", ctxErr);
    if (policy === "fail_open") {
      return { blocked: false, hard_fail: false, preflight: null };
    }
    throw new Error(`Could not load BrandContextV1: ${ctxErr?.message ?? "unknown"}`);
  }

  const brandContextV1 = ctx as BrandContextV1;
  const guideVersionId = (ctx as any)?.meta?.guide_version_id ?? input.guide_version_id ?? undefined;

  // 2) Run preflight core (no HTTP)
  let preflight: PreflightResultV1;
  try {
    preflight = runPreflight(brandContextV1, {
      request_id: input.request_id ?? crypto.randomUUID(),
      brand_profile_id: input.brand_profile_id,
      channel: input.channel,
      content: input.content,
      asset_type: input.asset_type,
      guide_version_id: guideVersionId,
    });
  } catch (e) {
    console.error("[GuardianGate] runPreflight failed:", e);
    if (policy === "fail_open") {
      return { blocked: false, hard_fail: false, preflight: null };
    }
    throw e;
  }

  // 3) Log preflight result (best effort, never flips blocked->allowed)
  if (supabaseServiceKey) {
    try {
      const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

      // Extract user_id safely
      let userId: string | null = null;
      if (authHeader) {
        try {
          const token = authHeader.replace(/^Bearer\s+/i, "");
          const isJwt = token.split(".").length === 3;
          if (isJwt) {
            const { data: { user } } = await userSupabase.auth.getUser(token);
            userId = user?.id ?? null;
          }
        } catch {
          userId = null;
        }
      }

      const contentHash = await hashContent(input.content);

      await serviceSupabase.from("preflight_results").insert({
        user_id: userId,
        brand_profile_id: input.brand_profile_id,
        content_type: input.asset_type,
        channel: input.channel,
        content_hash: contentHash,
        content_preview: input.content.substring(0, 200),
        passed: !preflight.hard_fail,
        has_errors: preflight.hard_fail,
        has_warnings: (preflight.violations ?? []).some((v) => v.severity === "soft"),
        error_count: (preflight.violations ?? []).filter((v) => v.severity === "hard").length,
        warning_count: (preflight.violations ?? []).filter((v) => v.severity === "soft").length,
        info_count: 0,
        violations: preflight.violations,
        source,
        request_id: preflight.request_id,
        guide_version_id: preflight.guide_version_id,
        scores: preflight.scores,
        hard_fail: preflight.hard_fail,
        summary: preflight.summary,
      });
    } catch (logErr) {
      console.warn("[GuardianGate] Failed to log preflight result:", logErr);
    }
  }

  // 4) Determine if blocked based on policy
  const blocked = policy === "fail_closed" && preflight.hard_fail;

  console.log(`[GuardianGate] ${source}: ${input.asset_type}/${input.channel}: hard_fail=${preflight.hard_fail}, policy=${policy}, blocked=${blocked}`);

  return { preflight, hard_fail: preflight.hard_fail, blocked, guide_version_id: guideVersionId };
}
