import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENCLAW_URL = "https://minotaur-romeo.tail4c70a1.ts.net/hooks/agent";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function mapTaskToAgent(taskType: string): string {
  const mapping: Record<string, string> = {
    "generate-copy": "nexavo-gateway",
    "publish-meta": "nexavo-gateway",
    "check-brand": "nexavo-gateway",
    "generate-campaign": "nexavo-gateway",
    "chat": "nexavo-gateway",
  };
  return mapping[taskType] ?? "nexavo-gateway";
}

function buildPrompt(taskType: string, payload: Record<string, unknown>): string {
  const campaign = payload.campaign as Record<string, unknown> | undefined;
  const brandContext = payload.brand_context as Record<string, unknown> | undefined;

  switch (taskType) {
    case "chat":
      return `${payload.message || payload.brief || JSON.stringify(payload)}`;

    case "generate-copy":
      return `Generera kampanjmaterial.
Brand: ${brandContext?.name ?? "Unknown"}
Kampanj: ${campaign?.name ?? ""}
Mål: ${campaign?.goal ?? ""}
Erbjudande: ${campaign?.offer ?? ""}
Plattformar: ${Array.isArray(payload.platforms) ? payload.platforms.join(", ") : "instagram"}
Antal varianter: ${payload.variants ?? 3}

Returnera JSON med format: { "posts": [{ "platform": "...", "copy": "...", "hashtags": [...] }] }`;

    case "generate-concept":
      return `Skapa 3 kampanjkoncept för: "${payload.brief ?? payload.message ?? ""}"
Kanaler: ${Array.isArray(payload.channels) ? payload.channels.join(", ") : "instagram"}

Returnera JSON:
{"concepts":[{"headline":"","subheadline":"","keyMessage":"","visualDirection":"","emotionalHook":""}]}`;

    default:
      return `Utför uppgift (${taskType}):\n${JSON.stringify(payload, null, 2)}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

  try {
    const { task_id, org_id, task_type, payload } = await req.json();

    if (!task_id || !org_id || !task_type) {
      return new Response(JSON.stringify({ error: "Missing required fields: task_id, org_id, task_type" }), { status: 400, headers });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: org } = await supabase.from("organizations").select("ai_enabled").eq("id", org_id).single();
    if (!org?.ai_enabled) {
      return new Response(JSON.stringify({ error: "AI not enabled for this organization" }), { status: 403, headers });
    }

    await supabase.from("ai_tasks").update({ status: "processing" }).eq("id", task_id);

    const message = buildPrompt(task_type, payload ?? {});
    const agentId = mapTaskToAgent(task_type);
    const sessionKey = `hook:nexavo:${org_id}:${task_id}`;

    const openclawToken = Deno.env.get("OPENCLAW_HOOKS_TOKEN");
    const response = await fetch(OPENCLAW_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openclawToken}` },
      body: JSON.stringify({ message, agentId, sessionKey, wakeMode: "now", deliver: false, timeoutSeconds: 300 }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      await supabase.from("ai_tasks").update({ status: "error", result: { error: errorText } }).eq("id", task_id);
      return new Response(JSON.stringify({ error: "OpenClaw call failed", details: errorText }), { status: 502, headers });
    }

    const openclawResult = await response.json();
    return new Response(JSON.stringify({ accepted: true, sessionKey, agentId, openclawResponse: openclawResult }), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error", message: String(error) }), { status: 500, headers });
  }
});
