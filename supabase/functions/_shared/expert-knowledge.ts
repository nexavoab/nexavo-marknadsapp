// ============= Expert Knowledge Base =============
// Deep knowledge for the brand expert panel - Själ/Skäl framework, agency principles, industry insights

// ============= SJÄL/SKÄL FRAMEWORK =============
export const SJAL_SKAL_FRAMEWORK = `
DU ANVÄNDER SJÄL/SKÄL-MODELLEN FÖR ATT ANALYSERA VARUMÄRKESBESLUT:

## SJÄL (Det Emotionella)
Det som KÄNNS. Det som skapar MENING och IDENTITET.
├── Varför finns vi? (Purpose beyond profit)
├── Vilken känsla skapar vi hos kunden?
├── Vad är vår berättelse? (Brand narrative)
├── Vilka värderingar driver oss?
├── Vem vill kunden VARA när de väljer oss?
└── RISK: Enbart Själ = Fluffigt, svårt att sälja, ingen konkret substans

## SKÄL (Det Rationella)  
Det som BEVISAS. Det som ger TRYGGHET och LOGIK.
├── Vad levererar vi konkret?
├── Vilka bevis har vi? (Certifikat, recensioner, case)
├── Vad kostar det / sparar det?
├── Vilka garantier ger vi?
├── Vilken risk minskar vi?
└── RISK: Enbart Skäl = Kallt, utbytbart, ingen emotionell koppling

## BALANS-ANALYS
Analysera varje formulering:
- Endast Själ (>70% emotionellt) → "Saknar konkret substans. Kunden förstår känslan men inte erbjudandet."
- Endast Skäl (>70% rationellt) → "Kall och utbytbar. Konkurrenten kan säga samma sak."
- Balanserat (40-60%) → "Optimalt: Emotionell hook + rationellt bevis"

## BALANS-FORMLER (Copy-paste-redo mönster)
- "Vi brinner för [SJÄL] och levererar [SKÄL]"
- "Kunder väljer oss för [SJÄL] och stannar för [SKÄL]"
- "[KÄNSLA som resultat] genom [KONKRET metod]"
- "Inte bara [SKÄL-funktion], utan [SJÄL-upplevelse]"
`;

// ============= INDUSTRY KNOWLEDGE =============
export interface IndustryInsight {
  trends_2024_2025: string[];
  common_mistakes: string[];
  proof_requirements: string[];
  competitive_landscape: string;
  customer_psychology: string;
  key_differentiators: string[];
}

