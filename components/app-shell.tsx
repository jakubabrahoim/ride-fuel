'use client'

import { type AppView } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  UtensilsCrossed,
  LayoutDashboard,
  Bike,
  Copy,
} from 'lucide-react'

interface NavItem {
  id: AppView
  label: string
  icon: React.ElementType
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Plans', icon: LayoutDashboard },
  { id: 'planner', label: 'New Ride', icon: Bike },
  { id: 'library', label: 'Food Library', icon: UtensilsCrossed },
  { id: 'templates', label: 'Templates', icon: Copy },
]

interface AppShellProps {
  view: AppView
  onNavigate: (view: AppView) => void
  children: React.ReactNode
}

export function AppShell({ view, onNavigate, children }: AppShellProps) {
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 md:px-6 h-14 border-b border-border bg-surface-1 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-orange flex items-center justify-center">
            <Bike className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-foreground tracking-tight">
            Ride<span className="text-orange">Fuel</span>
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'bg-orange text-white'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden flex items-center justify-around border-t border-border bg-surface-1 h-16 shrink-0"
        aria-label="Mobile navigation"
      >
        {NAV.map((item) => {
          const Icon = item.icon
          const active = view === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors',
                active ? 'text-orange' : 'text-muted-foreground',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
