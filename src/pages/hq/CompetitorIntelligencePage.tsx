import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2, Info, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface CompetitorAd {
  ad_id: string
  page_name: string
  ad_creative_body: string
  start_date: string
  publisher_platforms: string[]
  status: 'ACTIVE' | 'INACTIVE'
  ad_creative_link_title?: string
  ad_creative_link_caption?: string
}

function AdCard({ ad }: { ad: CompetitorAd }) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted-foreground">
          {ad.page_name} • {new Date(ad.start_date).toLocaleDateString('sv-SE')}
        </div>
        {ad.status === 'ACTIVE' ? (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Aktiv</Badge>
        ) : (
          <Badge variant="secondary">Inaktiv</Badge>
        )}
      </div>
      
      <p className="text-sm font-medium mb-3 line-clamp-3">{ad.ad_creative_body}</p>
      
      {ad.ad_creative_link_title && (
        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />
          <span className="font-medium">{ad.ad_creative_link_title}</span>
          {ad.ad_creative_link_caption && (
            <span>• {ad.ad_creative_link_caption}</span>
          )}
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        {ad.publisher_platforms?.map((platform) => (
          <Badge key={platform} variant="outline" className="text-xs capitalize">
            {platform}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="border rounded-lg p-4 bg-white shadow-sm animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="h-3 bg-slate-200 rounded w-24" />
            <div className="h-5 bg-slate-200 rounded w-12" />
          </div>
          <div className="space-y-2 mb-3">
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-3/4" />
          </div>
          <div className="flex gap-2">
            <div className="h-5 bg-slate-200 rounded w-16" />
            <div className="h-5 bg-slate-200 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Search className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 mb-2">Inga annonser hittades</h3>
      <p className="text-slate-500 max-w-md mx-auto">
        Vi hittade inga annonser för "{query}". Prova att söka på ett annat företagsnamn.
      </p>
    </div>
  )
}

function InitialState() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Search className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 mb-2">Sök efter konkurrenter</h3>
      <p className="text-slate-500 max-w-md mx-auto">
        Skriv in ett företagsnamn för att se deras aktiva annonser på Meta-plattformarna.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <span className="text-xs text-slate-400">Populära sökningar:</span>
        {['Hemfrid', 'Städalliansen', 'Clean Home'].map((suggestion) => (
          <Badge key={suggestion} variant="outline" className="cursor-pointer hover:bg-slate-100">
            {suggestion}
          </Badge>
        ))}
      </div>
    </div>
  )
}

export default function CompetitorIntelligencePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [ads, setAds] = useState<CompetitorAd[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [lastQuery, setLastQuery] = useState('')

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Ange ett sökord')
      return
    }

    setLoading(true)
    setHasSearched(true)
    setLastQuery(searchQuery.trim())

    try {
      const { data, error } = await supabase.functions.invoke('meta-ad-library', {
        body: { searchQuery: searchQuery.trim() }
      })

      if (error) {
        console.error('Edge function error:', error)
        toast.error('Kunde inte hämta annonser. Försök igen.')
        setAds([])
        return
      }

      setAds(data?.ads || [])
      
      if (data?.ads?.length > 0) {
        toast.success(`Hittade ${data.ads.length} annonser`)
      }
    } catch (err) {
      console.error('Search error:', err)
      toast.error('Ett fel uppstod. Försök igen.')
      setAds([])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Konkurrentanalys</h1>
        <p className="text-slate-500">
          Se vad konkurrenterna annonserar på Facebook och Instagram
        </p>
      </div>

      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Sök annonsör (t.ex. Hemfrid, Städalliansen...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading} className="sm:w-auto w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Söker...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Sök
            </>
          )}
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Om konkurrentanalys</p>
          <p className="text-blue-700">
            Data hämtas från Meta Ad Library och visar aktiva annonser i Sverige. 
            Använd insikterna för att förstå konkurrenternas budskap och hitta möjligheter att sticka ut.
          </p>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSkeleton />
      ) : !hasSearched ? (
        <InitialState />
      ) : ads.length === 0 ? (
        <EmptyState query={lastQuery} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {ads.length} annonser för "{lastQuery}"
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ads.map((ad) => (
              <AdCard key={ad.ad_id} ad={ad} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
