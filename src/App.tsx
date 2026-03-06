import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { BrandProvider } from '@/contexts/BrandContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from '@/components/ui/sonner'

// Lazy load main layouts
const HQLayout = lazy(() => import('@/pages/hq/HQLayout'))
const FranchiseLayout = lazy(() => import('@/pages/franchise/FranchiseLayout'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))

function LoadingFallback() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
    </div>
  )
}

function AppRouter() {
  const { user, appUser, loading, isHQ, isFranchisee } = useAuth()

  if (loading) {
    return <LoadingFallback />
  }

  if (!user || !appUser) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    )
  }

  if (isHQ) {
    return (
      <BrandProvider>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/hq/*" element={<HQLayout />} />
            <Route path="*" element={<Navigate to="/hq" replace />} />
          </Routes>
        </Suspense>
      </BrandProvider>
    )
  }

  if (isFranchisee) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/portal/*" element={<FranchiseLayout />} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Routes>
      </Suspense>
    )
  }

  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster position="bottom-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
