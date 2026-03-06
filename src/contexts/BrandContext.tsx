import { createContext, useContext, type ReactNode } from 'react'
import type { Brand } from '@/types'
import { useBrand } from '@/hooks/useBrand'

interface BrandContextType {
  brand: Brand | null
  loading: boolean
  error: string | null
  saveBrand: (updates: Partial<Brand>) => Promise<Brand | undefined>
  refetch: () => Promise<void>
  hasBrand: boolean
}

const BrandContext = createContext<BrandContextType | undefined>(undefined)

export function BrandProvider({ children }: { children: ReactNode }) {
  const { brand, loading, error, saveBrand, refetch } = useBrand()

  return (
    <BrandContext.Provider
      value={{
        brand,
        loading,
        error,
        saveBrand,
        refetch,
        hasBrand: !!brand,
      }}
    >
      {children}
    </BrandContext.Provider>
  )
}

export function useBrandContext() {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error('useBrandContext must be used within BrandProvider')
  return ctx
}
