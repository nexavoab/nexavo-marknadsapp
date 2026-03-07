/**
 * Mock data för compliance-rapport
 * WAS-378: Franchisee-aktivering per kampanj
 */

export type ComplianceStatus = 'activated' | 'pending' | 'skipped'

export interface ComplianceCampaign {
  id: string
  name: string
  period: string
  total: number
}

export interface ComplianceFranchisee {
  id: string
  name: string
  campaignStatus: Record<string, ComplianceStatus>
  activatedAt: Record<string, string>
}

export interface ComplianceData {
  campaigns: ComplianceCampaign[]
  franchisees: ComplianceFranchisee[]
}

export const mockComplianceData: ComplianceData = {
  campaigns: [
    { id: 'c1', name: 'Vår-kampanj 2026', period: 'Mars 2026', total: 24 },
    { id: 'c2', name: 'Påsk-special', period: 'April 2026', total: 24 },
    { id: 'c3', name: 'Sommar-erbjudande', period: 'Juni 2026', total: 24 },
  ],
  franchisees: [
    {
      id: 'f1',
      name: 'Stockholm City',
      campaignStatus: { c1: 'activated', c2: 'pending', c3: 'pending' },
      activatedAt: { c1: '2026-03-05' },
    },
    {
      id: 'f2',
      name: 'Göteborg Centrum',
      campaignStatus: { c1: 'activated', c2: 'activated', c3: 'pending' },
      activatedAt: { c1: '2026-03-03', c2: '2026-03-28' },
    },
    {
      id: 'f3',
      name: 'Malmö Söder',
      campaignStatus: { c1: 'skipped', c2: 'pending', c3: 'pending' },
      activatedAt: {},
    },
    {
      id: 'f4',
      name: 'Uppsala Norra',
      campaignStatus: { c1: 'activated', c2: 'activated', c3: 'activated' },
      activatedAt: { c1: '2026-03-01', c2: '2026-03-25', c3: '2026-05-15' },
    },
    {
      id: 'f5',
      name: 'Lund Centrum',
      campaignStatus: { c1: 'activated', c2: 'skipped', c3: 'pending' },
      activatedAt: { c1: '2026-03-10' },
    },
    {
      id: 'f6',
      name: 'Örebro City',
      campaignStatus: { c1: 'skipped', c2: 'skipped', c3: 'pending' },
      activatedAt: {},
    },
    {
      id: 'f7',
      name: 'Linköping Väst',
      campaignStatus: { c1: 'activated', c2: 'pending', c3: 'pending' },
      activatedAt: { c1: '2026-03-08' },
    },
  ],
}
