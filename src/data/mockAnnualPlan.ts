// Mock data for Annual Plan / Årshjul

export type CampaignSlotStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

export interface CampaignSlot {
  id: string
  title: string
  description: string
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  channel: string
  status: CampaignSlotStatus
  franchiseeCount?: number
  budget?: number
  channels?: string[]
}

export const mockCampaignSlots: CampaignSlot[] = [
  {
    id: '1',
    title: 'Vår-kampanj 2026',
    description: 'Lansering av nya vårkollektion med fokus på hållbarhet och lokal produktion.',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    channel: 'Instagram, Facebook',
    status: 'completed',
    franchiseeCount: 24,
    budget: 48000,
    channels: ['Meta', 'Google']
  },
  {
    id: '2',
    title: 'Sommar-rea',
    description: 'Stora rabatter på sommarprodukter. Målet är 30% ökad försäljning.',
    startDate: '2026-06-15',
    endDate: '2026-07-15',
    channel: 'Email, SMS',
    status: 'in_progress',
    franchiseeCount: 18,
    budget: 35000,
    channels: ['Email', 'SMS']
  },
  {
    id: '3',
    title: 'Black Friday',
    description: 'Årets största försäljningsevent. Alla kanaler aktiverade.',
    startDate: '2026-11-20',
    endDate: '2026-11-30',
    channel: 'Alla kanaler',
    status: 'planned',
    franchiseeCount: 32,
    budget: 120000,
    channels: ['Meta', 'Google', 'TikTok', 'Email']
  },
  {
    id: '4',
    title: 'Jul-kampanj',
    description: 'Julklappstips och presentguider för hela familjen.',
    startDate: '2026-12-01',
    endDate: '2026-12-23',
    channel: 'Instagram, TikTok',
    status: 'planned',
    franchiseeCount: 28,
    budget: 65000,
    channels: ['Meta', 'TikTok']
  },
  {
    id: '5',
    title: 'Påsk-special',
    description: 'Påskerbjudanden med fokus på familjeaktiviteter.',
    startDate: '2026-04-10',
    endDate: '2026-04-20',
    channel: 'Email',
    status: 'cancelled',
    franchiseeCount: 12,
    budget: 15000,
    channels: ['Email']
  }
]

export const STATUS_CONFIG: Record<CampaignSlotStatus, { label: string; color: string; bgClass: string; textClass: string }> = {
  planned: {
    label: 'Planerad',
    color: 'blue',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-500'
  },
  in_progress: {
    label: 'Pågår',
    color: 'yellow',
    bgClass: 'bg-yellow-500',
    textClass: 'text-yellow-600'
  },
  completed: {
    label: 'Avslutad',
    color: 'green',
    bgClass: 'bg-green-500',
    textClass: 'text-green-500'
  },
  cancelled: {
    label: 'Avbruten',
    color: 'gray',
    bgClass: 'bg-gray-400',
    textClass: 'text-gray-500'
  }
}

export const MONTHS_SV = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'
]
