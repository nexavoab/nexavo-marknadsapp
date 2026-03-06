/**
 * Enhanced Retry Client for AI API calls
 * Implements exponential backoff, timeout, Retry-After header support,
 * and circuit breaker pattern for transient failures
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const DEFAULT_TIMEOUT_MS = 60000;

// Circuit breaker state per endpoint
const circuitBreakers = new Map<string, {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}>();

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60000;

export interface EnhancedRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  retryOn5xx?: boolean;
  retryOn429?: boolean;
  respectRetryAfter?: boolean;
  circuitBreakerKey?: string;
}

export interface RetryResult {
  response: Response;
  retryCount: number;
  totalDurationMs: number;
}

/**
 * Parse Retry-After header value
 * Supports both seconds format and HTTP-date format
 */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  
  // Try parsing as seconds (e.g., "120")
  const seconds = parseInt(header, 10);
  if (!isNaN(seconds) && seconds > 0) {
    return seconds * 1000;
  }
  
  // Try parsing as HTTP-date (e.g., "Wed, 21 Oct 2025 07:28:00 GMT")
  const date = Date.parse(header);
  if (!isNaN(date)) {
    const delayMs = date - Date.now();
    return delayMs > 0 ? delayMs : null;
  }
  
  return null;
}

/**
 * Calculate backoff delay with jitter
 */
function calculateBackoff(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  retryAfterMs?: number | null
): number {
  // If Retry-After header is present, use it (but cap at maxDelayMs)
  if (retryAfterMs && retryAfterMs > 0) {
    return Math.min(retryAfterMs, maxDelayMs);
  }
  
  // Exponential backoff: baseDelay * 2^(attempt-1)
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
  
  // Cap at maxDelayMs
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  
  // Add jitter (±25% of the delay)
  const jitterRange = cappedDelay * 0.25;
  const jitter = (Math.random() * 2 - 1) * jitterRange;
  
  return Math.max(0, cappedDelay + jitter);
}

/**
 * Check circuit breaker state
 */
function checkCircuitBreaker(key: string): boolean {
  const breaker = circuitBreakers.get(key);
  if (!breaker) return true; // No breaker = allow request
  
  const now = Date.now();
  
  if (breaker.state === 'open') {
    // Check if we should transition to half-open
    if (now - breaker.lastFailure > CIRCUIT_BREAKER_RESET_MS) {
      breaker.state = 'half-open';
      console.log(`[CircuitBreaker] ${key}: open -> half-open`);
      return true;
    }
    return false;
  }
  
  return true;
}

/**
 * Record success for circuit breaker
 */
function recordSuccess(key: string): void {
  const breaker = circuitBreakers.get(key);
  if (breaker) {
    if (breaker.state === 'half-open') {
      console.log(`[CircuitBreaker] ${key}: half-open -> closed`);
    }
    breaker.failures = 0;
    breaker.state = 'closed';
  }
}

/**
 * Record failure for circuit breaker
 */
function recordFailure(key: string): void {
  let breaker = circuitBreakers.get(key);
  if (!breaker) {
    breaker = { failures: 0, lastFailure: 0, state: 'closed' };
    circuitBreakers.set(key, breaker);
  }
  
  breaker.failures++;
  breaker.lastFailure = Date.now();
  
  if (breaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    breaker.state = 'open';
    console.log(`[CircuitBreaker] ${key}: opened after ${breaker.failures} failures`);
  }
}

/**
 * Create a timeout signal that aborts after specified milliseconds
 */
