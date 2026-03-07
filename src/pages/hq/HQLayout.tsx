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
  CalendarRange,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ArrowRight,
  Search,
  Bell,
  ShieldCheck
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

// Annual plan
import AnnualPlanPage from './annual-plan/AnnualPlanPage'

// Compliance
import CompliancePage from './CompliancePage'

// Internal test pages (no nav links)
import AIPipelineTestPage from './AIPipelineTestPage'

const navItems = [
  { to: '/hq', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/hq/campaigns', icon: Megaphone, label: 'Kampanjer' },
  { to: '/hq/brand', icon: Palette, label: 'Varumärke' },
  { to: '/hq/assets', icon: FolderOpen, label: 'Materialbank', disabled: true, badge: 'Snart' },
  { to: '/hq/calendar', icon: Calendar, label: 'Kalender' },
  { to: '/hq/annual-plan', icon: CalendarRange, label: 'Årshjul' },
  { to: '/hq/franchisees', icon: Users, label: 'Franchisetagare' },
  { to: '/hq/compliance', icon: ShieldCheck, label: 'Compliance' },
  { to: '/hq/settings', icon: Settings, label: 'Inställningar' },
]

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { appUser, signOut } = useAuth()

  return (
    <aside className="flex flex-col h-full bg-slate-900 text-white">
      <div className="p-4">
        <h1 className="text-xl font-bold">Nexavo</h1>
        <p className="text-sm text-slate-400">Marknadsapp</p>
      </div>
      <Separator className="bg-slate-700" />
      <nav className="flex-1 p-2">
        {navItems.map((item) => (
          item.disabled ? (
            <div
              key={item.to}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-500 opacity-50 pointer-events-none"
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              {item.badge && (
                <span className="ml-auto text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                  {item.badge}
                </span>
              )}
            </div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          )
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
    </aside>
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
  const { appUser } = useAuth()
  const { hasBrand, loading: brandLoading } = useBrandContext()
  const location = useLocation()

  // Check if we're on brand setup page
  const isOnBrandSetup = location.pathname === '/hq/brand/setup'

  // Redirect to onboarding if no brand and not already on setup
  const showOnboarding = !brandLoading && !hasBrand && !isOnBrandSetup

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-sm font-medium"
      >
        Hoppa till huvudinnehåll
      </a>

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
      <div className="lg:ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card px-6">
          <div className="flex-1">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Sök..."
                className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-lg p-2 hover:bg-accent text-muted-foreground">
              <Bell className="h-5 w-5" />
            </button>
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
              {appUser?.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1">
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
            <Route path="annual-plan" element={<AnnualPlanPage />} />
            <Route path="franchisees" element={<FranchiseesPage />} />
            <Route path="compliance" element={<CompliancePage />} />
            <Route path="settings" element={<SettingsPage />} />
            {/* Internal test pages - no nav links */}
            <Route path="ai-test" element={<AIPipelineTestPage />} />
            <Route path="*" element={<Navigate to="/hq" replace />} />
          </Routes>
        )}
        </main>
      </div>
    </div>
  )
}
