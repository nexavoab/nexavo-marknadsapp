import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { BrandProvider } from '@/contexts/BrandContext'

import LoginPage from '@/pages/LoginPage'
import HQLayout from '@/pages/hq/HQLayout'
import FranchiseLayout from '@/pages/franchise/FranchiseLayout'

function AppRouter() {
  const { user, appUser, loading, isHQ, isFranchisee } = useAuth()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    )
  }

  if (!user || !appUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (isHQ) {
    return (
      <BrandProvider>
        <Routes>
          <Route path="/hq/*" element={<HQLayout />} />
          <Route path="*" element={<Navigate to="/hq" replace />} />
        </Routes>
      </BrandProvider>
    )
  }

  if (isFranchisee) {
    return (
      <Routes>
        <Route path="/portal/*" element={<FranchiseLayout />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    )
  }

  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AuthProvider>
  )
}