function createTimeoutSignal(timeoutMs: number, externalSignal?: AbortSignal): AbortController {
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Request timeout after ${timeoutMs}ms`));
  }, timeoutMs);
  
  // Clean up timeout if external signal aborts first
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      controller.abort(externalSignal.reason);
    });
  }
  
  // Store cleanup function
  (controller as any)._cleanup = () => clearTimeout(timeoutId);
  
  return controller;
}

/**
 * Fetch with automatic retry on transient failures
 * Features:
 * - Exponential backoff with jitter
 * - Request timeout support
 * - Retry-After header respect
 * - Circuit breaker pattern
 * - AbortSignal support
 * 
 * Retries on: network errors, 429 (rate limit), 5xx (server errors)
 * Does NOT retry on: 4xx client errors (except 429)
 */
export async function fetchWithRetry(
  url: string, 
  options: RequestInit,
  retryOptions: EnhancedRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = MAX_RETRIES,
    baseDelayMs = BASE_DELAY_MS,
    maxDelayMs = MAX_DELAY_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
    retryOn5xx = true,
    retryOn429 = true,
    respectRetryAfter = true,
    circuitBreakerKey,
  } = retryOptions;

  // Check circuit breaker
  if (circuitBreakerKey && !checkCircuitBreaker(circuitBreakerKey)) {
    throw new Error(`Circuit breaker open for ${circuitBreakerKey}`);
  }

  let lastError: Error | null = null;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Create timeout controller
    const timeoutController = createTimeoutSignal(timeoutMs, externalSignal);
    
    try {
      // Merge signals
      const fetchOptions: RequestInit = {
        ...options,
        signal: timeoutController.signal,
      };
      
      const response = await fetch(url, fetchOptions);

      // Cleanup timeout
      (timeoutController as any)._cleanup?.();

      // Success - record for circuit breaker and return
      if (response.ok) {
        if (circuitBreakerKey) {
          recordSuccess(circuitBreakerKey);
        }
        return response;
      }

      // Get Retry-After header if present
      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfterMs = respectRetryAfter ? parseRetryAfter(retryAfterHeader) : null;

      // Check if we should retry this status
      const shouldRetry = 
        (retryOn429 && response.status === 429) ||
        (retryOn5xx && response.status >= 500);

      if (shouldRetry && attempt < maxRetries) {
        // Clone response to read body for logging
        const errorText = await response.text().catch(() => 'Unable to read response');
        
        console.warn(JSON.stringify({
          at: 'retry_client.retry',
          attempt,
          maxRetries,
          status: response.status,
          retryAfterMs,
          errorPreview: errorText.substring(0, 200),
        }));
        
        // Record failure for circuit breaker
        if (circuitBreakerKey) {
          recordFailure(circuitBreakerKey);
        }

        // Calculate delay
        const delay = calculateBackoff(attempt, baseDelayMs, maxDelayMs, retryAfterMs);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // If it's a client error (4xx except 429) or we've exhausted retries, return as-is
      return response;

    } catch (err) {
      // Cleanup timeout on error
      (timeoutController as any)._cleanup?.();
      
      lastError = err instanceof Error ? err : new Error(String(err));
      
      // Check if it's an abort
      if (lastError.name === 'AbortError' || externalSignal?.aborted) {
        throw new Error(`Request aborted: ${lastError.message}`);
      }
      
      // Record failure for circuit breaker
      if (circuitBreakerKey) {
        recordFailure(circuitBreakerKey);
      }
      
      console.warn(JSON.stringify({
        at: 'retry_client.error',
        attempt,
        maxRetries,
        error: lastError.message,
        isTimeout: lastError.message.includes('timeout'),
      }));
      
      if (attempt >= maxRetries) {
        throw new Error(`API call failed after ${maxRetries} attempts: ${lastError.message}`);
      }
      
      // Exponential backoff for network errors
      const delay = calculateBackoff(attempt, baseDelayMs, maxDelayMs);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error(`API call failed after ${maxRetries} attempts`);
}

/**
 * Convenience wrapper for JSON API calls
 */
export async function fetchJsonWithRetry<T = unknown>(
  url: string,
  options: RequestInit,
  retryOptions?: EnhancedRetryOptions
): Promise<{ data: T; response: Response }> {
  const response = await fetchWithRetry(url, options, retryOptions);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText.substring(0, 500)}`);
  }
  
  const data = await response.json() as T;
  return { data, response };
}

// Legacy export for backwards compatibility
export type RetryOptions = EnhancedRetryOptions;