export const INDUSTRY_KNOWLEDGE: Record<string, IndustryInsight> = {
  'bygg_hantverk': {
    trends_2024_2025: [
      'Konsumenter kräver synliga certifieringar (BKR, Safe Control)',
      'Referensprojekt med före/efter-bilder ökar konvertering 3x',
      'ROT-avdrag är hygienfaktor - alla har det, ingen differentiering',
      'Prispress från oseriösa aktörer - differentiera på trygghet',
      'Video-dokumentation av arbeten blir standard',
      'Kundrecensioner på externa plattformar väger tyngre än egen hemsida'
    ],
    common_mistakes: [
      '"Vi har lång erfarenhet" - säg exakt hur lång och hur många projekt',
      '"Hög kvalitet" - visa med certifikat, garanti, eller tredjepartsbetyg',
      '"Personlig service" - beskriv vad det betyder konkret (svarstid, kontaktperson)',
      '"Fasta priser" utan att specificera vad som ingår',
      'Saknar försäkringsbevis synligt på hemsidan'
    ],
    proof_requirements: [
      'Certifieringar med logotyper och verifieringslänkar',
      'Försäkringsbevis (ansvarsförsäkring, allriskförsäkring)',
      'Referensprojekt med namn/bild på kund (efter samtycke)',
      'Garanti-villkor i klartext (inte bara "garanti")',
      'Externa recensioner (Google, Reco, Trustpilot)'
    ],
    competitive_landscape: 'Marknaden är fragmenterad med många små aktörer. De flesta konkurrerar på pris. Professionella kunder (bostadsrättsföreningar, företag) prioriterar trygghet och dokumentation. Privatkunder påverkas starkt av rekommendationer.',
    customer_psychology: 'Kunden är orolig för att bli lurad eller få dåligt utfört arbete. Trygghet och transparens är viktigare än lägsta pris. De vill se bevis innan de vågar lita på er.',
    key_differentiators: [
      'Tydlig projektprocess med milstolpar',
      'Fast kontaktperson genom hela projektet',
      'Dokumenterat kvalitetssystem',
      'Specifik garanti (5 år på arbete, 10 år på material)',
      'Referenskunder som kan kontaktas'
    ]
  },
  'rot_rut': {
    trends_2024_2025: [
      'Skärpta regler för ROT/RUT - kommunicera att ni hanterar allt',
      'Ökad efterfrågan på hållbara lösningar',
      'Digitala bokningssystem förväntas',
      'Transparens kring prissättning är avgörande',
      'Återkommande kunder värderas högre än engångsuppdrag'
    ],
    common_mistakes: [
      'Fokuserar på ROT/RUT som USP - alla har det',
      '"Snabb service" utan att definiera svarstider',
      'Saknar tydlig prissättning eller prisexempel',
      'Ingen uppföljning efter utfört arbete'
    ],
    proof_requirements: [
      'F-skatt och momsregistrering synligt',
      'Tydlig prislista eller kalkylator',
      'Kundbetyg och recensioner',
      'Före/efter-dokumentation'
    ],
    competitive_landscape: 'Hög konkurrens, låg marginal. Differentiera på service och uppföljning snarare än pris.',
    customer_psychology: 'Kunden vill ha enkelhet - "en kontakt som fixar allt". Oro för dolda kostnader är vanlig.',
    key_differentiators: [
      'Allt-i-ett-lösning',
      'Transparenta prisexempel',
      'Uppföljning efter X dagar/veckor',
      'Garanti på arbete'
    ]
  },
  'b2b_tjanster': {
    trends_2024_2025: [
      'Längre beslutsprocesser med fler intressenter',
      'Case studies och ROI-beräkningar är avgörande',
      'Thought leadership via content marketing',
      'Integration med kundens befintliga system förväntas',
      'Prenumerationsmodeller ersätter engångsköp'
    ],
    common_mistakes: [
      '"Helhetslösningar" - för vagt, specificera vad som ingår',
      '"Vi är experter" - visa på vilket sätt (publikationer, föredrag, kunder)',
      'Fokuserar på features istället för business outcomes',
      'Saknar tydlig onboarding-process'
    ],
    proof_requirements: [
      'Namngivna kundcase med mätbara resultat',
      'ROI-kalkylatorer eller business case-mallar',
      'Certifieringar och partnerskap',
      'Teamets kompetens och erfarenhet'
    ],
    competitive_landscape: 'Konsoliderande marknad. Små aktörer måste differentiera på nisch eller service.',
    customer_psychology: 'Beslutsfattaren tar personlig risk vid leverantörsval. Behöver kunna försvara beslutet internt.',
    key_differentiators: [
      'Branschspecialisering',
      'Mätbara resultat från tidigare kunder',
      'Dedikerad kontaktperson/team',
      'SLA:er och servicenivåer'
    ]
  },
  'ehandel': {
    trends_2024_2025: [
      'Snabb leverans är hygienfaktor - fokusera på annat',
      'Hållbarhet och transparens i leveranskedjan',
      'Sociala bevis (UGC, influencers) driver konvertering',
      'Prenumerationsmodeller och medlemskap växer',
      'Omnikanalupplevelse förväntas'
    ],
    common_mistakes: [
      '"Snabb leverans" - alla säger det, var specifik (nästa dag, samma dag)',
      '"Bästa kvalitet" - visa med recensioner, tester, certifikat',
      'Saknar tydlig returpolicy',
      'Ingen personalisering eller rekommendationer'
    ],
    proof_requirements: [
      'Produktrecensioner och betyg',
      'Tydlig fraktpolicy och returer',
      'Sociala bevis (användargenererat innehåll)',
      'Certifieringar (Trygg e-handel, etc.)'
    ],
    competitive_landscape: 'Domineras av stora aktörer. Nischade butiker överlever genom specialisering och community.',
    customer_psychology: 'Kunden jämför enkelt. Förtroende byggs genom sociala bevis och transparent kommunikation.',
    key_differentiators: [
      'Unik produktkunskap/rådgivning',
      'Community eller medlemskap',
      'Hållbarhetsprofil med bevis',
      'Personlig service trots digital kanal'
    ]
  },
  'konsult': {
    trends_2024_2025: [
      'AI-verktyg förväntas - visa hur ni använder dem',
      'Specialisering slår generalisering',
      'Outcome-baserad prissättning ökar',
      'Thought leadership är avgörande för positionering',
      'Remote-first normaliserat'
    ],
    common_mistakes: [
      '"Vi är strategiska rådgivare" - för vagt',
      '"Skräddarsydda lösningar" - alla säger det',
      'Saknar tydlig metodik eller ramverk',
      'Fokuserar på konsulternas bakgrund istället för kundresultat'
    ],
    proof_requirements: [
      'Namngivna kundcase med resultat',
      'Egen metodik eller ramverk (med namn)',
      'Publicerat innehåll (artiklar, rapporter)',
      'Branscherfarenhet'
    ],
    competitive_landscape: 'Fragmenterad marknad. Stora byråer för trygghet, små för personlig service.',
    customer_psychology: 'Köper förtroende och trygghet lika mycket som kompetens. "Ingen fick sparken för att välja McKinsey."',
    key_differentiators: [
      'Egen namngiven metodik',
      'Publicerad expertis',
      'Mätbara resultat från kunder',
      'Specialisering i bransch/område'
    ]
  },
  'default': {
    trends_2024_2025: [
      'Autenticitet och transparens värderas högre än polerad kommunikation',
      'Sociala bevis (recensioner, case) är avgörande',
      'Hållbarhet är hygienfaktor i många branscher',
      'Personalisering förväntas',
      'Digital närvaro är ett minimum'
    ],
    common_mistakes: [
      'Generiska påståenden utan bevis',
      'Fokus på features istället för kundnytta',
      'Saknar tydlig differentiering vs konkurrenter',
      'Inkonsekvent kommunikation över kanaler'
    ],
    proof_requirements: [
      'Kundrecensioner och betyg',
      'Case studies eller referenskunder',
      'Tredjepartscertifieringar',
      'Mätbara resultat'
    ],
    competitive_landscape: 'Varierar per bransch. Generellt ökande konkurrens och transparens.',
    customer_psychology: 'Kunden har tillgång till mer information än någonsin. Ärlighet och bevis värderas.',
    key_differentiators: [
      'Tydlig positionering',
      'Konsekvent varumärkesupplevelse',
      'Bevisad kundnytta',
      'Personlig service'
    ]
  }
};

