import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock data - Meta Ad Library har ingen officiell REST API utan access token
// Detta är realistisk mock-data för demonstration
const MOCK_ADS_DATABASE: Record<string, Array<{
  ad_id: string;
  page_name: string;
  ad_creative_body: string;
  start_date: string;
  publisher_platforms: string[];
  status: 'ACTIVE' | 'INACTIVE';
  ad_creative_link_title?: string;
  ad_creative_link_caption?: string;
}>> = {
  'hemfrid': [
    {
      ad_id: 'hf-001',
      page_name: 'Hemfrid',
      ad_creative_body: 'Professionell städning från 249 kr/h. RUT-avdrag 50%. Boka nu!',
      start_date: '2026-03-01',
      publisher_platforms: ['facebook', 'instagram'],
      status: 'ACTIVE',
      ad_creative_link_title: 'Boka städning idag',
      ad_creative_link_caption: 'hemfrid.se'
    },
    {
      ad_id: 'hf-002',
      page_name: 'Hemfrid',
      ad_creative_body: 'Fönsterputs inför sommaren — boka innan 1 april!',
      start_date: '2026-03-05',
      publisher_platforms: ['instagram'],
      status: 'ACTIVE',
      ad_creative_link_title: 'Fönsterputs',
      ad_creative_link_caption: 'hemfrid.se'
    },
    {
      ad_id: 'hf-003',
      page_name: 'Hemfrid',
      ad_creative_body: 'Vi har städat svenska hem i över 25 år. Boka din första städning med 20% rabatt.',
      start_date: '2026-02-20',
      publisher_platforms: ['facebook'],
      status: 'ACTIVE',
      ad_creative_link_title: 'Prova Hemfrid',
      ad_creative_link_caption: 'hemfrid.se'
    }
  ],
  'städalliansen': [
    {
      ad_id: 'sa-001',
      page_name: 'Städalliansen',
      ad_creative_body: 'Vi städar hela Stockholm. Certifierade städare, nöjd-kund-garanti.',
      start_date: '2026-02-15',
      publisher_platforms: ['facebook'],
      status: 'ACTIVE',
      ad_creative_link_title: 'Städning i Stockholm',
      ad_creative_link_caption: 'städalliansen.se'
    },
    {
      ad_id: 'sa-002',
      page_name: 'Städalliansen',
      ad_creative_body: 'Storstädning? Vi fixar! Från 1 490 kr (efter RUT). Boka idag!',
      start_date: '2026-03-01',
      publisher_platforms: ['facebook', 'instagram'],
      status: 'ACTIVE',
      ad_creative_link_title: 'Storstädning',
      ad_creative_link_caption: 'städalliansen.se'
    }
  ],
  'fixaren': [
    {
      ad_id: 'fx-001',
      page_name: 'Fixaren',
      ad_creative_body: 'Hem- och kontorsstädning i Göteborg. Flexibla tider, fast pris.',
      start_date: '2026-02-28',
      publisher_platforms: ['facebook'],
      status: 'ACTIVE',
      ad_creative_link_title: 'Städning Göteborg',
      ad_creative_link_caption: 'fixaren.se'
    }
  ],
  'clean home': [
    {
      ad_id: 'ch-001',
      page_name: 'Clean Home Sverige',
      ad_creative_body: 'Miljövänlig städning för ditt hem. 100% ekologiska produkter.',
      start_date: '2026-03-03',
      publisher_platforms: ['instagram'],
      status: 'ACTIVE',
      ad_creative_link_title: 'Ekologisk städning',
      ad_creative_link_caption: 'cleanhome.se'
    },
    {
      ad_id: 'ch-002',
      page_name: 'Clean Home Sverige',
      ad_creative_body: 'Allergivänlig städning – perfekt för barnfamiljer. Boka gratis provstädning!',
      start_date: '2026-02-25',
      publisher_platforms: ['facebook', 'instagram'],
      status: 'ACTIVE',
      ad_creative_link_title: 'Allergivänlig städning',
      ad_creative_link_caption: 'cleanhome.se'
    }
  ],
  'björntjänst': [
    {
      ad_id: 'bj-001',
      page_name: 'Björntjänst',
      ad_creative_body: 'Trädgårdsstädning + husstädning = samma faktura! RUT-avdrag på allt.',
      start_date: '2026-03-02',
      publisher_platforms: ['facebook'],
      status: 'ACTIVE',
      ad_creative_link_title: 'Hus & trädgård',
      ad_creative_link_caption: 'björntjänst.se'
    }
  ]
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchQuery } = await req.json();

    if (!searchQuery || typeof searchQuery !== 'string') {
      return new Response(
        JSON.stringify({ 
          error: 'Missing or invalid searchQuery parameter',
          ads: [] 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    // Search through mock database
    const matchingAds: typeof MOCK_ADS_DATABASE[string] = [];
    
    for (const [key, ads] of Object.entries(MOCK_ADS_DATABASE)) {
      if (key.includes(normalizedQuery) || normalizedQuery.includes(key)) {
        matchingAds.push(...ads);
      } else {
        // Also search in ad content
        for (const ad of ads) {
          if (
            ad.page_name.toLowerCase().includes(normalizedQuery) ||
            ad.ad_creative_body.toLowerCase().includes(normalizedQuery)
          ) {
            matchingAds.push(ad);
          }
        }
      }
    }

    // Remove duplicates by ad_id
    const uniqueAds = Array.from(
      new Map(matchingAds.map(ad => [ad.ad_id, ad])).values()
    );

    // Sort by start_date descending (newest first)
    uniqueAds.sort((a, b) => 
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );

    console.log(`[meta-ad-library] Query: "${searchQuery}" → ${uniqueAds.length} ads found`);

    return new Response(
      JSON.stringify({
        ads: uniqueAds,
        query: searchQuery,
        total: uniqueAds.length,
        note: 'Mock data - Meta Ad Library har ingen officiell API utan access token'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[meta-ad-library] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        ads: []
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
