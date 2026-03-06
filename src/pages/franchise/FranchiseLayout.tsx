import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogOut, Download, Megaphone, FolderOpen } from 'lucide-react'

function PortalHome() {
  const { appUser } = useAuth()
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Välkommen, {appUser?.name || 'Franchisetagare'}!
        </h1>
        <p className="text-slate-600 mt-2">
          Här hittar du allt marknadsföringsmaterial för ditt område.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Aktiva kampanjer
            </CardTitle>
            <CardDescription>Se pågående kampanjer</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Tillgängligt material
            </CardTitle>
            <CardDescription>Ladda ner material</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Dina nedladdningar
            </CardTitle>
            <CardDescription>Senaste 30 dagarna</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Senaste material</CardTitle>
          <CardDescription>Nytt material tillgängligt för nedladdning</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-100 rounded-lg p-8 text-center text-slate-500">
            <p>Inget material tillgängligt ännu</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <div className="bg-slate-100 rounded-lg p-8 text-center text-slate-500">
        <p>Den här sidan är under utveckling</p>
      </div>
    </div>
  )
}

export default function FranchiseLayout() {
  const { appUser, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Nexavo Portal</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                {appUser?.name || appUser?.email}
              </span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Logga ut
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route index element={<PortalHome />} />
          <Route path="campaigns" element={<PlaceholderPage title="Kampanjer" />} />
          <Route path="assets" element={<PlaceholderPage title="Material" />} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Routes>
      </main>
    </div>
  )
}
