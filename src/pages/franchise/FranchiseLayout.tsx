import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import FranchisePortalPage from './FranchisePortalPage'
import FranchiseCampaignPage from './FranchiseCampaignPage'
import { LogOut, Megaphone } from 'lucide-react'

export default function FranchiseLayout() {
  const { appUser, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enkel header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {/* Logo placeholder — läses från brand när vi har det */}
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <Megaphone className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900">Materialportal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{appUser?.name ?? appUser?.email}</span>
          <button
            onClick={signOut}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
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
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Routes>
      </main>
    </div>
  )
}
