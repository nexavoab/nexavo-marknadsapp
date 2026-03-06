import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { UserPlus, MapPin, Mail } from 'lucide-react'
import type { Franchisee } from '@/types'

export default function FranchiseesPage() {
  const { appUser } = useAuth()
  const [franchisees, setFranchisees] = useState<Franchisee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFranchisees() {
      if (!appUser?.organization_id) return

      try {
        const { data, error } = await supabase
          .from('franchisees')
          .select('*')
          .eq('organization_id', appUser.organization_id)
          .order('name', { ascending: true })

        if (error) throw error
        setFranchisees(data || [])
      } catch (err) {
        console.error('Failed to fetch franchisees:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFranchisees()
  }, [appUser?.organization_id])

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Franchisetagare</h1>
          <p className="text-gray-500 mt-1">
            Hantera dina franchisetagare och deras åtkomst.
          </p>
        </div>
        <Button disabled>
          <UserPlus className="w-4 h-4 mr-2" />
          Bjud in
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : franchisees.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Inga franchisetagare"
          description="Du har inte lagt till några franchisetagare ännu."
        />
      ) : (
        <Card className="divide-y divide-gray-100">
          {franchisees.map((franchisee) => (
            <div
              key={franchisee.id}
              className="p-4 flex items-center gap-4"
            >
              {/* Avatar placeholder */}
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                <span className="text-slate-600 font-medium">
                  {franchisee.name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">
                  {franchisee.name}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-0.5">
                  {franchisee.region && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {franchisee.region}
                    </span>
                  )}
                  {franchisee.contact_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {franchisee.contact_email}
                    </span>
                  )}
                </div>
              </div>

              {/* Status badge */}
              <Badge variant={franchisee.is_active ? 'default' : 'secondary'}>
                {franchisee.is_active ? 'Aktiv' : 'Inaktiv'}
              </Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
