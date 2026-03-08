import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { Facebook, Instagram, Globe, Search } from 'lucide-react'

// Types
type Channel = 'facebook' | 'instagram' | 'google' | 'display'
type Status = 'winner' | 'running' | 'draft'

interface Variant {
  label: string
  copy: string
  reach: number
  clicks: number
  ctr: number
  conversions: number
  trend: number[]
  extraLabel?: string
  extraValue?: string
}

interface ABTest {
  id: number
  name: string
  channel: Channel
  status: Status
  variantA: Variant
  variantB: Variant
  winner: 'A' | 'B' | null
  winMargin: number
}

// Mock data
const AB_TESTS = {
  posts: [
    {
      id: 1,
      name: 'Helgfrid — Vår 2026',
      channel: 'facebook' as const,
      status: 'winner' as const,
      variantA: {
        label: 'Version A — Med pris',
        copy: 'Återta din helg för 900 kr efter RUT.',
        reach: 4200, clicks: 189, ctr: 4.5, conversions: 12,
        trend: [2.1, 2.8, 3.5, 4.0, 4.5],
      },
      variantB: {
        label: 'Version B — Emotionell hook',
        copy: 'Sluta städa bort dina helger. Kom hem till ett nystädat hem på fredag.',
        reach: 6800, clicks: 408, ctr: 6.0, conversions: 28,
        trend: [2.5, 3.2, 4.1, 5.2, 6.0],
      },
      winner: 'B' as const,
      winMargin: 33,
    },
    {
      id: 2,
      name: 'Vårkänslor — Mars',
      channel: 'instagram' as const,
      status: 'running' as const,
      variantA: {
        label: 'Version A — Med pris',
        copy: 'Dammråttorna från vintern har gjort sig hemmastadda. Vårstädning från 1 300 kr efter RUT.',
        reach: 3100, clicks: 65, ctr: 2.1, conversions: 4,
        trend: [1.8, 1.9, 2.0, 2.1, 2.1],
      },
      variantB: {
        label: 'Version B — Känsla',
        copy: 'Solen avslöjar allt. Tänk att få in vårljuset i ett helt rent hem.',
        reach: 3400, clicks: 78, ctr: 2.3, conversions: 5,
        trend: [1.9, 2.0, 2.1, 2.2, 2.3],
      },
      winner: null,
      winMargin: 9,
    },
    {
      id: 3,
      name: 'Gästklart — Påsk',
      channel: 'facebook' as const,
      status: 'winner' as const,
      variantA: {
        label: 'Version A — Social proof',
        copy: 'Väntar du gäster? Slipp städpaniken. 900 kr (medel) efter RUT.',
        reach: 5200, clicks: 198, ctr: 3.8, conversions: 18,
        trend: [3.0, 3.2, 3.5, 3.7, 3.8],
      },
      variantB: {
        label: 'Version B — Känsla',
        copy: 'Känslan när gästerna ringer på dörren och du vet att hemmet är i toppskick.',
        reach: 4800, clicks: 139, ctr: 2.9, conversions: 11,
        trend: [2.5, 2.6, 2.8, 2.9, 2.9],
      },
      winner: 'A' as const,
      winMargin: 31,
    },
  ],
  articles: [
    {
      id: 4,
      name: '5 tecken på att du behöver städhjälp',
      channel: 'google' as const,
      status: 'winner' as const,
      variantA: {
        label: 'Version A — Kort rubrik',
        copy: '5 tecken på att du behöver städhjälp',
        reach: 1200, clicks: 96, ctr: 8.0, conversions: 7,
        trend: [5.5, 6.2, 6.8, 7.5, 8.0],
      },
      variantB: {
        label: 'Version B — Siffra + fråga',
        copy: 'Känner du igen dessa 5 varningssignaler? Det är dags att boka städhjälp',
        reach: 1200, clicks: 132, ctr: 11.0, conversions: 14,
        trend: [7.0, 8.2, 9.1, 10.2, 11.0],
      },
      winner: 'B' as const,
      winMargin: 38,
    },
    {
      id: 5,
      name: 'RUT-avdrag 2026 — komplett guide',
      channel: 'google' as const,
      status: 'running' as const,
      variantA: {
        label: 'Version A — Informativ',
        copy: 'RUT-avdrag 2026: Allt du behöver veta',
        reach: 890, clicks: 62, ctr: 7.0, conversions: 3,
        trend: [5.8, 6.2, 6.5, 6.8, 7.0],
      },
      variantB: {
        label: 'Version B — Sparar-fokus',
        copy: 'Spara 50% på städning — så fungerar RUT-avdraget 2026',
        reach: 890, clicks: 71, ctr: 8.0, conversions: 5,
        trend: [6.0, 6.5, 7.0, 7.5, 8.0],
      },
      winner: null,
      winMargin: 14,
    },
  ],
  website: [
    {
      id: 6,
      name: 'Startsidan — H1-rubrik',
      channel: 'display' as const,
      status: 'winner' as const,
      variantA: {
        label: 'Version A — Tjänstebeskrivning',
        copy: 'Hushållsnära tjänster av erfarna seniorer',
        reach: 4500, clicks: 2025, ctr: 45.0, conversions: 187,
        trend: [42, 43, 44, 44, 45],
        extraLabel: 'Bounce rate',
        extraValue: '42%',
      },
      variantB: {
        label: 'Version B — Positionering',
        copy: 'Erfarna händer. Frigjord tid. Förutsägbar vardag.',
        reach: 4500, clicks: 1755, ctr: 39.0, conversions: 142,
        trend: [55, 58, 60, 61, 61],
        extraLabel: 'Bounce rate',
        extraValue: '61%',
      },
      winner: 'A' as const,
      winMargin: 32,
    },
    {
      id: 7,
      name: 'Prissida — CTA-knapp',
      channel: 'display' as const,
      status: 'running' as const,
      variantA: {
        label: 'Version A',
        copy: 'Boka nu',
        reach: 1200, clicks: 144, ctr: 12.0, conversions: 18,
        trend: [10, 10.5, 11, 11.5, 12],
      },
      variantB: {
        label: 'Version B',
        copy: 'Få en offert',
        reach: 1200, clicks: 132, ctr: 11.0, conversions: 15,
        trend: [9, 9.8, 10.2, 10.8, 11],
      },
      winner: null,
      winMargin: 9,
    },
  ],
}

