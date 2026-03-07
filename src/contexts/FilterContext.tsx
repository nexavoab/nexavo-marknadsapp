/**
 * FilterContext - Global filters for period and region
 * WAS-389: Topbar filters that affect dashboard data
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type PeriodFilter = 'month' | 'quarter' | '6months' | 'year'
export type RegionFilter = string // 'all' or region name

interface FilterContextValue {
  period: PeriodFilter
  region: RegionFilter
  setPeriod: (period: PeriodFilter) => void
  setRegion: (region: RegionFilter) => void
  periodLabel: string
  regionLabel: string
}

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  month: 'Denna månad',
  quarter: 'Kvartal',
  '6months': 'Senaste 6 månader',
  year: 'År',
}

const FilterContext = createContext<FilterContextValue | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [period, setPeriodState] = useState<PeriodFilter>('month')
  const [region, setRegionState] = useState<RegionFilter>('all')

  const setPeriod = useCallback((p: PeriodFilter) => setPeriodState(p), [])
  const setRegion = useCallback((r: RegionFilter) => setRegionState(r), [])

  const periodLabel = PERIOD_LABELS[period]
  const regionLabel = region === 'all' ? 'Alla regioner' : region

  return (
    <FilterContext.Provider
      value={{
        period,
        region,
        setPeriod,
        setRegion,
        periodLabel,
        regionLabel,
      }}
    >
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  const context = useContext(FilterContext)
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider')
  }
  return context
}

export { PERIOD_LABELS }
