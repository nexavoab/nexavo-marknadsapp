/**
 * AI Task Logger
 * Helper for logging AI task lifecycle to the ai_tasks table.
 * 
 * Usage:
 *   const taskId = await logTaskStart(admin, orgId, 'generate-concept', inputPayload, userId);
 *   // ... do work ...
 *   await logTaskComplete(admin, taskId, outputPayload, tokensUsed, durationMs);
 *   // or on error:
 *   await logTaskFailed(admin, taskId, errorMessage);
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type TaskType = 
  | 'generate-concept' 
  | 'generate-campaign-pack' 
  | 'generate-image' 
  | 'check-brand-guardrails'
  | 'generate-template-layout'
  | 'composite-images'
  | 'copy-engine'
  | 'reflow-template';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AITask {
  id: string;
  org_id: string;
  created_by: string | null;
  task_type: TaskType;
  status: TaskStatus;
  input_payload: Record<string, unknown> | null;
  output_payload: Record<string, unknown> | null;
  error_message: string | null;
  tokens_used: number | null;
  duration_ms: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Log the start of an AI task.
 * Creates a new ai_tasks row with status='running'.
 * 
 * @param supabaseAdmin - Service role Supabase client (bypasses RLS)
 * @param orgId - Organization ID (required)
 * @param taskType - Type of AI task
 * @param inputPayload - Input data for the task (optional, sanitized for PII)
 * @param userId - User who initiated the task (optional)
 * @returns Task ID (UUID) or null if insert failed
 */
export async function logTaskStart(
  supabaseAdmin: SupabaseClient,
  orgId: string,
  taskType: TaskType,
  inputPayload?: Record<string, unknown>,
  userId?: string | null
): Promise<string | null> {
  try {
    // Sanitize input payload - remove sensitive fields
    const sanitizedPayload = inputPayload 
      ? sanitizePayload(inputPayload) 
      : null;

    const { data, error } = await supabaseAdmin
      .from('ai_tasks')
      .insert({
        org_id: orgId,
        created_by: userId || null,
        task_type: taskType,
        status: 'running',
        input_payload: sanitizedPayload,
      })
      .select('id')
      .single();

    if (error) {
      console.error(JSON.stringify({
        at: 'ai-task-logger.start_failed',
        error: error.message,
        orgId,
        taskType,
      }));
      return null;
    }

    console.log(JSON.stringify({
      at: 'ai-task-logger.started',
      taskId: data.id,
      orgId,
      taskType,
    }));

    return data.id;
  } catch (err) {
    console.error(JSON.stringify({
      at: 'ai-task-logger.start_exception',
      error: err instanceof Error ? err.message : String(err),
      orgId,
      taskType,
    }));
    return null;
  }
}

/**
 * Log successful completion of an AI task.
 * Updates the ai_tasks row with status='completed' and output data.
 * 
 * @param supabaseAdmin - Service role Supabase client
 * @param taskId - Task ID from logTaskStart
 * @param outputPayload - Output data from the task (optional, sanitized)
 * @param tokensUsed - Number of tokens used (if available)
 * @param durationMs - Task duration in milliseconds
 */
export async function logTaskComplete(
  supabaseAdmin: SupabaseClient,
  taskId: string,
  outputPayload?: Record<string, unknown>,
  tokensUsed?: number,
  durationMs?: number
): Promise<void> {
  try {
    // Sanitize and truncate output payload
    const sanitizedOutput = outputPayload 
      ? truncatePayload(sanitizePayload(outputPayload), 50000)
      : null;

    const { error } = await supabaseAdmin
      .from('ai_tasks')
      .update({
        status: 'completed',
        output_payload: sanitizedOutput,
        tokens_used: tokensUsed ?? null,
        duration_ms: durationMs ?? null,
      })
      .eq('id', taskId);

    if (error) {
      console.error(JSON.stringify({
        at: 'ai-task-logger.complete_failed',
        error: error.message,
        taskId,
      }));
      return;
    }

    console.log(JSON.stringify({
      at: 'ai-task-logger.completed',
      taskId,
      durationMs,
      tokensUsed,
    }));
  } catch (err) {
    console.error(JSON.stringify({
      at: 'ai-task-logger.complete_exception',
      error: err instanceof Error ? err.message : String(err),
      taskId,
    }));
  }
}

/**
 * Log failure of an AI task.
 * Updates the ai_tasks row with status='failed' and error message.
 * 
 * @param supabaseAdmin - Service role Supabase client
 * @param taskId - Task ID from logTaskStart
 * @param errorMessage - Error description (truncated to 1000 chars)
 */
export async function logTaskFailed(
  supabaseAdmin: SupabaseClient,
  taskId: string,
  errorMessage: string
): Promise<void> {
  try {
    const truncatedError = errorMessage.slice(0, 1000);

    const { error } = await supabaseAdmin
      .from('ai_tasks')
      .update({
        status: 'failed',
        error_message: truncatedError,
      })
      .eq('id', taskId);

    if (error) {
      console.error(JSON.stringify({
        at: 'ai-task-logger.failed_update_error',
        error: error.message,
        taskId,
      }));
      return;
    }

    console.warn(JSON.stringify({
      at: 'ai-task-logger.task_failed',
      taskId,
      errorMessage: truncatedError,
    }));
  } catch (err) {
    console.error(JSON.stringify({
      at: 'ai-task-logger.failed_exception',
      error: err instanceof Error ? err.message : String(err),
      taskId,
    }));
  }
}

/**
 * Get org_id from brand_id using service role client.
 * Needed because ai_tasks requires org_id reference.
 */
export async function getOrgIdFromBrand(
  supabaseAdmin: SupabaseClient,
  brandId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('brand_profiles')
      .select('org_id')
      .eq('id', brandId)
      .single();

    if (error || !data) {
      console.warn(JSON.stringify({
        at: 'ai-task-logger.org_lookup_failed',
        brandId,
        error: error?.message,
      }));
      return null;
    }

    return data.org_id;
  } catch (err) {
    console.error(JSON.stringify({
      at: 'ai-task-logger.org_lookup_exception',
      brandId,
      error: err instanceof Error ? err.message : String(err),
    }));
    return null;
  }
}

// ---- Internal helpers ----

/**
 * Remove sensitive fields from payload before logging
 */
function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password', 'token', 'secret', 'api_key', 'apiKey', 
    'authorization', 'auth', 'credential', 'private_key',
    'access_token', 'refresh_token'
  ];
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizePayload(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Truncate payload to max characters (for JSONB storage limits)
 */
function truncatePayload(payload: Record<string, unknown>, maxChars: number): Record<string, unknown> {
  const json = JSON.stringify(payload);
  if (json.length <= maxChars) {
    return payload;
  }
  
  // Return summary if too large
  return {
    _truncated: true,
    _original_size: json.length,
    _summary: 'Output too large for logging. Check function logs for details.',
  };
}
