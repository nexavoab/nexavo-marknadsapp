/**
 * Shared utility for persona dimension weights based on segment type.
 * Used by edge functions to ensure consistent weighting logic.
 */

export interface DimensionWeights {
  clarity: number;
  relevance: number;
  trust: number;
  cta_strength: number;
  brand_fit: number;
}

const BASE_WEIGHTS: DimensionWeights = {
  clarity: 1.0,
  relevance: 1.0,
  trust: 1.0,
  cta_strength: 1.0,
  brand_fit: 1.0,
};

/**
 * Returns dimension weights optimized for a specific segment type.
 * 
 * - Senior: Higher clarity & trust, lower CTA pressure
 * - Relative/Family: Higher relevance & CTA (ready to act for loved ones)
 * - Franchise: Higher brand fit & trust (investment decision)
 * - Job Seeker: Higher CTA & relevance (active seekers)
 */
export function getDimensionWeightsForSegment(segmentType: string): DimensionWeights {
  const t = (segmentType || '').toLowerCase();
  const weights: DimensionWeights = { ...BASE_WEIGHTS };

  switch (t) {
    case 'senior':
      weights.clarity = 1.3;
      weights.trust = 1.4;
      weights.cta_strength = 0.8;
      break;

    case 'relative':
    case 'family':
      weights.relevance = 1.3;
      weights.cta_strength = 1.2;
      break;

    case 'franchise':
      weights.brand_fit = 1.3;
      weights.trust = 1.2;
      break;

    case 'job_seeker':
      weights.relevance = 1.1;
      weights.cta_strength = 1.2;
      break;

    default:
      break;
  }

  return weights;
}

/**
 * Returns true if weights are effectively "all ones" (default/unset).
 */
export function isAllOnes(weights?: Partial<DimensionWeights> | null): boolean {
  if (!weights) return true;
  
  const keys: (keyof DimensionWeights)[] = ['clarity', 'relevance', 'trust', 'cta_strength', 'brand_fit'];
  return keys.every((k) => {
    const val = weights[k];
    return val === undefined || val === null || Number(val) === 1;
  });
}
