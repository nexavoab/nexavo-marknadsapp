// supabase/functions/_shared/preflight.types.ts

export type GuardrailSeverity = "hard" | "soft";

export type PreflightViolationCode =
  | "BANNED_WORD"
  | "GUARDRAIL_HARD"
  | "GUARDRAIL_SOFT"
  | "CHANNEL_FORMAT"
  | "MISSING_CTA"
  | "MISSING_REQUIRED"
  | "READING_LEVEL"
  | "CLAIM_FORBIDDEN"
  | "CLAIM_UNSUPPORTED"
  | "TONE_MISMATCH"
  | "PERSONA_MISMATCH";

export type AutoFix =
  | { type: "rewrite"; patch?: string }
  | { type: "replace"; from?: string; to?: string }
  | { type: "remove" };

export interface PreflightViolation {
  code: PreflightViolationCode;
  severity: GuardrailSeverity;
  message: string;

  matched_term?: string;
  suggestion?: string;

  evidence_needed?: boolean;
  related_fact_ids?: string[];

  auto_fix?: AutoFix;
}

export interface PreflightScores {
  total: number;
  tone: number;
  persona: number;
  channel: number;
  claims: number;
  compliance: number;
}

export interface PreflightResultV1 {
  request_id: string;
  brand_profile_id: string;
  guide_version_id?: string;
  channel: string;
  created_at: string;

  scores: PreflightScores;
  violations: PreflightViolation[];
  hard_fail: boolean;
  summary: string;
}

export interface BrandFact {
  id?: string;
  claim: string;
  type?: string;
  status?: "verified" | "unverified" | "forbidden";
  evidence_ids?: string[];
  notes?: string;
}

export interface Guardrail {
  id?: string;
  name?: string;
  severity?: GuardrailSeverity;
  scope?: string;
  rule?: string;

  forbidden_terms?: string[];
  required_terms?: string[];
}

export interface ChannelConstraints {
  max_chars?: number;
  min_chars?: number;
  hashtag_policy?: "none" | "light" | "heavy" | string;
  emoji_policy?: "none" | "light" | "heavy" | string;
  cta_required?: boolean;
}

export interface ChannelRule {
  channel?: string;
  constraints?: ChannelConstraints;
  forbidden_terms?: string[];
  required_terms?: string[];
}

export interface ToneRules {
  banned_words?: string[];
  reading_level?: "simple" | "normal" | "advanced" | string;
}

export interface BrandContextV1 {
  forbidden_terms?: string[];
  required_terms?: string[];
  tone_rules?: ToneRules;
  guardrails?: Guardrail[];
  channel_rules?: ChannelRule[];
  facts?: { key_claims?: BrandFact[] };
  meta?: { guide_version_id?: string };
}

export interface RunPreflightInput {
  request_id: string;
  brand_profile_id: string;
  channel: string;
  content: string;
  asset_type?: string;
  guide_version_id?: string;
  persona_id?: string;
}

export interface RunPreflightCheckRequest extends RunPreflightInput {
  guide_mode?: "PUBLISHED" | "DRAFT";
}
