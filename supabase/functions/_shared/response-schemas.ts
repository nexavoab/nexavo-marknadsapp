// Shared Zod schemas for expert AI responses
import { z } from "https://esm.sh/zod@3.22.4";

// ============================================
// COMMON COMPONENTS
// ============================================

export const SubjectLineSchema = z.object({
  text: z.string(),
  emoji: z.boolean().optional(),
});

export const CtaSchema = z.object({
  text: z.string(),
  url: z.string().optional(),
  style: z.string().optional(),
});

export const EmailStructureSchema = z.object({
  hero: z.object({
    type: z.string(),
    content: z.string(),
  }).optional(),
  body: z.array(z.string()).optional(),
  cta: CtaSchema.optional(),
  footer: z.string().optional(),
});

export const SendTimeSchema = z.object({
  day: z.string(),
  time: z.string(),
  timezone: z.string().optional(),
});

// ============================================
// EMAIL CRM SCHEMA
// ============================================

export const EmailSequenceItemSchema = z.object({
  emailNumber: z.number(),
  triggerType: z.string().optional(),
  delayDays: z.number().optional(),
  subjectLines: z.array(SubjectLineSchema).min(1),
  previewText: z.string().max(150),
  emailType: z.enum(['welcome', 'nurture', 'promotional', 'reminder', 'winback', 'onboarding', 'follow_up']),
  structure: EmailStructureSchema.optional(),
  personalization: z.array(z.string()).optional(),
  sendTime: SendTimeSchema.optional(),
});

export const EmailCRMResponseSchema = z.object({
  sequence: z.array(EmailSequenceItemSchema).optional(),
  welcome_flow: z.array(z.any()).optional(),
  nurture_flow: z.array(z.any()).optional(),
  reengagement_flow: z.array(z.any()).optional(),
  post_purchase_flow: z.array(z.any()).optional(),
  segmentation: z.object({
    primarySegment: z.string().optional(),
    excludeSegments: z.array(z.string()).optional(),
    dynamicContent: z.array(z.object({
      condition: z.string(),
      variation: z.string(),
    })).optional(),
  }).optional(),
  automations: z.array(z.object({
    name: z.string(),
    trigger: z.string(),
    delay: z.string().optional(),
    emails: z.number().optional(),
  })).optional(),
  abTests: z.array(z.object({
    element: z.string(),
    variants: z.number().optional(),
    splitPercent: z.number().optional(),
    winnerMetric: z.string().optional(),
  })).optional(),
  deliverability: z.object({
    warmupRequired: z.boolean().optional(),
    listHygiene: z.array(z.string()).optional(),
    spamChecks: z.array(z.string()).optional(),
  }).optional(),
  key_messaging: z.object({
    primary_hook: z.string().optional(),
    value_props: z.array(z.string()).optional(),
    urgency_triggers: z.array(z.string()).optional(),
  }).optional(),
  personalization_opportunities: z.array(z.string()).optional(),
  kpis: z.object({
    expected_open_rate: z.string().optional(),
    expected_ctr: z.string().optional(),
    expected_conversion_rate: z.string().optional(),
    targetOpenRate: z.number().optional(),
    targetClickRate: z.number().optional(),
    targetConversionRate: z.number().optional(),
  }).optional(),
  risks: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
});

// ============================================
// SMS/PUSH SCHEMA
// ============================================

export const SmsMessageSchema = z.object({
  messageNumber: z.number().optional(),
  message: z.string(),
  characterCount: z.number().optional(),
  smsCreditsNeeded: z.number().optional(),
  timing: z.string().optional(),
  type: z.string().optional(),
});

export const SmsPushResponseSchema = z.object({
  sms_messages: z.array(SmsMessageSchema).optional(),
  push_notifications: z.array(z.object({
    title: z.string(),
    body: z.string(),
    action: z.string().optional(),
  })).optional(),
  sequence_strategy: z.string().optional(),
  personalization_notes: z.array(z.string()).optional(),
  compliance_notes: z.array(z.string()).optional(),
});

// ============================================
// CREATIVE SCHEMA
// ============================================

export const CreativeConceptSchema = z.object({
  concept_name: z.string(),
  headline: z.string(),
  body_copy: z.string().optional(),
  cta: z.string().optional(),
  visual_description: z.string().optional(),
  rationale: z.string().optional(),
});

export const CreativeResponseSchema = z.object({
  concepts: z.array(CreativeConceptSchema).optional(),
  hero_concept: CreativeConceptSchema.optional(),
  variations: z.array(CreativeConceptSchema).optional(),
  format_recommendations: z.array(z.string()).optional(),
  channel_adaptations: z.record(z.any()).optional(),
});

// ============================================
// PAID SEARCH SCHEMA
// ============================================

export const AdCopyVariantSchema = z.object({
  headline1: z.string().max(30),
  headline2: z.string().max(30).optional(),
  headline3: z.string().max(30).optional(),
  description1: z.string().max(90),
  description2: z.string().max(90).optional(),
  path1: z.string().max(15).optional(),
  path2: z.string().max(15).optional(),
});

export const PaidSearchResponseSchema = z.object({
  ad_groups: z.array(z.object({
    name: z.string(),
    keywords: z.array(z.string()).optional(),
    ads: z.array(AdCopyVariantSchema),
  })).optional(),
  responsive_search_ads: z.array(z.object({
    headlines: z.array(z.string()),
    descriptions: z.array(z.string()),
  })).optional(),
  negative_keywords: z.array(z.string()).optional(),
  bidding_strategy: z.string().optional(),
});

// ============================================
// SHARED DELIVERABLE TYPE
// ============================================

export const AiDeliverableSchema = z.object({
  channel: z.string(),
  format: z.string(),
  variants: z.array(z.record(z.unknown())),
  metadata: z.object({
    generated_at: z.string().optional(),
    model: z.string().optional(),
    brand_id: z.string().optional(),
    context_version: z.number().optional(),
  }).optional(),
});

export type AiDeliverable = z.infer<typeof AiDeliverableSchema>;
export type EmailCRMResponse = z.infer<typeof EmailCRMResponseSchema>;
export type SmsPushResponse = z.infer<typeof SmsPushResponseSchema>;
export type CreativeResponse = z.infer<typeof CreativeResponseSchema>;
export type PaidSearchResponse = z.infer<typeof PaidSearchResponseSchema>;

// ============================================
// SAFE PARSE HELPER
// ============================================

/**
 * Parse AI response with schema, log violations but don't throw
 */
export function safeParseResponse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  trace_id: string,
  source: string
): { success: true; data: T } | { success: false; data: unknown; issues: z.ZodIssue[] } {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    console.warn(JSON.stringify({
      at: `${source}.schema_violation`,
      trace_id,
      issues: result.error.issues.slice(0, 5), // Limit logged issues
    }));
    return { success: false, data, issues: result.error.issues };
  }
  
  return { success: true, data: result.data };
}
