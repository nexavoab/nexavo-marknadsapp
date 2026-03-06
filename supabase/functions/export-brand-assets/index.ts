// supabase/functions/export-brand-assets/index.ts
// Guardian-gated export validation for brand assets (PDF, HTML, etc.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/error-handler.ts";
import { guardianGate, guardianBlockedResponse, guardianGateFailedResponse } from "../_shared/guardianGate.ts";

interface ExportRequest {
  brand_profile_id: string;
  export_type: "pitch" | "guidelines" | "onepager" | "print" | "creative";
  content: string;
  asset_type?: string;
  channel?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ExportRequest = await req.json();
    const { brand_profile_id, export_type, content, asset_type, channel } = body;

    // Validate required fields
    if (!brand_profile_id || !export_type || !content) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          details: "brand_profile_id, export_type, and content are required",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine channel from export type
    const exportChannel = channel || `export_${export_type}`;

    // Run Guardian Gate with fail-closed policy
    const gateResult = await guardianGate(req, {
      brand_profile_id,
      channel: exportChannel,
      content,
      asset_type: asset_type || export_type,
    }, {
      policy: "fail_closed",
      mode: "user",
    });

    // If Guardian Gate itself failed (no brand context, etc.)
    if (!gateResult.preflight) {
      console.error("[export-brand-assets] Guardian Gate failed - no preflight result");
      return guardianGateFailedResponse("Guardian Gate kunde inte köras för export");
    }

    // If content is blocked
    if (gateResult.blocked) {
      console.warn("[export-brand-assets] Export blocked by Guardian Gate", {
        brand_profile_id,
        export_type,
        hard_fail: gateResult.hard_fail,
        violations: gateResult.preflight.violations?.length || 0,
      });
      return guardianBlockedResponse(gateResult.preflight);
    }

    // Content approved - return approval token
    const approvalToken = crypto.randomUUID();
    const approvedAt = new Date().toISOString();

    console.log("[export-brand-assets] Export approved", {
      brand_profile_id,
      export_type,
      approval_token: approvalToken,
      scores: gateResult.preflight.scores,
    });

    return new Response(
      JSON.stringify({
        approved: true,
        approval_token: approvalToken,
        approved_at: approvedAt,
        export_type,
        preflight: {
          scores: gateResult.preflight.scores,
          violations: gateResult.preflight.violations,
          summary: gateResult.preflight.summary,
          hard_fail: gateResult.preflight.hard_fail,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[export-brand-assets] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Export validation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
