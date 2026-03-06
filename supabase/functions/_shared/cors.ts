/**
 * Centralized CORS headers for edge functions
 * Re-exports from error-handler.ts for consistency
 */
export { corsHeaders } from "./error-handler.ts";

/**
 * Handle CORS preflight request
 * Returns Response if OPTIONS method, else null
 * 
 * Usage:
 * ```ts
 * const cors = handleCors(req);
 * if (cors) return cors;
 * ```
 */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      } 
    });
  }
  return null;
}
