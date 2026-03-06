/**
 * AI Gateway Helper - Centralized Lovable AI API calls
 * Combines retry logic, error handling, response parsing, and telemetry
 */

import { fetchWithRetry, EnhancedRetryOptions } from "./retry-client.ts";
import { AIError } from "./error-handler.ts";
import { cleanAndParseJSON } from "./json-validator.ts";

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ═══════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════

export type AIGatewayErrorCode = 
  | 'RATE_LIMIT' 
  | 'AUTH' 
  | 'TIMEOUT' 
  | 'NETWORK' 
  | 'SERVER' 
  | 'INVALID_RESPONSE' 
  | 'BUDGET_EXCEEDED'
  | 'CONFIG_ERROR';

export class AIGatewayError extends Error {
  constructor(
    public code: AIGatewayErrorCode,
    message: string,
    public status?: number,
    public retryAfterMs?: number
  ) {
    super(message);
    this.name = 'AIGatewayError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export type ContentPart = 
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface AIGatewayOptions {
  model?: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string | ContentPart[];
  }>;
  tools?: Array<{
    type: "function";
    function: {
      name: string;
      description?: string;
      parameters: Record<string, unknown>;
    };
  }>;
  tool_choice?: { type: "function"; function: { name: string } };
  max_tokens?: number;
  temperature?: number;
  modalities?: string[];
  
  // Robustness options
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
  
  // Metadata for telemetry
  meta?: {
    requestId?: string;
    orgId?: string;
    brandId?: string;
    functionName?: string;
    skill?: string;
  };
}

export interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface AIGatewayResult<T = unknown> {
  data: T;
  rawResponse: unknown;
  model: string;
  usage?: TokenUsage;
  durationMs: number;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN GATEWAY FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Call Lovable AI Gateway with automatic retry, timeout, and error handling.
 * Logs usage telemetry (tokens, model, duration) when available.
 */
export async function callAIGateway<T = unknown>(
  options: AIGatewayOptions,
  extraHeaders?: Record<string, string>
): Promise<AIGatewayResult<T>> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    throw new AIGatewayError("CONFIG_ERROR", "LOVABLE_API_KEY is not configured", 500);
  }

  const model = options.model || "google/gemini-2.5-flash";
  const requestId = options.meta?.requestId || crypto.randomUUID();
  const startMs = Date.now();

  // Build retry options
  const retryOptions: EnhancedRetryOptions = {
    maxRetries: options.retries ?? 3,
    timeoutMs: options.timeoutMs ?? 60000,
    signal: options.signal,
    respectRetryAfter: true,
    circuitBreakerKey: `ai-gateway:${model}`,
  };

  let response: Response;
  