// ============= AGENCY BEST PRACTICES =============
export const AGENCY_BEST_PRACTICES = `
HUR DE BÄSTA BYRÅERNA ARBETAR (Principer att referera till):

## 1. CATEGORY ENTRY POINTS (Byron Sharp)
När tänker kunden på ert erbjudande? Varumärken måste vara mentalt tillgängliga i rätt ögonblick.
- Identifiera 3-5 "trigger moments" när kunden söker er typ av lösning
- Var synliga i dessa ögonblick
- Exempel: "När du märker att..." / "När det är dags att..."

## 2. DISTINCTIVE BRAND ASSETS (Jenni Romaniuk)
Unika visuella och verbala tillgångar som skapar igenkänning UTAN logotyp.
- Konsekvent färgpalett och typografi
- Unika formuleringar eller slogans
- Igenkännbar tonalitet
- Test: Skulle en kund känna igen er kommunikation utan logotyp?

## 3. MESSAGE HIERARCHY (Porters värdetrappa)
Tre nivåer av budskap - bäst att täcka alla:
1. Funktionella fördelar: Vad gör produkten/tjänsten? (SKÄL)
2. Emotionella fördelar: Hur känns det att använda? (SJÄL)
3. Self-expressive benefits: Vem blir jag som kund? (SJÄL+)

## 4. PROOF POINT SYSTEM
Claims utan bevis är tomma ord. Bevisformeln:
PÅSTÅENDE + MEKANISMEN + BEVISET
- "Vi levererar snabbt [påstående] genom vår lokala lagerstruktur [mekanism] - 94% av ordrar levereras inom 24h [bevis]"

## 5. DISTINCTIVE VOICE TEST
Är tonaliteten unik eller generisk?
- Test: Skulle en konkurrent kunna säga exakt samma sak?
- Om ja: Omformulera tills det BARA passar er
- Anti-mönster: "Vi brinner för kvalitet" ← 84% av företag säger detta

## 6. ELEVATOR PITCH FORMULA
En mening som säger allt:
"För [målgrupp] som vill [mål/behov], erbjuder [företag] [produkt/tjänst] som [key differentiator], till skillnad från [konkurrent/alternativ]."

## 7. MEMORY STRUCTURE
Budskap som fastnar:
- Max 3 nyckelbudskap
- Repetition är underskattat
- Konkreta exempel slår abstrakta påståenden
- Berättelser minns 22x bättre än fakta
`;

