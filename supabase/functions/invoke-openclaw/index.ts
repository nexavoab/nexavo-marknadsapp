import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const OPENCLAW_URL = "https://minotaur-romeo.tail4c70a1.ts.net/hooks/agent";
interface TaskRequest {
  task_id: string; org_id: string; task_type: string;
  payload: Record<string, unknown>;
}
serve(async (req) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  try {
    const { task_id, org_id, task_type, payload }: TaskRequest = await req.json();
    if (!task_id || !org_id || !task_type) return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: org, error: orgError } = await supabase.from("organizations").select("ai_enabled").eq("id", org_id).single();
    if (orgError || !org) return new Response(JSON.stringify({ error: "Organization not found" }), { status: 404, headers });
    if (!org.ai_enabled) return new Response(JSON.stringify({ error: "AI not enabled" }), { status: 403, headers });
    await supabase.from("ai_tasks").update({ status: "processing" }).eq("id", task_id);
    const sessionKey = `hook:nexavo:${org_id}:${task_id}`;
    const openclawPayload = { message: JSON.stringify({ task_type, payload }), name: task_type, agentId: "nexavo-gateway", sessionKey, wakeMode: "now", deliver: false, timeoutSeconds: 300 };
    const response = await fetch(OPENCLAW_URL, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("OPENCLAW_HOOKS_TOKEN")}` }, body: JSON.stringify(openclawPayload) });
    if (!response.ok) { const err = await response.text(); await supabase.from("ai_tasks").update({ status: "error", result: { error: `OpenClaw ${response.status}`, details: err } }).eq("id", task_id); return new Response(JSON.stringify({ error: "OpenClaw failed", status: response.status }), { status: 502, headers }); }
    return new Response(JSON.stringify({ accepted: true, sessionKey, agentId: "nexavo-gateway", openclawResponse: await response.json() }), { status: 200, headers });
  } catch (error) { return new Response(JSON.stringify({ error: "Internal error", message: String(error) }), { status: 500, headers }); }
});
