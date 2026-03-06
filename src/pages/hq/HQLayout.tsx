import { useState } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
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
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

export default function HQLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
        <Routes>
          <Route index element={<PlaceholderPage title="Dashboard" />} />
          <Route path="campaigns" element={<PlaceholderPage title="Kampanjer" />} />
          <Route path="brand" element={<PlaceholderPage title="Varumärke" />} />
          <Route path="assets" element={<PlaceholderPage title="Materialbank" />} />
          <Route path="calendar" element={<PlaceholderPage title="Kalender" />} />
          <Route path="franchisees" element={<PlaceholderPage title="Franchisetagare" />} />
          <Route path="settings" element={<PlaceholderPage title="Inställningar" />} />
          <Route path="*" element={<Navigate to="/hq" replace />} />
        </Routes>
      </div>
    </div>
  )
}
