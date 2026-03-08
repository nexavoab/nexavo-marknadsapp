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
import { LogOut, Save, Key, Building2, ShieldCheck } from 'lucide-react'
import type { Organization } from '@/types'

export default function SettingsPage() {
  const { appUser, signOut } = useAuth()
  const [name, setName] = useState(appUser?.name || '')
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingOrg, setSavingOrg] = useState(false)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

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
        setOrgName(data?.name || '')
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

  async function handleSaveOrgName() {
    if (!organization?.id) return

    setSavingOrg(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: orgName, updated_at: new Date().toISOString() })
        .eq('id', organization.id)

      if (error) throw error
      setOrganization({ ...organization, name: orgName })
      toast.success('Organisationsnamn uppdaterat')
    } catch (err) {
      console.error('Failed to save organization name:', err)
      toast.error('Kunde inte spara organisationsnamnet')
    } finally {
      setSavingOrg(false)
    }
  }

  async function handleChangePassword() {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Fyll i alla lösenordsfält')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Nytt lösenord måste vara minst 8 tecken')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Lösenorden matchar inte')
      return
    }

    setChangingPassword(true)
    try {
      // First verify the current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: appUser?.email || '',
        password: currentPassword,
      })

      if (signInError) {
        toast.error('Nuvarande lösenord är felaktigt')
        return
      }

      // Update to new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      // Clear fields on success
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Lösenord uppdaterat')
    } catch (err) {
      console.error('Failed to change password:', err)
      toast.error('Kunde inte ändra lösenordet')
    } finally {
      setChangingPassword(false)
    }
  }

  const roleLabels: Record<string, string> = {
    hq_admin: 'HQ Admin',
    franchisee: 'Franchisetagare',
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Inställningar</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Hantera din profil och kontoinställningar.
        </p>
      </div>

      {/* Profile card */}
      <Card className="p-4 sm:p-6 space-y-6">
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

      {/* Organization card */}
      <Card className="p-4 sm:p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Organisation</h2>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organisationsnamn</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Organisationens namn"
              />
            </div>
          </div>
        </div>

        {/* Save org button */}
        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleSaveOrgName} 
            disabled={savingOrg || orgName === organization?.name}
          >
            {savingOrg ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Spara organisation
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Change Password card */}
      <Card className="p-4 sm:p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Byt lösenord</h2>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Nuvarande lösenord</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ange nuvarande lösenord"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nytt lösenord</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minst 8 tecken"
              />
              {newPassword && newPassword.length < 8 && (
                <p className="text-xs text-destructive">
                  Lösenordet måste vara minst 8 tecken
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Bekräfta nytt lösenord</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Upprepa nytt lösenord"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">
                  Lösenorden matchar inte
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Change password button */}
        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleChangePassword} 
            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword.length < 8 || newPassword !== confirmPassword}
          >
            {changingPassword ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Byt lösenord
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* API Credentials / Vault info card */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">API-credentials & Integrationer</h3>
            <p className="text-sm text-muted-foreground mt-1">
              API-nycklar och integrationscredentials lagras säkert via Supabase Vault med kryptering i vila.
              För att konfigurera integrationer med externa tjänster, kontakta din administratör.
            </p>
            <div className="mt-3 p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">
                <strong>Säkerhet:</strong> Alla känsliga uppgifter krypteras med AES-256 och åtkomst loggas.
                Inga API-nycklar visas i klartext i gränssnittet.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Logout card */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-medium text-foreground">Logga ut</h3>
            <p className="text-sm text-muted-foreground">
              Logga ut från ditt konto på denna enhet.
            </p>
          </div>
          <Button variant="outline" onClick={signOut} className="w-full sm:w-auto">
            <LogOut className="w-4 h-4 mr-2" />
            Logga ut
          </Button>
        </div>
      </Card>
    </div>
  )
}
