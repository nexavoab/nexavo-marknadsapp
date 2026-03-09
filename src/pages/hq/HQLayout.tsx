import { useState, useEffect, useRef } from 'react'
import { Routes, Route, NavLink, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useBrandContext } from '@/contexts/BrandContext'
import { FilterProvider, useFilters, PERIOD_LABELS, type PeriodFilter } from '@/contexts/FilterContext'
import { AIProvider } from '@/contexts/AIContext'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import NotificationBell from '@/components/notifications/NotificationBell'
import AIChatPanel from '@/components/ai/AIChatPanel'
import { toast } from 'sonner'
import {
  LayoutDashboard,
  Megaphone,
  Palette,
  Calendar,
  CalendarRange,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ArrowRight,
  Search,
  ShieldCheck,
  Plug,
  Download,
  MapPin,
  ChevronDown,
  ChevronRight,
  FileDown,
  FlaskConical,
  PenTool,
  Send,
  BarChart3,
  Eye
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

// Integrations
import IntegrationsPage from './IntegrationsPage'

// Internal test pages (no nav links)
import AIPipelineTestPage from './AIPipelineTestPage'

// A/B Test page
import ABTestPage from './ABTestPage'

// Competitor Intelligence
import CompetitorIntelligencePage from './CompetitorIntelligencePage'

// 404 page
import NotFoundPage from '../NotFoundPage'

// Navigation sections with intention-based grouping
type NavItem = { to: string; icon: React.ComponentType<{ className?: string }>; label: string; end?: boolean }

interface NavSectionConfig {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  defaultOpen: boolean
  items: NavItem[]
}

const navSections: NavSectionConfig[] = [
  {
    id: 'planera',
    icon: Calendar,
    label: 'PLANERA',
    defaultOpen: true,
    items: [
      { to: '/hq/calendar', icon: Calendar, label: 'Kalender' },
      { to: '/hq/campaigns', icon: Megaphone, label: 'Kampanjer' },
      { to: '/hq/annual-plan', icon: CalendarRange, label: 'Årshjul' },
    ]
  },
  {
    id: 'skapa',
    icon: PenTool,
    label: 'SKAPA',
    defaultOpen: true,
    items: [
      { to: '/hq/ab-test', icon: FlaskConical, label: 'AI Copy' },
      { to: '/hq/brand', icon: Palette, label: 'Material' },
    ]
  },
  {
    id: 'distribuera',
    icon: Send,
    label: 'DISTRIBUERA',
    defaultOpen: false,
    items: [
      { to: '/hq/compliance', icon: ShieldCheck, label: 'Kampanjräckvidd' },
      { to: '/hq/integrations', icon: Plug, label: 'Integrationer' },
    ]
  },
  {
    id: 'analysera',
    icon: BarChart3,
    label: 'ANALYSERA',
    defaultOpen: false,
    items: [
      { to: '/hq', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { to: '/hq/franchisees', icon: Users, label: 'Franchisetagare' },
      { to: '/hq/competitor-intelligence', icon: Eye, label: 'Konkurrentanalys' },
    ]
  },
]

// Standalone items outside sections
const standaloneNavItems: NavItem[] = [
  { to: '/hq/settings', icon: Settings, label: 'Inställningar' },
]

// NavSection component with expand/collapse
function NavSection({ 
  section, 
  collapsed, 
  onClose,
  isOpen,
  onToggle
}: { 
  section: NavSectionConfig
  collapsed: boolean
  onClose?: () => void
  isOpen: boolean
  onToggle: () => void
}) {
  const location = useLocation()
  
  // Check if any item in this section is active
  const hasActiveItem = section.items.some(item => {
    if (item.end) {
      return location.pathname === item.to
    }
    return location.pathname.startsWith(item.to)
  })

  if (collapsed) {
    // In collapsed mode, show only icons for items
    return (
      <div className="mb-1">
        {section.items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            title={item.label}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-center rounded-lg p-2 mx-auto w-10 h-10 transition-colors',
                isActive
                  ? 'bg-primary/20 text-primary font-medium'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )
            }
          >
            <item.icon className="h-5 w-5" />
          </NavLink>
        ))}
      </div>
    )
  }

  return (
    <div className="mb-1">
      {/* Section header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors',
          hasActiveItem ? 'text-primary' : 'text-slate-500 hover:text-slate-300'
        )}
      >
        <section.icon className="h-4 w-4" />
        <span className="flex-1 text-left">{section.label}</span>
        <ChevronRight 
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen && 'rotate-90'
          )} 
        />
      </button>
      
      {/* Section items */}
      <div className={cn('overflow-hidden transition-all duration-200', !isOpen && 'hidden')}>
        {section.items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 pl-9 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

function Sidebar({ onClose, collapsed = false }: { onClose?: () => void; collapsed?: boolean }) {
  const { appUser, signOut } = useAuth()
  
  // Section open state - initialize from defaultOpen values
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    navSections.forEach(section => {
      initial[section.id] = section.defaultOpen
    })
    return initial
  })

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  return (
    <aside className="flex flex-col h-full bg-slate-900 text-white">
      <div className={cn('p-4', collapsed && 'px-2 py-4')}>
        {collapsed ? (
          <Link to="/hq" className="block w-10 h-10 bg-primary rounded-lg flex items-center justify-center mx-auto hover:opacity-90 transition-opacity">
            <span className="text-primary-foreground font-bold text-lg">N</span>
          </Link>
        ) : (
          <Link to="/hq" className="block hover:opacity-80 transition-opacity">
            <h1 className="text-xl font-bold">Nexavo</h1>
            <p className="text-sm text-slate-400">Marknadsapp</p>
          </Link>
        )}
      </div>
      <Separator className="bg-slate-700" />
      
      <nav className={cn('flex-1 overflow-y-auto', collapsed ? 'p-1' : 'p-2')}>
        {/* Intention-based sections */}
        {navSections.map((section) => (
          <NavSection
            key={section.id}
            section={section}
            collapsed={collapsed}
            onClose={onClose}
            isOpen={openSections[section.id] ?? section.defaultOpen}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
        
        {/* Separator before standalone items */}
        {!collapsed && <Separator className="bg-slate-700 my-2" />}
        
        {/* Standalone items (Settings) */}
        {standaloneNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-lg text-sm transition-colors',
                collapsed ? 'justify-center p-2 mx-auto w-10 h-10' : 'gap-3 px-3 py-2',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )
            }
          >
            <item.icon className={cn('h-5 w-5', collapsed && 'h-5 w-5')} />
            {!collapsed && item.label}
          </NavLink>
        ))}
      </nav>
      
      <Separator className="bg-slate-700" />
      <div className={cn('p-4', collapsed && 'p-2')}>
        {!collapsed && (
          <div className="text-sm text-slate-400 mb-2">
            Inloggad som<br />
            <span className="text-white">{appUser?.name || appUser?.email}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'text-slate-400 hover:text-white hover:bg-slate-800',
            collapsed ? 'w-10 h-10 p-0 mx-auto' : 'w-full justify-start'
          )}
          onClick={signOut}
          title={collapsed ? 'Logga ut' : undefined}
        >
          <LogOut className={cn('h-4 w-4', !collapsed && 'mr-2')} />
          {!collapsed && 'Logga ut'}
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

// Mock regions - fallback when Supabase not available
const MOCK_REGIONS = ['Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Örebro']

function TopbarFilters() {
  const { period, region, setPeriod, setRegion, periodLabel, regionLabel } = useFilters()
  const [periodOpen, setPeriodOpen] = useState(false)
  const [regionOpen, setRegionOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  
  const periodRef = useRef<HTMLDivElement>(null)
  const regionRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)
  const commandRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) setPeriodOpen(false)
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) setRegionOpen(false)
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
      if (commandRef.current && !commandRef.current.contains(e.target as Node)) setCommandOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard shortcut for command palette (Ctrl+K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
      if (e.key === 'Escape') {
        setCommandOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Command palette navigation items
  const commandItems = [
    { label: 'Dashboard', path: '/hq', icon: LayoutDashboard },
    { label: 'Kampanjer', path: '/hq/campaigns', icon: Megaphone },
    { label: 'Ny kampanj', path: '/hq/campaigns/new', icon: Megaphone },
    { label: 'Franchisetagare', path: '/hq/franchisees', icon: Users },
    { label: 'Kalender', path: '/hq/calendar', icon: Calendar },
    { label: 'Årshjul', path: '/hq/annual-plan', icon: CalendarRange },
    { label: 'Varumärke', path: '/hq/brand', icon: Palette },
    { label: 'Inställningar', path: '/hq/settings', icon: Settings },
  ]

  const filteredCommands = searchQuery
    ? commandItems.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : commandItems

  const handleExport = (type: 'campaigns' | 'franchisees') => {
    // Placeholder - in real app would trigger CSV download
    toast.success(`Exporterar ${type === 'campaigns' ? 'kampanjer' : 'franchisetagare'} som CSV...`)
    setExportOpen(false)
  }

  const handleCommandSelect = (path: string) => {
    navigate(path)
    setCommandOpen(false)
    setSearchQuery('')
  }

  return (
    <>
      {/* Period Filter - hidden on smallest screens */}
      <div ref={periodRef} className="relative hidden sm:block">
        <button
          onClick={() => setPeriodOpen(!periodOpen)}
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-muted/50 hover:bg-muted rounded-lg border border-border transition-colors"
        >
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="hidden md:inline">{periodLabel}</span>
          <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', periodOpen && 'rotate-180')} />
        </button>
        {periodOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
            {(Object.entries(PERIOD_LABELS) as [PeriodFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setPeriod(key); setPeriodOpen(false) }}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors',
                  period === key && 'bg-muted font-medium'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Region Filter - hidden on smallest screens */}
      <div ref={regionRef} className="relative hidden md:block">
        <button
          onClick={() => setRegionOpen(!regionOpen)}
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-muted/50 hover:bg-muted rounded-lg border border-border transition-colors"
        >
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="hidden lg:inline">{regionLabel}</span>
          <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', regionOpen && 'rotate-180')} />
        </button>
        {regionOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
            <button
              onClick={() => { setRegion('all'); setRegionOpen(false) }}
              className={cn(
                'w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors',
                region === 'all' && 'bg-muted font-medium'
              )}
            >
              Alla regioner
            </button>
            {MOCK_REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => { setRegion(r); setRegionOpen(false) }}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors',
                  region === r && 'bg-muted font-medium'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Command Palette Trigger - responsive search */}
      <div ref={commandRef} className="relative flex-1 min-w-0 max-w-xl">
        <button
          onClick={() => setCommandOpen(true)}
          className="w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 text-sm text-muted-foreground bg-muted/30 hover:bg-muted/50 rounded-lg sm:rounded-xl border border-border/50 transition-colors"
        >
          <Search className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left truncate text-xs sm:text-sm">Sök...</span>
          <kbd className="hidden sm:inline text-xs bg-background/80 px-2 py-0.5 rounded-md border border-border">⌘K</kbd>
        </button>
        
        {/* Command Palette Modal */}
        {commandOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setCommandOpen(false)} />
            <div className="fixed left-1/2 top-1/4 -translate-x-1/2 w-full max-w-lg bg-popover border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search className="h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Sök sidor, kampanjer, franchisetagare..."
                  className="flex-1 bg-transparent outline-none text-sm"
                  autoFocus
                />
                <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">ESC</kbd>
              </div>
              <div className="max-h-80 overflow-y-auto py-2">
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Navigera</div>
                {filteredCommands.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleCommandSelect(item.path)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </button>
                ))}
                {filteredCommands.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Inga resultat för "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Export Button */}
      <div ref={exportRef} className="relative">
        <button
          onClick={() => setExportOpen(!exportOpen)}
          className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors"
          title="Exportera"
        >
          <FileDown className="h-4 w-4 text-muted-foreground" />
        </button>
        {exportOpen && (
          <div className="absolute top-full right-0 mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
            <button
              onClick={() => handleExport('campaigns')}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Download className="h-4 w-4 text-muted-foreground" />
              Exportera kampanjer (CSV)
            </button>
            <button
              onClick={() => handleExport('franchisees')}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Download className="h-4 w-4 text-muted-foreground" />
              Exportera franchisetagare (CSV)
            </button>
          </div>
        )}
      </div>
    </>
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

function HQLayoutInner() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
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
      <div
        className={cn(
          'hidden lg:block fixed inset-y-0 left-0 transition-all duration-200',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      {/* Main content */}
      <div className={cn(
        'flex flex-col min-h-screen transition-all duration-200 overflow-x-hidden w-full max-w-full',
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      )}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-1 sm:gap-2 md:gap-3 border-b border-border bg-card px-2 md:px-4 lg:px-6 min-w-0 max-w-full overflow-hidden">
          {/* Collapse sidebar button (desktop only) */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors"
            title={sidebarCollapsed ? 'Expandera meny' : 'Minimera meny'}
          >
            <Menu className="h-4 w-4 text-muted-foreground" />
          </button>
          
          <TopbarFilters />
          <div className="flex items-center gap-1">
            <NotificationBell />
            <NavLink
              to="/hq/settings"
              className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors"
              title="Inställningar"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
            </NavLink>
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity ml-1">
              {appUser?.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1">
          <Routes>
            <Route index element={showOnboarding ? <OnboardingPrompt /> : <DashboardPage />} />
            {/* Campaign routes */}
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="campaigns/new" element={<CampaignNewPage />} />
            <Route path="campaigns/:id" element={<CampaignDetailPage />} />
            {/* A/B Test route */}
            <Route path="ab-test" element={<ABTestPage />} />
            {/* Brand routes */}
            <Route path="brand" element={<BrandOverviewPage />} />
            <Route path="brand/setup" element={<BrandSetupPage />} />
            {/* Other pages */}
            <Route path="assets" element={<PlaceholderPage title="Materialbank" />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="annual-plan" element={<AnnualPlanPage />} />
            <Route path="franchisees" element={<FranchiseesPage />} />
            <Route path="compliance" element={<CompliancePage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="competitor-intelligence" element={<CompetitorIntelligencePage />} />
            <Route path="settings" element={<SettingsPage />} />
            {/* Internal test pages - no nav links */}
            <Route path="ai-test" element={<AIPipelineTestPage />} />
            {/* 404 catch-all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>

      {/* AI Chat Panel - floating FAB + slide-in panel */}
      <AIChatPanel />
    </div>
  )
}

export default function HQLayout() {
  return (
    <FilterProvider>
      <AIProvider>
        <HQLayoutInner />
      </AIProvider>
    </FilterProvider>
  )
}
