import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AIProvider } from '@/contexts/AIContext'
import FranchisePortalPage from './FranchisePortalPage'
import FranchiseCampaignPage from './FranchiseCampaignPage'
import FranchiseNotificationsPage from './FranchiseNotificationsPage'
import { LogOut, Megaphone, Bell } from 'lucide-react'
import { fetchUnreadCount } from '@/lib/notifications'

export default function FranchiseLayout() {
  const { appUser, signOut } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchUnreadCount().then(setUnreadCount)
  }, [])

  return (
    <AIProvider>
      <div className="min-h-screen bg-background">
        {/* Enkel header */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Logo placeholder — läses från brand när vi har det */}
            <Link to="/portal" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-foreground">Materialportal</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/portal/notifications"
              className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
              aria-label={`Notifikationer${unreadCount > 0 ? ` (${unreadCount} olästa)` : ''}`}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <span className="text-sm text-muted-foreground">{appUser?.name ?? appUser?.email}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logga ut
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-5xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<FranchisePortalPage />} />
            <Route path="/campaign/:id" element={<FranchiseCampaignPage />} />
            <Route path="/notifications" element={<FranchiseNotificationsPage />} />
            <Route path="*" element={<Navigate to="/portal" replace />} />
          </Routes>
        </main>
      </div>
    </AIProvider>
  )
}
