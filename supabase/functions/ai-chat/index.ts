import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENCLAW_URL = "https://minotaur-romeo.tail4c70a1.ts.net/hooks/agent";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { message, session_id } = await req.json();

    const response = await fetch(OPENCLAW_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("OPENCLAW_HOOKS_TOKEN")}`,
      },
      body: JSON.stringify({
        message,
        agentId: "nexavo-gateway",
        sessionKey: `hook:nexavo:chat:${session_id || "default"}`,
        wakeMode: "now",
        deliver: false,
        timeoutSeconds: 60,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: err }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    return new Response(JSON.stringify({ reply: result?.reply || result?.message || "OK" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
