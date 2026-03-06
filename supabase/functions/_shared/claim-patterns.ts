/**
 * Shared claim patterns for compliance checking
 * Used by: expert-compliance, claims-legal-preflight
 */

export type ClaimSeverity = "high" | "medium" | "low";

export type ClaimType =
  | "superlative"
  | "price_claim"
  | "guarantee"
  | "absolute"
  | "statistic"
  | "scientific"
  | "ranking"
  | "free_claim"
  | "speed_claim"
  | "universal"
  | "comparison";

export interface ClaimPattern {
  pattern: RegExp;
  type: ClaimType;
  severity: ClaimSeverity;
  guidance: string;
}

/**
 * Common risky claim patterns that require proof or should be avoided
 */
export const RISKY_CLAIM_PATTERNS: ClaimPattern[] = [
  { 
    pattern: /\b(bäst|bästa|nummer ett|#1|ledande)\b/gi, 
    type: "superlative", 
    severity: "high",
    guidance: "Undvik superlativ utan bevis" 
  },
  { 
    pattern: /\b(billigast|lägst pris|prisgaranti)\b/gi, 
    type: "price_claim", 
    severity: "high",
    guidance: "Prispåståenden kräver bevis" 
  },
  { 
    pattern: /\b(snabbast|först)\b/gi, 
    type: "superlative", 
    severity: "high",
    guidance: "Kräver dokumentation" 
  },
  { 
    pattern: /\b(garanterat|garanterad|garanti|100%)\b/gi, 
    type: "guarantee", 
    severity: "medium",
    guidance: "Specificera villkor" 
  },
  { 
    pattern: /\b(alltid|aldrig)\b/gi, 
    type: "absolute", 
    severity: "medium",
    guidance: "Undvik absoluta påståenden" 
  },
  { 
    pattern: /\b(\d+%)\s*(bättre|mer|mindre)/gi, 
    type: "statistic", 
    severity: "medium",
    guidance: "Statistik kräver källa" 
  },
  { 
    pattern: /\b(\d+%|procent av|av \d+)\b/gi, 
    type: "statistic", 
    severity: "medium",
    guidance: "Statistik kräver källa" 
  },
  { 
    pattern: /\b(kliniskt bevisad?|vetenskapligt|forskning visar)\b/gi, 
    type: "scientific", 
    severity: "high",
    guidance: "Kräver studiereferens" 
  },
  { 
    pattern: /\b(nr\s*1|nummer ett)\b/gi, 
    type: "ranking", 
    severity: "high",
    guidance: "Kräver rankingkälla" 
  },
  { 
    pattern: /\b(gratis|kostnadsfri|utan kostnad)\b/gi, 
    type: "free_claim", 
    severity: "low",
    guidance: "Specificera eventuella villkor" 
  },
  { 
    pattern: /\b(omedelbar|direkt|snabb) (effekt|resultat|förändring)\b/gi, 
    type: "speed_claim", 
    severity: "medium",
    guidance: "Specificera tidsram" 
  },
  { 
    pattern: /\b(alla|samtliga|varje) (kunder?|användare?)\b/gi, 
    type: "universal", 
    severity: "medium",
    guidance: "Undvik universella påståenden" 
  },
  { 
    pattern: /\bjämfört med (konkurrent|andra|övriga)\b/gi, 
    type: "comparison", 
    severity: "high",
    guidance: "Specificera jämförelse med källa" 
  },
];

/**
 * Rewrite suggestions for common claim types
 */
export const REWRITE_SUGGESTIONS: Record<ClaimType, string[]> = {
  superlative: [
    "Byt 'bäst' mot 'ett av de ledande' eller specificera område",
    "Använd 'vårt mest populära' istället för 'bästa'",
    "Lägg till 'enligt våra kunders bedömning' om du har data"
  ],
  price_claim: [
    "Specificera jämförelse: 'lägre pris än [konkurrent] på [produkt]'",
    "Lägg till villkor: 'billigast bland [kategori] enligt [källa]'",
    "Använd 'konkurrenskraftigt pris' istället för absoluta påståenden"
  ],
  guarantee: [
    "Specificera vad garantin täcker och villkor",
    "Använd 'vi strävar efter' istället för 'garanterat'",
    "Lägg till disclaimer för garantivillkor"
  ],
  statistic: [
    "Lägg till källa och datum för statistiken",
    "Specificera urvalsgrupp och metod",
    "Använd 'cirka' eller 'ungefär' om siffran är uppskattad"
  ],
  comparison: [
    "Namnge konkurrenten om du har verifierbar data",
    "Använd 'i vår kategori' istället för allmänna jämförelser",
    "Lägg till källa för jämförelsen"
  ],
  scientific: [
    "Länka till publicerad studie",
    "Använd 'studier tyder på' istället för 'bevisat'",
    "Ange specifik forskningsinstitution"
  ],
  absolute: [
    "Använd 'ofta' istället för 'alltid'",
    "Använd 'sällan' istället för 'aldrig'",
    "Lägg till 'i de flesta fall'"
  ],
  ranking: [
    "Ange källa för rankningen (t.ex. 'enligt Trustpilot 2024')",
    "Specificera kategori och geografiskt område",
    "Använd 'topprankad' istället för 'nummer ett' om du inte har exakt data"
  ],
  free_claim: [
    "Specificera eventuella villkor för 'gratis'",
    "Lägg till 'ingen startavgift' eller liknande om det finns andra kostnader",
    "Var tydlig med vad som ingår kostnadsfritt"
  ],
  speed_claim: [
    "Ange konkret tidsram istället för 'omedelbar'",
    "Använd 'inom X minuter/timmar' för precision",
    "Lägg till 'under normala förhållanden' om tillämpligt"
  ],
  universal: [
    "Använd 'majoriteten av' istället för 'alla'",
    "Lägg till 'baserat på X kunders feedback'",
    "Specificera urvalsgrupp och tidsperiod"
  ],
};