// ============= WORRY TYPE ANALYSIS =============
export const WORRY_TYPE_GUIDANCE = `
ANALYSERA ORO OCH INVÄNDNINGAR:

## SJÄL-ORO (Identitetsoro)
Signaler: "tappa", "förlora", "inte vi längre", "corporate", "opersonligt"
→ Kunden oroar sig för att varumärket tappar sin själ
→ Lösning: Betona kontinuitet, arv, "evolution inte revolution"

## SKÄL-ORO (ROI-oro)  
Signaler: "lönar sig", "mätbart", "effekt", "dyrt", "tid"
→ Kunden oroar sig för att investeringen inte ger resultat
→ Lösning: Visa konkreta case, ROI-beräkningar, garantier

## PROCESS-ORO (Genomförandeoro)
Signaler: "fastnar", "oenighet", "intern politik", "ledning"
→ Kunden oroar sig för att processen blir kaotisk
→ Lösning: Tydlig process, milstolpar, beslutsunderlag
`;

// ============= HELPER FUNCTIONS =============

export function getIndustryInsights(industry: string | null | undefined): IndustryInsight {
  if (!industry) return INDUSTRY_KNOWLEDGE['default'];
  
  // Normalize industry string
  const normalized = industry.toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]/g, '_');
  
  // Map common industry names to our keys
  const industryMap: Record<string, string> = {
    'bygg': 'bygg_hantverk',
    'byggnad': 'bygg_hantverk',
    'byggnation': 'bygg_hantverk',
    'hantverk': 'bygg_hantverk',
    'hantverkare': 'bygg_hantverk',
    'malare': 'bygg_hantverk',
    'snickare': 'bygg_hantverk',
    'elektriker': 'bygg_hantverk',
    'ror': 'bygg_hantverk',
    'vvs': 'bygg_hantverk',
    'rot': 'rot_rut',
    'rut': 'rot_rut',
    'rot_rut': 'rot_rut',
    'hemtjanst': 'rot_rut',
    'stadning': 'rot_rut',
    'b2b': 'b2b_tjanster',
    'foretag': 'b2b_tjanster',
    'tjanster': 'b2b_tjanster',
    'konsulting': 'konsult',
    'konsult': 'konsult',
    'radgivning': 'konsult',
    'ehandel': 'ehandel',
    'webshop': 'ehandel',
    'butik': 'ehandel',
    'retail': 'ehandel',
  };
  
  const mappedKey = industryMap[normalized] || normalized;
  return INDUSTRY_KNOWLEDGE[mappedKey] || INDUSTRY_KNOWLEDGE['default'];
}

export function formatIndustryContextForPrompt(industry: string | null | undefined): string {
  const insights = getIndustryInsights(industry);
  const industryName = industry || 'din bransch';
  
  return `
BRANSCHSPECIFIK KUNSKAP (${industryName.toUpperCase()}):

TRENDER 2024-2025:
${insights.trends_2024_2025.map(t => `- ${t}`).join('\n')}

VANLIGA MISSTAG I BRANSCHEN:
${insights.common_mistakes.map(m => `- ${m}`).join('\n')}

KRAV PÅ BEVIS:
${insights.proof_requirements.map(p => `- ${p}`).join('\n')}

KONKURRENSSITUATION:
${insights.competitive_landscape}

KUNDPSYKOLOGI:
${insights.customer_psychology}

DIFFERENTIERINGS­MÖJLIGHETER:
${insights.key_differentiators.map(d => `- ${d}`).join('\n')}
`;
}

export function formatSjalSkalContext(
  profile: { sjalScore: number; skalScore: number; profile: string } | null,
  worryType: string | null
): string {
  if (!profile) return '';
  
  const profileDescriptions: Record<string, string> = {
    'mostly_sjal': 'Teamet fokuserar på emotionella värden och identitet. RISK: Kan sakna konkreta bevis.',
    'mostly_skal': 'Teamet fokuserar på rationella argument och bevis. RISK: Kan sakna emotionell koppling.',
    'balanced': 'Teamet har god balans mellan känsla och logik. STYRKA: Tilltalar både hjärta och hjärna.',
  };

  const worryDescriptions: Record<string, string> = {
    'sjal': 'Teamet oroar sig för att tappa varumärkets själ och identitet. Betona kontinuitet.',
    'skal': 'Teamet oroar sig för ROI och mätbarhet. Visa konkreta resultat och business case.',
    'process': 'Teamet oroar sig för intern oenighet och beslutsprocess. Ge tydliga beslutsstöd.',
  };

  return `
TEAMETS PROFIL (Själ/Skäl-analys):
- Själ: ${profile.sjalScore}% | Skäl: ${profile.skalScore}%
- Profil: ${profile.profile}
- Tolkning: ${profileDescriptions[profile.profile] || 'Okänd profil'}
${worryType ? `\nORO-TYP: ${worryType}\n- ${worryDescriptions[worryType] || 'Okänd oro'}` : ''}
`;
}

