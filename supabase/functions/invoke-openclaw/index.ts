// Supabase Edge Function: invoke-openclaw
// Triggers OpenClaw agent for AI tasks

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENCLAW_URL = "https://minotaur-romeo.exe.xyz:18789/hooks/agent";

interface TaskRequest {
  task_id: string;
  org_id: string;
  task_type: string;
  payload: Record<string, unknown>;
}

function mapTaskToAgent(taskType: string): string {
  const mapping: Record<string, string> = {
    "generate-copy": "nexavo-copy",
    "publish-meta": "nexavo-meta",
    "check-brand": "nexavo-copy",
    "generate-campaign": "nexavo-copy",
  };
  return mapping[taskType] || "nexavo-hq";
}

function buildPrompt(taskType: string, payload: Record<string, unknown>): string {
  const brandContext = payload.brand_context as Record<string, unknown> | undefined;
  const campaign = payload.campaign as Record<string, unknown> | undefined;
  
  switch (taskType) {
    case "generate-copy":
      return `Generera kampanjmaterial.
Brand: ${brandContext?.name || "Unknown"}
Tone: ${Array.isArray(brandContext?.tone) ? brandContext.tone.join(", ") : "professionell"}
Colors: ${JSON.stringify(brandContext?.colors || {})}
Kampanj: ${campaign?.name || ""}
Mål: ${campaign?.goal || ""}
Erbjudande: ${campaign?.offer || ""}
Plattformar: ${Array.isArray(payload.platforms) ? payload.platforms.join(", ") : "instagram"}
Antal varianter: ${payload.variants || 3}

Leverera JSON med format: { "posts": [{ "platform": "...", "copy": "...", "hashtags": [...], "image_prompt": "..." }] }`;

    case "publish-meta":
      return `Publicera följande innehåll till Meta (Facebook/Instagram):
${JSON.stringify(payload.content, null, 2)}

Använd meta-publish skill för att publicera. Rapportera tillbaka resultat med post-IDs.`;

    case "check-brand":
      return `Verifiera att följande innehåll följer varumärkesriktlinjerna:
Brand: ${brandContext?.name || "Unknown"}
Tone: ${Array.isArray(brandContext?.tone) ? brandContext.tone.join(", ") : ""}
Värdeord: ${Array.isArray(brandContext?.values) ? brandContext.values.join(", ") : ""}

Innehåll att granska:
${JSON.stringify(payload.content, null, 2)}

Returnera JSON: { "approved": boolean, "issues": [...], "suggestions": [...] }`;

    default:
      return `Utför följande uppgift (${taskType}):
${JSON.stringify(payload, null, 2)}`;
  }
}

serve(async (req) => {
  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  try {
    const { task_id, org_id, task_type, payload }: TaskRequest = await req.json();

    if (!task_id || !org_id || !task_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: task_id, org_id, task_type" }),
        { status: 400, headers }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if org has AI enabled
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("ai_enabled")
      .eq("id", org_id)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers }
      );
    }

    if (!org.ai_enabled) {
      return new Response(
        JSON.stringify({ error: "AI features not enabled for this organization" }),
        { status: 403, headers }
      );
    }

    // Mark task as processing
    const { error: updateError } = await supabase
      .from("ai_tasks")
      .update({ status: "processing" })
      .eq("id", task_id);

    if (updateError) {
      console.error("Failed to update task status:", updateError);
    }

    // Build OpenClaw request
    const message = buildPrompt(task_type, payload);
    const agentId = mapTaskToAgent(task_type);
    const sessionKey = `hook:nexavo:${org_id}:${task_id}`;

    const openclawPayload = {
      message,
      name: task_type,
      agentId,
      sessionKey,
      wakeMode: "now",
      deliver: false,
      timeoutSeconds: 300,
    };

    // Call OpenClaw
    const openclawToken = Deno.env.get("OPENCLAW_HOOKS_TOKEN");
    if (!openclawToken) {
      throw new Error("OPENCLAW_HOOKS_TOKEN not configured");
    }

    const response = await fetch(OPENCLAW_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openclawToken}`,
      },
      body: JSON.stringify(openclawPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenClaw call failed:", response.status, errorText);

      // Mark task as error
      await supabase
        .from("ai_tasks")
        .update({
          status: "error",
          result: { error: `OpenClaw error: ${response.status}`, details: errorText },
        })
        .eq("id", task_id);

      return new Response(
        JSON.stringify({ error: "OpenClaw call failed", status: response.status }),
        { status: 502, headers }
      );
    }

    const openclawResult = await response.json();

    return new Response(
      JSON.stringify({
        accepted: true,
        sessionKey,
        agentId,
        openclawResponse: openclawResult,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(error) }),
      { status: 500, headers }
    );
  }
});
