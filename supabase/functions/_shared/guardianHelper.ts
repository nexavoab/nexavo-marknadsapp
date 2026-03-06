// DRY Guardian Gate helper for experts
import { guardianGate, type GuardianGateResponse } from "./guardianGate.ts";

export type GuardianChannel = 
  | 'google_search'
  | 'meta'
  | 'email'
  | 'sms'
  | 'push'
  | 'creative'
  | 'general'
  | 'linkedin'
  | 'tiktok'
  | 'display';

export interface RunGuardianOpts {
  publish?: boolean;
  source: string;
}

/**
 * Standardized Guardian Gate wrapper for experts.
 * - fail_closed when publish=true
 * - fail_open when publish=false or undefined
 * - Skips empty content to avoid false alarms
 */
export async function runGuardian(
  req: Request,
  brand_id: string,
  channel: GuardianChannel | string,
  content: string,
  asset_type: string,
  opts: RunGuardianOpts
): Promise<{ gate: GuardianGateResponse | null; skipped: boolean }> {
  // Skip empty content
  if (!content || !content.trim()) {
    return { gate: null, skipped: true };
  }

  const gate = await guardianGate(req, {
    brand_profile_id: brand_id,
    channel,
    content,
    asset_type,
  }, {
    policy: opts.publish ? 'fail_closed' : 'fail_open',
    mode: 'user',
    source: opts.source,
  });

  return { gate, skipped: false };
}

/**
 * Quick blocked check with logging
 */
export function isBlocked(
  gate: GuardianGateResponse | null,
  trace_id: string,
  source: string
): boolean {
  if (!gate) return false;
  
  if (gate.blocked) {
    console.warn(JSON.stringify({
      at: `${source}.guardian_blocked`,
      trace_id,
      hard_fail: gate.hard_fail,
      violations: gate.preflight?.violations?.length ?? 0,
    }));
  }
  
  return gate.blocked;
}