// Interface for enriched competitor data
export interface EnrichedCompetitor {
  name?: string;
  strengths?: string;
  weaknesses?: string;
  headline?: string;
  tone?: string;
  primary_color?: string;
  ai_summary?: string;
  ai_strengths?: string[];
  ai_weaknesses?: string[];
  type?: 'direct' | 'inspiration' | 'irrelevant';
}

// Interface for competitors summary
export interface CompetitorsSummary {
  typical_messages?: string[];
  typical_positions?: string[];
  typical_audiences?: string[];
  white_spaces?: string[];
  notes?: string;
  competitor_observations?: string[];
  key_competitor_insights?: string[];
}

export function formatCompetitorContext(
  competitors: EnrichedCompetitor[] | null,
  summary?: CompetitorsSummary | null
): string {
  if (!competitors || competitors.length === 0) return '';
  
  // Filter out irrelevant competitors
  const relevantCompetitors = competitors.filter(c => c.type !== 'irrelevant' && c.name);
  
  if (relevantCompetitors.length === 0) return '';
  
  const directCount = relevantCompetitors.filter(c => c.type === 'direct').length;
  const inspirationCount = relevantCompetitors.filter(c => c.type === 'inspiration').length;
  
  const formatted = relevantCompetitors
    .map(c => {
      const lines = [`### ${c.name}`];
      if (c.headline) lines.push(`Headline: "${c.headline}"`);
      if (c.tone) lines.push(`Tonalitet: ${c.tone}`);
      if (c.primary_color) lines.push(`Primärfärg: ${c.primary_color}`);
      if (c.ai_summary) lines.push(`Sammanfattning: ${c.ai_summary}`);
      if (c.ai_strengths?.length) lines.push(`Styrkor: ${c.ai_strengths.join(', ')}`);
      if (c.ai_weaknesses?.length) lines.push(`Svagheter: ${c.ai_weaknesses.join(', ')}`);
      // Fallback to legacy fields
      if (!c.ai_strengths?.length && c.strengths) lines.push(`Styrkor: ${c.strengths}`);
      if (!c.ai_weaknesses?.length && c.weaknesses) lines.push(`Svagheter: ${c.weaknesses}`);
      return lines.join('\n');
    })
    .join('\n\n');

  let context = `
═══════════════════════════════════════════════════════════════
KONKURRENTANALYS (${directCount} direkta, ${inspirationCount} inspiration)
═══════════════════════════════════════════════════════════════
${formatted}
`;

  // Add summary insights if available
  if (summary) {
    if (summary.typical_messages?.length) {
      context += `
═══════════════════════════════════════════════════════════════
FRASER ATT UNDVIKA (dessa säger alla andra redan):
═══════════════════════════════════════════════════════════════
${summary.typical_messages.map(m => `❌ "${m}"`).join('\n')}

REGEL: Om ditt förslag innehåller dessa fraser, FLAGGA det och föreslå alternativ.
`;
    }

    if (summary.typical_positions?.length) {
      context += `
VANLIGA POSITIONER (redan upptagna):
${summary.typical_positions.map(p => `• ${p}`).join('\n')}

REGEL: Föreslå INTE dessa positioner - de är redan tagna av konkurrenter.
`;
    }

    if (summary.white_spaces?.length) {
      context += `
═══════════════════════════════════════════════════════════════
VITA FLÄCKAR (möjligheter för differentiering):
═══════════════════════════════════════════════════════════════
${summary.white_spaces.map(ws => `★ ${ws}`).join('\n')}

REGEL: Prioritera förslag som utnyttjar dessa vita fläckar.
`;
    }

    if (summary.key_competitor_insights?.length) {
      context += `
NYCKELINSIKTER:
${summary.key_competitor_insights.map(i => `→ ${i}`).join('\n')}
`;
    }
  }

  context += `
DIFFERENTIERINGSFRÅGA: Vad kan BARA detta varumärke säga som INGEN av konkurrenterna ovan kan säga?
`;

  return context;
}