  try {
    response = await fetchWithRetry(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        ...(extraHeaders || {}),
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        ...(options.tools && { tools: options.tools }),
        ...(options.tool_choice && { tool_choice: options.tool_choice }),
        ...(options.max_tokens && { max_tokens: options.max_tokens }),
        ...(options.temperature !== undefined && { temperature: options.temperature }),
        ...(options.modalities && { modalities: options.modalities }),
      }),
    }, retryOptions);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    
    // Determine error type
    if (error.message.includes('timeout')) {
      throw new AIGatewayError('TIMEOUT', error.message, 408);
    }
    if (error.message.includes('Circuit breaker')) {
      throw new AIGatewayError('SERVER', error.message, 503);
    }
    if (error.message.includes('aborted')) {
      throw new AIGatewayError('TIMEOUT', error.message, 408);
    }
    
    throw new AIGatewayError('NETWORK', error.message, 0);
  }

  const durationMs = Date.now() - startMs;

  // Handle specific error statuses
  if (!response.ok) {
    const errorText = await response.text();
    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader) * 1000 : undefined;

    // Log error telemetry
    console.error(JSON.stringify({
      at: 'ai_gateway.error',
      request_id: requestId,
      function_name: options.meta?.functionName,
      model,
      status: response.status,
      duration_ms: durationMs,
      error_preview: errorText.substring(0, 200),
    }));

    if (response.status === 429) {
      throw new AIGatewayError('RATE_LIMIT', 'Rate limit exceeded. Please try again later.', 429, retryAfterMs);
    }
    if (response.status === 402) {
      throw new AIGatewayError('BUDGET_EXCEEDED', 'AI credits exhausted. Please add more credits.', 402);
    }
    if (response.status === 401 || response.status === 403) {
      throw new AIGatewayError('AUTH', 'Authentication failed.', response.status);
    }
    if (response.status >= 500) {
      throw new AIGatewayError('SERVER', `AI Gateway server error: ${response.status}`, response.status);
    }

    throw new AIGatewayError('INVALID_RESPONSE', `AI Gateway error: ${response.status} - ${errorText.substring(0, 200)}`, response.status);
  }

  const rawResponse = await response.json();

  // Extract content from response
  const choice = rawResponse.choices?.[0];
  if (!choice) {
    throw new AIGatewayError('INVALID_RESPONSE', 'No response from AI', 502);
  }

  // Log usage telemetry
  const usage = rawResponse.usage;
  console.log(JSON.stringify({
    at: 'ai_gateway.success',
    request_id: requestId,
    function_name: options.meta?.functionName,
    brand_id: options.meta?.brandId,
    model: rawResponse.model || model,
    duration_ms: durationMs,
    prompt_tokens: usage?.prompt_tokens,
    completion_tokens: usage?.completion_tokens,
    total_tokens: usage?.total_tokens,
  }));

  return {
    data: rawResponse as T,
    rawResponse,
    model: rawResponse.model || model,
    usage,
    durationMs,
  };
}

// ═══════════════════════════════════════════════════════════════════
// JSON RESPONSE HELPER
// ═══════════════════════════════════════════════════════════════════

/**
 * Call AI and parse JSON response from content
 */
export async function callAIGatewayJSON<T = unknown>(
  options: AIGatewayOptions,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const result = await callAIGateway(options, extraHeaders);
  const content = (result.rawResponse as any).choices?.[0]?.message?.content;

  if (!content) {
    throw new AIGatewayError('INVALID_RESPONSE', 'No content in AI response', 502);
  }

  try {
    return cleanAndParseJSON<T>(content);
  } catch (err) {
    throw new AIGatewayError(
      'INVALID_RESPONSE', 
      `Failed to parse JSON from AI response: ${err instanceof Error ? err.message : String(err)}`,
      502
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// TOOL CALLING HELPER
// ═══════════════════════════════════════════════════════════════════

/**
 * Call AI with tool calling and extract structured data
 * Optionally validates output with a Zod schema
 */
export async function callAIGatewayTool<T = unknown>(
  options: AIGatewayOptions,
  toolName: string,
  schema?: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: { message: string } } },
  extraHeaders?: Record<string, string>
): Promise<T> {
  const result = await callAIGateway(options, extraHeaders);
  const toolCall = (result.rawResponse as any).choices?.[0]?.message?.tool_calls?.[0];

  let data: unknown;

  if (toolCall?.function?.name === toolName && toolCall.function.arguments) {
    try {
      data = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new AIGatewayError('INVALID_RESPONSE', 'Failed to parse tool arguments', 502);
    }
  } else {
    // Fallback to content parsing
    const content = (result.rawResponse as any).choices?.[0]?.message?.content;
    if (content) {
      try {
        data = cleanAndParseJSON(content);
      } catch {
        throw new AIGatewayError('INVALID_RESPONSE', 'No tool call or valid JSON content in response', 502);
      }
    } else {
      throw new AIGatewayError('INVALID_RESPONSE', 'No tool call or content in response', 502);
    }
  }

  // Validate with Zod schema if provided
  if (schema) {
    const validation = schema.safeParse(data);
    if (!validation.success) {
      throw new AIGatewayError(
        'INVALID_RESPONSE',
        `Tool output validation failed: ${validation.error?.message || 'Unknown validation error'}`,
        502
      );
    }
    return validation.data as T;
  }

  return data as T;
}

// ═══════════════════════════════════════════════════════════════════
// STREAMING HELPER
// ═══════════════════════════════════════════════════════════════════

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onFinish?: (fullText: string, usage?: TokenUsage) => void;
  onError?: (error: AIGatewayError) => void;
}

