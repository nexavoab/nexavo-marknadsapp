// supabase/functions/_shared/preflight.core.ts

import type {
  BrandContextV1,
  BrandFact,
  ChannelRule,
  Guardrail,
  GuardrailSeverity,
  PreflightResultV1,
  PreflightScores,
  PreflightViolation,
  RunPreflightInput,
} from "./preflight.types.ts";

// ============================================
// PUBLIC API
// ============================================

export function runPreflight(
  context: BrandContextV1,
  input: RunPreflightInput,
): PreflightResultV1 {
  const content = (input.content ?? "").trim();
  const contentLower = normText(content);

  const violations: PreflightViolation[] = [];

  checkForbiddenTerms(contentLower, context, violations);
  checkGuardrails(contentLower, context.guardrails ?? [], violations);
  checkChannelConstraints(
    content,
    contentLower,
    input.channel,
    context.channel_rules ?? [],
    violations,
  );
  checkRequiredTerms(contentLower, context.required_terms ?? [], violations);
  checkReadingLevel(content, context.tone_rules?.reading_level, violations);
  checkClaims(contentLower, context.facts?.key_claims ?? [], violations);

  const scores = calculateScores(violations);
  const hardFail = violations.some((v) => v.severity === "hard");

  return {
    request_id: input.request_id,
    brand_profile_id: input.brand_profile_id,
    guide_version_id: input.guide_version_id ?? context.meta?.guide_version_id,
    channel: input.channel,
    created_at: new Date().toISOString(),
    scores,
    violations,
    hard_fail: hardFail,
    summary: buildSummary(scores, violations, hardFail),
  };
}

// ============================================
// TERM MATCHING (UNICODE-SAFE)
// ============================================