export function formatCustomerInsightsContext(
  insights: {
    customer?: Array<{ quote?: string; source?: string }>;
    internal?: { leadership_view?: string; staff_view?: string };
  } | null
): string {
  if (!insights) return '';
  
  const parts: string[] = [];
  
  // Customer quotes
  if (insights.customer && insights.customer.length > 0) {
    const quotes = insights.customer
      .filter(q => q.quote)
      .map(q => `"${q.quote}"${q.source ? ` (${q.source})` : ''}`)
      .slice(0, 3);
    
    if (quotes.length > 0) {
      parts.push(`KUNDCITAT:\n${quotes.join('\n')}`);
    }
  }
  
  // Internal views
  if (insights.internal) {
    if (insights.internal.leadership_view) {
      parts.push(`LEDNINGENS SYN: ${insights.internal.leadership_view}`);
    }
    if (insights.internal.staff_view) {
      parts.push(`MEDARBETARNAS SYN: ${insights.internal.staff_view}`);
    }
  }
  
  return parts.length > 0 ? `\n${parts.join('\n\n')}` : '';
}

// ============= EXPERT SALES =============
export const EXPERT_SALES = {
  role: 'Säljexpert & Konverteringsspecialist',
  expertise: [
    'Säljprocesser (B2B & B2C)',
    'Konverteringsoptimering',
    'Prissättningsstrategi',
    'Invändningshantering',
    'Value-based selling',
    'Customer lifetime value',
    'Upsell & cross-sell'
  ],
  frameworks: ['SPIN Selling', 'Challenger Sale', 'MEDDIC', 'Value Selling'],
  industryKnowledge: {
    'rot_rut': {
      salesCycle: '1-4 veckor',
      avgOrderValue: '15000-50000 SEK',
      keyObjections: ['Pris', 'Förtroende', 'Timing'],
      winningTactics: ['RUT-förklaring', 'Referenscase', 'Trygghetsgaranti']
    },
    'b2b_tjanster': {
      salesCycle: '1-6 månader',
      avgOrderValue: '50000-500000 SEK',
      keyObjections: ['Budget', 'Beslutsprocessen', 'Intern förankring'],
      winningTactics: ['ROI-beräkning', 'Business case', 'Pilot/POC']
    },
    'ehandel': {
      salesCycle: 'Omedelbar',
      avgOrderValue: '500-5000 SEK',
      keyObjections: ['Frakt', 'Returer', 'Kvalitet'],
      winningTactics: ['Fri frakt-trösklar', 'Recensioner', 'Garanti']
    }
  },
  conversionTactics: {
    urgency: ['Begränsat lager', 'Tidsbegränsat erbjudande', 'Exklusiv förhandstitt'],
    trust: ['Kundrecensioner', 'Trygghetssymboler', 'Garanti', 'Referensprojekt'],
    value: ['Före/efter', 'ROI-kalkylator', 'Besparingsberäkning', 'Prisexempel'],
    friction: ['Enklare formulär', 'Färre steg', 'Tydliga CTA', 'Mobiloptimering']
  }
};

export function formatSalesContext(industry: string | null | undefined): string {
  const industryKey = industry?.toLowerCase().replace(/[^a-z]/g, '_') || 'default';
  const salesData = EXPERT_SALES.industryKnowledge[industryKey as keyof typeof EXPERT_SALES.industryKnowledge];
  
  if (!salesData) {
    return `
SÄLJEXPERTIS:
- Roll: ${EXPERT_SALES.role}
- Ramverk: ${EXPERT_SALES.frameworks.join(', ')}
- Expertområden: ${EXPERT_SALES.expertise.join(', ')}
`;
  }
  
  return `
SÄLJEXPERTIS FÖR ${industry?.toUpperCase() || 'DIN BRANSCH'}:
- Roll: ${EXPERT_SALES.role}
- Säljcykel: ${salesData.salesCycle}
- Typiskt ordervärde: ${salesData.avgOrderValue}
- Vanliga invändningar: ${salesData.keyObjections.join(', ')}
- Vinnande taktiker: ${salesData.winningTactics.join(', ')}

KONVERTERINGSTAKTIKER:
- Urgency: ${EXPERT_SALES.conversionTactics.urgency.join(', ')}
- Trust: ${EXPERT_SALES.conversionTactics.trust.join(', ')}
- Value: ${EXPERT_SALES.conversionTactics.value.join(', ')}
`;
}