// Channel icon component
function ChannelIcon({ channel }: { channel: Channel }) {
  const icons = {
    facebook: <Facebook className="h-4 w-4 text-blue-600" />,
    instagram: <Instagram className="h-4 w-4 text-pink-600" />,
    google: <Search className="h-4 w-4 text-green-600" />,
    display: <Globe className="h-4 w-4 text-purple-600" />,
  }
  return icons[channel]
}

// Status badge component
function StatusBadge({ status }: { status: Status }) {
  if (status === 'winner') {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">🏆 Vinnare</Badge>
  }
  if (status === 'running') {
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">⚡ Pågående</Badge>
  }
  return <Badge variant="secondary">· Utkast</Badge>
}

// Sparkline component
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ i, v }))
  return (
    <div className="w-[120px] h-[40px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Variant column component
function VariantColumn({ 
  variant, 
  isWinner 
}: { 
  variant: Variant
  isWinner: boolean
}) {
  const borderClass = isWinner ? 'border-2 border-green-500 bg-green-50/50' : 'border border-border'
  const sparkColor = isWinner ? '#22c55e' : '#94a3b8'
  
  return (
    <div className={`flex-1 rounded-lg p-4 ${borderClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">{variant.label}</span>
        {isWinner && (
          <Badge className="bg-green-600 text-white hover:bg-green-600">🏆 Vinnare</Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground italic mb-4">"{variant.copy}"</p>
      
      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <span className="text-muted-foreground">Räckvidd</span>
          <p className="font-semibold">{variant.reach.toLocaleString('sv-SE')}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Klick</span>
          <p className="font-semibold">{variant.clicks.toLocaleString('sv-SE')}</p>
        </div>
        <div>
          <span className="text-muted-foreground">CTR%</span>
          <p className="font-semibold">{variant.ctr}%</p>
        </div>
        <div>
          <span className="text-muted-foreground">Konv.</span>
          <p className="font-semibold">{variant.conversions}</p>
        </div>
        {variant.extraLabel && (
          <div className="col-span-2">
            <span className="text-muted-foreground">{variant.extraLabel}</span>
            <p className="font-semibold">{variant.extraValue}</p>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Trend</span>
        <Sparkline data={variant.trend} color={sparkColor} />
      </div>
    </div>
  )
}

// Test card component
function TestCard({ test }: { test: ABTest }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChannelIcon channel={test.channel} />
            <h3 className="font-semibold">{test.name}</h3>
          </div>
          <StatusBadge status={test.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4">
          <VariantColumn 
            variant={test.variantA} 
            isWinner={test.winner === 'A'} 
          />
          <VariantColumn 
            variant={test.variantB} 
            isWinner={test.winner === 'B'} 
          />
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        {test.status === 'winner' && test.winner ? (
          <p className="text-sm text-green-700">
            Variant {test.winner} vinner med {test.winMargin}% bättre CTR
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pågår — {test.winMargin}% skillnad, inte signifikant ännu
          </p>
        )}
      </CardFooter>
    </Card>
  )
}

// Test list component
function TestList({ tests }: { tests: ABTest[] }) {
  return (
    <div className="space-y-4 mt-4">
      {tests.map(test => (
        <TestCard key={test.id} test={test} />
      ))}
    </div>
  )
}

// Main page component
export default function ABTestPage() {
  return (
    <div className="p-4 md:p-8 space-y-6 w-full min-w-0 overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-bold">A/B-test</h1>
        <p className="text-muted-foreground mt-1">Jämför varianter för inlägg, artiklar och hemsida.</p>
      </div>
      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">📱 Inlägg</TabsTrigger>
          <TabsTrigger value="articles">📝 Artiklar</TabsTrigger>
          <TabsTrigger value="website">🌐 Hemsida</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          <TestList tests={AB_TESTS.posts} />
        </TabsContent>
        <TabsContent value="articles">
          <TestList tests={AB_TESTS.articles} />
        </TabsContent>
        <TabsContent value="website">
          <TestList tests={AB_TESTS.website} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