/**
 * Call AI Gateway with streaming response
 * Parses Server-Sent Events and invokes callbacks
 */
export async function callAIGatewayStream(
  options: AIGatewayOptions,
  callbacks: StreamCallbacks,
  extraHeaders?: Record<string, string>
): Promise<{ text: string; usage?: TokenUsage }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    throw new AIGatewayError("CONFIG_ERROR", "LOVABLE_API_KEY is not configured", 500);
  }

  const model = options.model || "google/gemini-2.5-flash";
  const requestId = options.meta?.requestId || crypto.randomUUID();
  const startMs = Date.now();

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Stream timeout after ${options.timeoutMs ?? 120000}ms`));
  }, options.timeoutMs ?? 120000);

  // Combine with external signal
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(options.signal?.reason));
  }

  try {
    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        ...(extraHeaders || {}),
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        stream: true,
        ...(options.tools && { tools: options.tools }),
        ...(options.max_tokens && { max_tokens: options.max_tokens }),
        ...(options.temperature !== undefined && { temperature: options.temperature }),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      if (response.status === 429) {
        const error = new AIGatewayError('RATE_LIMIT', 'Rate limit exceeded', 429);
        callbacks.onError?.(error);
        throw error;
      }
      if (response.status === 402) {
        const error = new AIGatewayError('BUDGET_EXCEEDED', 'AI credits exhausted', 402);
        callbacks.onError?.(error);
        throw error;
      }
      
      const error = new AIGatewayError('SERVER', `Stream error: ${response.status}`, response.status);
      callbacks.onError?.(error);
      throw error;
    }

    if (!response.body) {
      throw new AIGatewayError('INVALID_RESPONSE', 'No response body for streaming', 502);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let usage: TokenUsage | undefined;
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete SSE lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            
            if (delta) {
              fullText += delta;
              callbacks.onToken?.(delta);
            }

            // Capture usage from final chunk
            if (parsed.usage) {
              usage = parsed.usage;
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    }

    clearTimeout(timeoutId);

    const durationMs = Date.now() - startMs;
    
    // Log telemetry
    console.log(JSON.stringify({
      at: 'ai_gateway.stream_complete',
      request_id: requestId,
      function_name: options.meta?.functionName,
      model,
      duration_ms: durationMs,
      text_length: fullText.length,
      prompt_tokens: usage?.prompt_tokens,
      completion_tokens: usage?.completion_tokens,
    }));

    callbacks.onFinish?.(fullText, usage);

    return { text: fullText, usage };

  } catch (err) {
    clearTimeout(timeoutId);
    
    const error = err instanceof AIGatewayError 
      ? err 
      : new AIGatewayError('NETWORK', err instanceof Error ? err.message : String(err));
    
    callbacks.onError?.(error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
// IMAGE GENERATION HELPER
// ═══════════════════════════════════════════════════════════════════

/**
 * Call AI for image generation
 */
export async function callAIGatewayImage(
  options: AIGatewayOptions,
  extraHeaders?: Record<string, string>
): Promise<{ imageUrl: string; textContent?: string }> {
  
  // Configurable model - can be overridden via options or env
  const imageModel = options.model 
    || Deno.env.get('IMAGE_GENERATION_MODEL') 
    || "google/gemini-2.5-flash-image-preview";
  
  console.log("[AI Gateway Image] Starting generation with model:", imageModel);
  console.log("[AI Gateway Image] Prompt preview:", 
    typeof options.messages?.[0]?.content === 'string' 
      ? options.messages[0].content.slice(0, 100) 
      : 'complex content');
  
  const result = await callAIGateway({
    ...options,
    model: imageModel,
    modalities: ["image", "text"],
  }, extraHeaders);

  // Log response structure for debugging
  console.log("[AI Gateway Image] Raw response structure:", 
    JSON.stringify(Object.keys(result.rawResponse || {})));

  // Try to extract image from multiple possible formats
  const imageUrl = extractImageUrl(result.rawResponse);
  
  if (!imageUrl) {
    console.error("[AI Gateway Image] No image found in response");
    console.error("[AI Gateway Image] Full response:", 
      JSON.stringify(result.rawResponse, null, 2).slice(0, 2000));
    throw new AIGatewayError(
      'INVALID_RESPONSE',
      `No image generated. Model: ${imageModel}. See logs for response format.`,
      502
    );
  }

  console.log("[AI Gateway Image] Success! Image URL length:", imageUrl.length);
  
  // Extract any text content
  const message = (result.rawResponse as any).choices?.[0]?.message;
  const textContent = typeof message?.content === 'string' 
    ? message.content 
    : undefined;

  return { imageUrl, textContent };
}

/**
 * Extract image URL from various API response formats
 */
function extractImageUrl(rawResponse: any): string | null {
  if (!rawResponse) return null;
  
  // Format 1: Gemini/Lovable Gateway format
  const geminiUrl = rawResponse.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (geminiUrl) {
    console.log("[AI Gateway Image] Found image in Gemini format");
    return geminiUrl;
  }
  
  // Format 2: Gemini inline_data format (base64)
  const contentArray = rawResponse.choices?.[0]?.message?.content;
  if (Array.isArray(contentArray)) {
    const imageContent = contentArray.find((c: any) => c.type === 'image');
    if (imageContent?.image_url?.url) {
      console.log("[AI Gateway Image] Found image in content array format");
      return imageContent.image_url.url;
    }
    const inlineData = contentArray.find((c: any) => c.inline_data);
    if (inlineData?.inline_data?.data) {
      console.log("[AI Gateway Image] Found image in inline_data format");
      const mimeType = inlineData.inline_data.mime_type || 'image/png';
      return `data:${mimeType};base64,${inlineData.inline_data.data}`;
    }
  }
  
  // Format 3: OpenAI DALL-E format
  const dalleUrl = rawResponse.data?.[0]?.url;
  if (dalleUrl) {
    console.log("[AI Gateway Image] Found image in DALL-E format");
    return dalleUrl;
  }
  
  // Format 4: OpenAI DALL-E b64_json format
  const dalleB64 = rawResponse.data?.[0]?.b64_json;
  if (dalleB64) {
    console.log("[AI Gateway Image] Found image in DALL-E b64 format");
    return `data:image/png;base64,${dalleB64}`;
  }
  
  // Format 5: Direct images array
  const directUrl = rawResponse.images?.[0]?.url;
  if (directUrl) {
    console.log("[AI Gateway Image] Found image in direct images array");
    return directUrl;
  }
  
  // Format 6: Replicate format
  if (rawResponse.output) {
    const replicateUrl = Array.isArray(rawResponse.output) 
      ? rawResponse.output[0] 
      : rawResponse.output;
    if (typeof replicateUrl === 'string') {
      console.log("[AI Gateway Image] Found image in Replicate format");
      return replicateUrl;
    }
  }
  
  // Format 7: Recursive search for url/image_url
  const foundUrl = findNestedImageUrl(rawResponse);
  if (foundUrl) {
    console.log("[AI Gateway Image] Found image via recursive search");
    return foundUrl;
  }
  
  return null;
}

/**
 * Recursive search for image URL in unknown structure
 */
function findNestedImageUrl(obj: any, depth = 0): string | null {
  if (depth > 5 || !obj) return null;
  
  if (typeof obj === 'string') {
    if (obj.startsWith('http') && (obj.includes('.png') || obj.includes('.jpg') || obj.includes('.webp') || obj.includes('image'))) {
      return obj;
    }
    if (obj.startsWith('data:image/')) {
      return obj;
    }
  }
  
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    for (const key of ['url', 'image_url', 'imageUrl', 'image', 'src']) {
      if (obj[key]) {
        const found = findNestedImageUrl(obj[key], depth + 1);
        if (found) return found;
      }
    }
    for (const key in obj) {
      const found = findNestedImageUrl(obj[key], depth + 1);
      if (found) return found;
    }
  }
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findNestedImageUrl(item, depth + 1);
      if (found) return found;
    }
  }
  
  return null;
}