function normText(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function containsTerm(contentLower: string, termLower: string): boolean {
  const t = normText(termLower);
  const c = normText(contentLower);
  if (!t) return false;

  if (t.includes(" ")) return c.includes(t);

  const escaped = escapeRegExp(t);
  const re = new RegExp(
    `(?:^|[^\\p{L}\\p{N}_])${escaped}(?:$|[^\\p{L}\\p{N}_])`,
    "iu",
  );
  return re.test(c);
}

export function claimMatches(contentLower: string, claim: string): boolean {
  const c = normText(claim);
  if (!c) return false;

  if (c.length <= 40) return containsTerm(contentLower, c);

  const tokens = c.split(/\s+/).filter((w) => w.length >= 5).slice(0, 8);
  const hits = tokens.filter((t) => containsTerm(contentLower, t)).length;
  return hits >= 2;
}

// ============================================
// CHECKS
// ============================================

function checkForbiddenTerms(
  contentLower: string,
  context: BrandContextV1,
  violations: PreflightViolation[],
): void {
  const bannedWords = (context.tone_rules?.banned_words ?? [])
    .map((s) => normText(s))
    .filter(Boolean);

  const forbiddenTerms = (context.forbidden_terms ?? [])
    .map((s) => normText(s))
    .filter(Boolean);

  for (const word of bannedWords) {
    if (containsTerm(contentLower, word)) {
      violations.push({
        code: "BANNED_WORD",
        severity: "hard",
        message: `Innehåller förbjudet ord: "${word}"`,
        matched_term: word,
        suggestion: "Ta bort eller byt ut ordet.",
        auto_fix: { type: "replace" },
      });
    }
  }

  for (const term of forbiddenTerms) {
    if (!term) continue;
    if (bannedWords.includes(term)) continue;

    if (containsTerm(contentLower, term)) {
      violations.push({
        code: "GUARDRAIL_SOFT",
        severity: "soft",
        message: `Innehåller ord/fras att undvika: "${term}"`,
        matched_term: term,
        suggestion: "Överväg att omformulera utan denna term.",
        auto_fix: { type: "rewrite", patch: "Omformulera utan termen" },
      });
    }
  }
}

function checkGuardrails(
  contentLower: string,
  guardrails: Guardrail[],
  violations: PreflightViolation[],
): void {
  for (const g of guardrails) {
    const forbidden = (g.forbidden_terms ?? [])
      .map((t) => normText(t))
      .filter(Boolean);

    const severity: GuardrailSeverity = g.severity ?? "soft";
    for (const term of forbidden) {
      if (containsTerm(contentLower, term)) {
        violations.push({
          code: severity === "hard" ? "GUARDRAIL_HARD" : "GUARDRAIL_SOFT",
          severity,
          message: `Bryter mot guardrail "${g.name ?? "okänd"}": förbjudet ord/fras "${term}"`,
          matched_term: term,
          suggestion: "Skriv om utan detta ord/fras.",
          auto_fix: { type: "rewrite", patch: "Skriv om utan förbjudet ord/fras" },
        });
      }
    }
  }
}

function checkChannelConstraints(
  content: string,
  contentLower: string,
  channel: string,
  rules: ChannelRule[],
  violations: PreflightViolation[],
): void {
  const rule = rules.find(
    (r) => String(r.channel ?? "").toLowerCase() === String(channel).toLowerCase(),
  );
  if (!rule?.constraints) return;

  const { max_chars, min_chars, cta_required, emoji_policy, hashtag_policy } = rule.constraints;

  if (max_chars && content.length > max_chars) {
    violations.push({
      code: "CHANNEL_FORMAT",
      severity: "soft",
      message: `Texten är för lång för ${channel} (${content.length}/${max_chars} tecken)`,
      suggestion: `Korta ner med ${content.length - max_chars} tecken.`,
      auto_fix: { type: "rewrite", patch: `Korta ner till max ${max_chars} tecken` },
    });
  }

  if (min_chars && content.length < min_chars) {
    violations.push({
      code: "CHANNEL_FORMAT",
      severity: "soft",
      message: `Texten är för kort för ${channel} (${content.length}/${min_chars} tecken)`,
      suggestion: `Bygg ut med ${min_chars - content.length} tecken.`,
      auto_fix: { type: "rewrite", patch: "Bygg ut texten" },
    });
  }

  if (cta_required && !hasCTA(contentLower)) {
    violations.push({
      code: "MISSING_CTA",
      severity: "soft",
      message: `CTA (call-to-action) saknas för ${channel}`,
      suggestion: "Lägg till en uppmaning som 'Boka nu', 'Läs mer', 'Kontakta oss'.",
      auto_fix: { type: "rewrite", patch: "Lägg till tydlig CTA" },
    });
  }

  if (emoji_policy === "none" && hasEmojis(content)) {
    violations.push({
      code: "CHANNEL_FORMAT",
      severity: "soft",
      message: `Emojis är inte tillåtna för ${channel}`,
      suggestion: "Ta bort alla emojis.",
      auto_fix: { type: "remove" },
    });
  }

  const hashtags = content.match(/#([\p{L}\p{N}_]+)/gu) ?? [];
  if (hashtag_policy === "none" && hashtags.length > 0) {
    violations.push({
      code: "CHANNEL_FORMAT",
      severity: "soft",
      message: `Hashtags är inte tillåtna för ${channel}`,
      suggestion: "Ta bort alla hashtags.",
      auto_fix: { type: "remove" },
    });
  } else if (hashtag_policy === "light" && hashtags.length > 3) {
    violations.push({
      code: "CHANNEL_FORMAT",
      severity: "soft",
      message: `För många hashtags för ${channel} (max 3)`,
      suggestion: "Minska till max 3 hashtags.",
      auto_fix: { type: "rewrite", patch: "Minska antalet hashtags (max 3)" },
    });
  }
}

function checkRequiredTerms(
  contentLower: string,
  requiredTerms: string[],
  violations: PreflightViolation[],
): void {
  let missingCount = 0;
  const MAX_MISSING = 3;
  const terms = requiredTerms.map((t) => normText(t)).filter(Boolean);

  for (const term of terms) {
    if (missingCount >= MAX_MISSING) break;
    if (!containsTerm(contentLower, term)) {
      violations.push({
        code: "MISSING_REQUIRED",
        severity: "soft",
        message: `Saknar rekommenderad fras: "${term}"`,
        matched_term: term,
        suggestion: `Överväg att inkludera "${term}" i texten.`,
        auto_fix: { type: "rewrite", patch: `Inkludera frasen: ${term}` },
      });
      missingCount++;
    }
  }

  const allMissing = terms.filter((t) => !containsTerm(contentLower, t)).length;
  const remaining = allMissing - missingCount;
  if (remaining > 0) {
    violations.push({
      code: "MISSING_REQUIRED",
      severity: "soft",
      message: `+${remaining} fler rekommenderade fraser saknas`,
      suggestion: "Se varumärkesguiden för komplett lista.",
    });
  }
}

function checkReadingLevel(
  content: string,
  targetLevel: string | undefined,
  violations: PreflightViolation[],
): void {
  if (!targetLevel) return;

  const target = normLevel(String(targetLevel));
  const actual = estimateReadingLevel(content);

  if (target !== actual) {
    violations.push({
      code: "READING_LEVEL",
      severity: "soft",
      message: `Läsbarhetsnivå "${actual}" matchar inte mål "${target}"`,
      suggestion: target === "simple" ? "Använd kortare meningar och enklare ord." : target === "advanced" ? "Du kan använda mer detaljerat språk." : "Balansera meningslängd och ordval.",
      auto_fix: target === "simple" ? { type: "rewrite", patch: "Förenkla språket" } : target === "advanced" ? { type: "rewrite", patch: "Gör språket mer avancerat" } : undefined,
    });
  }
}

function checkClaims(
  contentLower: string,
  keyClaims: BrandFact[],
  violations: PreflightViolation[],
): void {
  const detected = detectClaimLike(contentLower);
  if (detected.length === 0) return;

  const forbiddenClaims = keyClaims.filter((c) => c?.status === "forbidden");
  for (const claim of forbiddenClaims) {
    if (claim.claim && claimMatches(contentLower, claim.claim)) {
      violations.push({
        code: "CLAIM_FORBIDDEN",
        severity: "hard",
        message: "Texten innehåller ett påstående markerat som förbjudet",
        matched_term: claim.claim,
        suggestion: "Ta bort detta påstående eller omformulera helt.",
      });
      return;
    }
  }

  const verifiedClaims = keyClaims.filter((c) => c?.status === "verified");
  const hasVerifiedMatch = verifiedClaims.some((c) => c.claim ? claimMatches(contentLower, c.claim) : false);

  if (!hasVerifiedMatch) {
    const display = detected.slice(0, 3);
    const remaining = Math.max(0, detected.length - display.length);

    violations.push({
      code: "CLAIM_UNSUPPORTED",
      severity: "soft",
      message: `Påståenden utan verifierat stöd: "${display.join('", "')}"` + (remaining > 0 ? ` (+${remaining} till)` : ""),
      evidence_needed: true,
      related_fact_ids: verifiedClaims.map((c) => c.id).filter(Boolean) as string[],
      suggestion: "Verifiera med evidence, omformulera som ambition ('vi strävar efter...'), eller ta bort.",
      auto_fix: { type: "rewrite", patch: "Omformulera ostyrkta påståenden som ambition" },
    });
  }
}

// ============================================
// SCORING
// ============================================

function calculateScores(violations: PreflightViolation[]): PreflightScores {
  let total = 100;
  const byCategory = { tone: 0, persona: 0, channel: 0, claims: 0, compliance: 0 };

  for (const v of violations) {
    const deduction = v.severity === "hard" ? 25 : 10;
    total -= deduction;

    switch (v.code) {
      case "BANNED_WORD": case "TONE_MISMATCH": case "READING_LEVEL": byCategory.tone += deduction; break;
      case "PERSONA_MISMATCH": byCategory.persona += deduction; break;
      case "CHANNEL_FORMAT": case "MISSING_CTA": byCategory.channel += deduction; break;
      case "CLAIM_UNSUPPORTED": case "CLAIM_FORBIDDEN": byCategory.claims += deduction; break;
      case "GUARDRAIL_HARD": case "GUARDRAIL_SOFT": case "MISSING_REQUIRED": byCategory.compliance += deduction; break;
    }
  }

  total = Math.max(0, Math.min(100, total));
  return {
    total,
    tone: Math.max(0, 100 - byCategory.tone),
    persona: Math.max(0, 100 - byCategory.persona),
    channel: Math.max(0, 100 - byCategory.channel),
    claims: Math.max(0, 100 - byCategory.claims),
    compliance: Math.max(0, 100 - byCategory.compliance),
  };
}

function buildSummary(scores: PreflightScores, violations: PreflightViolation[], hardFail: boolean): string {
  if (hardFail) return `Blockerande avvikelser hittades (${violations.filter((v) => v.severity === "hard").length}). Måste åtgärdas innan godkännande.`;
  if (violations.length > 3) return `Flera förbättringar rekommenderas (${violations.length} punkter) för att bli mer on-brand.`;
  if (violations.length > 0) return `Bra grund! Några mindre justeringar rekommenderas (${violations.length} punkter).`;
  if (scores.total >= 90) return "Utmärkt! Följer varumärkesguiden väl.";
  return "Ser bra ut och följer varumärkesguiden.";
}

// ============================================
// HELPERS
// ============================================

function hasCTA(textLower: string): boolean {
  return /(boka|kontakta|läs mer|ring|skicka|beställ|anmäl|prenumerera|se mer|köp|testa|starta|registrera|ladda ner|få|hämta|sign up|get started)/i.test(textLower);
}

function hasEmojis(text: string): boolean {
  return /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(text);
}

function estimateReadingLevel(text: string): "simple" | "normal" | "advanced" {
  const sentences = text.split(/[.!?]/).filter(Boolean);
  const words = text.split(/\s+/).filter(Boolean);
  const avgWordsPerSentence = sentences.length ? words.length / sentences.length : words.length;
  const avgWordLen = words.length ? words.join("").length / words.length : 0;

  if (avgWordsPerSentence <= 12 && avgWordLen <= 5) return "simple";
  if (avgWordsPerSentence >= 20 || avgWordLen >= 7) return "advanced";
  return "normal";
}

function normLevel(lvl: string): "simple" | "normal" | "advanced" {
  const v = normText(lvl);
  if (v === "simple" || v === "lätt" || v === "enkel") return "simple";
  if (v === "advanced" || v === "svår" || v === "avancerad") return "advanced";
  return "normal";
}

function detectClaimLike(contentLower: string): string[] {
  const c = normText(contentLower);
  const found: string[] = [];

  const numericPatterns = [/(\d+%)/g, /(\d+\s*(dagar|veckor|månader|år|timmar|minuter))/g, /(\d+\s*(kr|sek|euro|€|\$|kronor))/g, /(över|mer än|minst|upp till)\s*\d+/g];
  const strongPatterns = [/(bäst|bästa|ledande|främst|nummer ett|#1|störst|snabbast|billigast)/g, /(garanti|garanterad|garanterat|garanterar)/g, /(certifierad|certifierat|godkänd|godkänt|auktoriserad)/g, /(gratis|kostnadsfri|kostnadsfritt|utan kostnad)/g, /(alltid|aldrig|100%|samtliga|alla)/g];
  const ambitionPatterns = [/(vi strävar|vår ambition|vårt mål|vi arbetar för|vi siktar på)/g];

  for (const p of numericPatterns) {
    let m: RegExpExecArray | null;
    const re = new RegExp(p.source, "g");
    while ((m = re.exec(c)) !== null) found.push(m[0]);
  }

  for (const p of strongPatterns) {
    let m: RegExpExecArray | null;
    const re = new RegExp(p.source, "g");
    while ((m = re.exec(c)) !== null) {
      const preceding = c.substring(Math.max(0, m.index - 50), m.index);
      if (!ambitionPatterns.some((ap) => ap.test(preceding))) found.push(m[0]);
    }
  }

  return Array.from(new Set(found)).slice(0, 10);
}

// ============================================
// UTILITY EXPORTS
// ============================================

export async function hashContent(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, 32);
}

export async function getUserId(supabase: any, jwt?: string): Promise<string | null> {
  try {
    const token = jwt ? jwt.replace(/^Bearer\s+/i, "") : undefined;
    const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}
