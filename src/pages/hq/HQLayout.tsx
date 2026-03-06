import { useState } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useBrandContext } from '@/contexts/BrandContext'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  Megaphone,
  Palette,
  FolderOpen,
  Calendar,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Brand pages
import BrandOverviewPage from './brand/BrandOverviewPage'
import BrandSetupPage from './brand/BrandSetupPage'

// Campaign pages
import CampaignsPage from './campaigns/CampaignsPage'
import CampaignNewPage from './campaigns/CampaignNewPage'
import CampaignDetailPage from './campaigns/CampaignDetailPage'

// Dashboard and other pages
import DashboardPage from './DashboardPage'
import FranchiseesPage from './FranchiseesPage'
import CalendarPage from './CalendarPage'
import SettingsPage from './SettingsPage'

// Internal test pages (no nav links)
import AIPipelineTestPage from './AIPipelineTestPage'

const navItems = [
  { to: '/hq', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/hq/campaigns', icon: Megaphone, label: 'Kampanjer' },
  { to: '/hq/brand', icon: Palette, label: 'Varumärke' },
  { to: '/hq/assets', icon: FolderOpen, label: 'Materialbank' },
  { to: '/hq/calendar', icon: Calendar, label: 'Kalender' },
  { to: '/hq/franchisees', icon: Users, label: 'Franchisetagare' },
  { to: '/hq/settings', icon: Settings, label: 'Inställningar' },
]

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { appUser, signOut } = useAuth()

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      <div className="p-4">
        <h1 className="text-xl font-bold">Nexavo</h1>
        <p className="text-sm text-slate-400">Marknadsapp</p>
      </div>
      <Separator className="bg-slate-700" />
      <nav className="flex-1 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Separator className="bg-slate-700" />
      <div className="p-4">
        <div className="text-sm text-slate-400 mb-2">
          Inloggad som<br />
          <span className="text-white">{appUser?.name || appUser?.email}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logga ut
        </Button>
      </div>
    </div>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <div className="bg-slate-100 rounded-lg p-8 text-center text-slate-500">
        <p>Den här sidan är under utveckling</p>
      </div>
    </div>
  )
}

function OnboardingPrompt() {
  return (
    <div className="p-8">
      <div className="max-w-xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Palette className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold mb-3">Välkommen!</h1>
        <p className="text-slate-600 mb-6">
          Börja med att sätta upp ert varumärke. Detta är grunden för all AI-generering och säkerställer att allt material matchar er profil.
        </p>
        <NavLink to="/hq/brand/setup">
          <Button size="lg">
            Sätt upp varumärke
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </NavLink>
      </div>
    </div>
  )
}

export default function HQLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { hasBrand, loading: brandLoading } = useBrandContext()
  const location = useLocation()

  // Check if we're on brand setup page
  const isOnBrandSetup = location.pathname === '/hq/brand/setup'

  // Redirect to onboarding if no brand and not already on setup
  const showOnboarding = !brandLoading && !hasBrand && !isOnBrandSetup

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - mobile */}
      <div
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-200',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar onClose={() => setMobileMenuOpen(false)} />
      </div>

      {/* Sidebar - desktop */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {showOnboarding ? (
          <OnboardingPrompt />
        ) : (
          <Routes>
            <Route index element={<DashboardPage />} />
            {/* Campaign routes */}
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="campaigns/new" element={<CampaignNewPage />} />
            <Route path="campaigns/:id" element={<CampaignDetailPage />} />
            {/* Brand routes */}
            <Route path="brand" element={<BrandOverviewPage />} />
            <Route path="brand/setup" element={<BrandSetupPage />} />
            {/* Other pages */}
            <Route path="assets" element={<PlaceholderPage title="Materialbank" />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="franchisees" element={<FranchiseesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            {/* Internal test pages - no nav links */}
            <Route path="ai-test" element={<AIPipelineTestPage />} />
            <Route path="*" element={<Navigate to="/hq" replace />} />
          </Routes>
        )}
      </div>
    </div>
  )
}
