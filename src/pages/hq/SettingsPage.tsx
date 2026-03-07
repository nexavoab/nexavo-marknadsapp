import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { toast } from 'sonner'
import { LogOut, Save } from 'lucide-react'
import type { Organization } from '@/types'

export default function SettingsPage() {
  const { appUser, signOut } = useAuth()
  const [name, setName] = useState(appUser?.name || '')
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchOrganization() {
      if (!appUser?.organization_id) return

      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, slug, logo_url, created_at, updated_at')
          .eq('id', appUser.organization_id)
          .single()

        if (error) throw error
        setOrganization(data)
      } catch (err) {
        console.error('Failed to fetch organization:', err)
        toast.error('Kunde inte hämta organisationsinformation')
      } finally {
        setLoading(false)
      }
    }

    fetchOrganization()
  }, [appUser?.organization_id])

  async function handleSave() {
    if (!appUser?.id) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('app_users')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', appUser.id)

      if (error) throw error
      toast.success('Inställningar sparade')
    } catch (err) {
      console.error('Failed to save settings:', err)
      toast.error('Kunde inte spara inställningarna')
    } finally {
      setSaving(false)
    }
  }

  const roleLabels: Record<string, string> = {
    hq_admin: 'HQ Admin',
    franchisee: 'Franchisetagare',
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inställningar</h1>
        <p className="text-muted-foreground mt-1">
          Hantera din profil och kontoinställningar.
        </p>
      </div>

      {/* Profile card */}
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Profil</h2>
          
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Namn</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ditt namn"
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                value={appUser?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                E-postadressen kan inte ändras.
              </p>
            </div>

            {/* Organization (read-only) */}
            <div className="space-y-2">
              <Label>Organisation</Label>
              <div className="p-3 bg-muted rounded-md text-foreground">
                {organization?.name || 'Okänd'}
              </div>
            </div>

            {/* Role (read-only) */}
            <div className="space-y-2">
              <Label>Roll</Label>
              <div>
                <Badge variant="secondary">
                  {roleLabels[appUser?.role || ''] || appUser?.role}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Spara
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Logout card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-foreground">Logga ut</h3>
            <p className="text-sm text-muted-foreground">
              Logga ut från ditt konto på denna enhet.
            </p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Logga ut
          </Button>
        </div>
      </Card>
    </div>
  )
}
