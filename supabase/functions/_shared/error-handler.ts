/**
 * Centralized Error Handler for Edge Functions
 * Provides consistent error responses and CORS handling
 */

export class AIError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number = 500, code: string = 'UNKNOWN_ERROR') {
    super(message);
    this.name = 'AIError';
    this.status = status;
    this.code = code;
  }
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Higher-Order Function that wraps edge function handlers
 * Provides automatic CORS handling and standardized error responses
 */
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight automatically
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      return await handler(req);
    } catch (err: unknown) {
      console.error("Edge Function Error:", err);

      let status = 500;
      let message = "Internal Server Error";
      let code = "INTERNAL_ERROR";

      // Handle known error types
      if (err instanceof AIError) {
        status = err.status;
        message = err.message;
        code = err.code;
      } else if (err instanceof Error) {
        const errorMessage = err.message || '';
        
        if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
          status = 429;
          message = "AI Provider is overloaded (Rate Limit). Please try again shortly.";
          code = "RATE_LIMIT_EXCEEDED";
        } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
          status = 401;
          message = "Unauthorized. Please check your API keys.";
          code = "AUTH_ERROR";
        } else if (errorMessage.includes('402') || errorMessage.toLowerCase().includes('payment')) {
          status = 402;
          message = "Payment required. AI credits exhausted.";
          code = "PAYMENT_REQUIRED";
        } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
          status = 504;
          message = "Request timed out. Please try again.";
          code = "TIMEOUT_ERROR";
        } else {
          message = errorMessage || message;
        }
      }

      // Always return JSON, never crash with HTML error page
      return new Response(
        JSON.stringify({ error: message, code }),
        { 
          status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  };
}

/**
 * Helper to create success responses with CORS headers
 */
export function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    { 
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
