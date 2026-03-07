/**
 * Franchisees List Page
 * WAS-390: State layers, hover-states, kebab-meny
 */

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  UserPlus,
  MapPin,
  Mail,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  AlertCircle,
  Users,
  Search,
} from 'lucide-react'
import type { Franchisee } from '@/types'

// Skeleton for loading state
function FranchiseeRowSkeleton() {
  return (
    <div className="p-4 flex items-center gap-4 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-3 w-48 bg-muted/70 rounded" />
      </div>
      <div className="h-6 w-16 bg-muted rounded-full" />
    </div>
  )
}

// Kebab menu for franchisee actions
function FranchiseeMenu({
  onEdit,
  onDuplicate,
  onDelete,
}: {
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const handleAction = (action: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(false)
    action()
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
        className={cn(
          'p-1.5 rounded-md transition-colors',
          'hover:bg-muted',
          open && 'bg-muted'
        )}
        aria-label="Åtgärder"
      >
        <MoreVertical className="w-4 h-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
          <button
            onClick={handleAction(onEdit)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
          >
            <Pencil className="w-4 h-4 text-muted-foreground" />
            Redigera
          </button>
          <button
            onClick={handleAction(onDuplicate)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
          >
            <Copy className="w-4 h-4 text-muted-foreground" />
            Duplicera
          </button>
          <button
            onClick={handleAction(onDelete)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors text-red-600"
          >
            <Trash2 className="w-4 h-4" />
            Ta bort
          </button>
        </div>
      )}
    </div>
  )
}

export default function FranchiseesPage() {
  const { appUser } = useAuth()
  const [franchisees, setFranchisees] = useState<Franchisee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    async function fetchFranchisees() {
      if (!appUser?.organization_id) return

      try {
        setError(null)
        const { data, error: fetchError } = await supabase
          .from('franchisees')
          .select('id, name, region, contact_email, is_active, organization_id, created_at, updated_at')
          .eq('organization_id', appUser.organization_id)
          .order('name', { ascending: true })

        if (fetchError) throw fetchError
        setFranchisees(data || [])
      } catch (err) {
        console.error('Failed to fetch franchisees:', err)
        setError('Kunde inte hämta franchisetagare. Försök igen.')
        toast.error('Kunde inte hämta franchisetagare')
      } finally {
        setLoading(false)
      }
    }

    fetchFranchisees()
  }, [appUser?.organization_id])

  // Filter franchisees
  const filteredFranchisees = franchisees.filter((f) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = f.name?.toLowerCase().includes(query)
      const matchesRegion = f.region?.toLowerCase().includes(query)
      const matchesEmail = f.contact_email?.toLowerCase().includes(query)
      if (!matchesName && !matchesRegion && !matchesEmail) return false
    }
    // Status filter
    if (filterActive === 'active' && !f.is_active) return false
    if (filterActive === 'inactive' && f.is_active) return false
    return true
  })

  const hasActiveFilters = searchQuery || filterActive !== 'all'

  // Handlers
  const handleEdit = (franchisee: Franchisee) => {
    toast.info(`Redigera ${franchisee.name} - kommer snart`)
  }

  const handleDuplicate = (franchisee: Franchisee) => {
    toast.success(`${franchisee.name} duplicerad`)
  }

  const handleDelete = (franchisee: Franchisee) => {
    if (confirm(`Är du säker på att du vill ta bort ${franchisee.name}?`)) {
      toast.success(`${franchisee.name} borttagen`)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Franchisetagare</h1>
          <p className="text-muted-foreground mt-1">
            Hantera dina franchisetagare och deras åtkomst.
          </p>
        </div>
        <Button disabled>
          <UserPlus className="w-4 h-4 mr-2" />
          Bjud in
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Sök franchisetagare..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
          {(['all', 'active', 'inactive'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterActive(status)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
                filterActive === status
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {status === 'all' ? 'Alla' : status === 'active' ? 'Aktiva' : 'Inaktiva'}
              {hasActiveFilters && filterActive === status && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs bg-primary text-primary-foreground rounded-full">
                  {filteredFranchisees.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {!loading && franchisees.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Visar {filteredFranchisees.length} av {franchisees.length} franchisetagare
        </p>
      )}

      {/* Content */}
      {loading ? (
        // Skeleton loading state
        <Card className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <FranchiseeRowSkeleton key={i} />
          ))}
        </Card>
      ) : error ? (
        // Error state
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-destructive">Något gick fel</h3>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Försök igen
          </Button>
        </div>
      ) : franchisees.length === 0 ? (
        // Empty state (no franchisees at all)
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Inga franchisetagare ännu</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Lägg till dina franchisetagare för att kunna distribuera kampanjer
            och följa upp aktiveringar.
          </p>
          <Button size="lg" disabled>
            <UserPlus className="w-5 h-5 mr-2" />
            Bjud in din första franchisetagare
          </Button>
        </div>
      ) : filteredFranchisees.length === 0 ? (
        // No results from filter
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Inga träffar</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Inga franchisetagare matchar din sökning
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('')
              setFilterActive('all')
            }}
          >
            Rensa filter
          </Button>
        </div>
      ) : (
        // Franchisee list
        <Card className="divide-y divide-border overflow-hidden">
          {filteredFranchisees.map((franchisee) => (
            <div
              key={franchisee.id}
              className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors cursor-pointer group"
              onClick={() => handleEdit(franchisee)}
            >
              {/* Avatar placeholder */}
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <span className="text-primary font-medium">
                  {franchisee.name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {franchisee.name}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5">
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
              <Badge
                variant={franchisee.is_active ? 'default' : 'secondary'}
                className={cn(
                  franchisee.is_active
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : ''
                )}
              >
                {franchisee.is_active ? 'Aktiv' : 'Inaktiv'}
              </Badge>

              {/* Kebab menu */}
              <FranchiseeMenu
                onEdit={() => handleEdit(franchisee)}
                onDuplicate={() => handleDuplicate(franchisee)}
                onDelete={() => handleDelete(franchisee)}
              />
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
