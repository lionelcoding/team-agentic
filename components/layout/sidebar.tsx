'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Bot,
  Kanban,
  Radio,
  MessageSquare,
  BarChart3,
  Trophy,
  DollarSign,
  Settings,
  Zap,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Target,
  Send,
} from 'lucide-react'

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
  badge?: number
  badgeColor?: 'blue' | 'red'
  children?: { label: string; icon: React.ElementType; href: string }[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Agents', icon: Bot, href: '/agents' },
  { label: 'Pipeline', icon: Kanban, href: '/pipeline' },
  {
    label: 'Signal',
    icon: Radio,
    href: '/signal',
    badge: 3,
    badgeColor: 'blue',
    children: [
      { label: 'Knowledge', icon: BookOpen, href: '/signal/knowledge' },
      { label: 'Strategy', icon: Target, href: '/signal/strategy' },
      { label: 'Outbound', icon: Send, href: '/signal/outbound' },
    ],
  },
  {
    label: 'Handover',
    icon: MessageSquare,
    href: '/handover',
    badge: 2,
    badgeColor: 'red',
  },
  { label: 'Analytics', icon: BarChart3, href: '/analytics' },
  { label: 'Rewards', icon: Trophy, href: '/rewards' },
  { label: 'Coûts', icon: DollarSign, href: '/costs' },
  { label: 'Paramètres', icon: Settings, href: '/settings' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    '/signal': true,
  })

  const toggleSubmenu = (href: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [href]: !prev[href] }))
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-2.5 px-4 py-4 border-b border-slate-800 cursor-pointer select-none min-h-[60px]',
          collapsed && 'justify-center px-0'
        )}
        onClick={onToggle}
        title={collapsed ? 'Développer la sidebar' : 'Réduire la sidebar'}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-slate-50 truncate leading-tight">
              LeadGen B2B
            </span>
            <span className="text-[10px] text-slate-500 leading-tight">AI Dashboard</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item.href)
          const hasChildren = !!item.children
          const isOpen = openSubmenus[item.href]

          return (
            <div key={item.href}>
              {hasChildren ? (
                <button
                  onClick={() => toggleSubmenu(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 group relative',
                    active
                      ? 'bg-blue-600/15 text-blue-400 border-l-2 border-blue-500 pl-[10px]'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-2 border-transparent',
                    collapsed && 'justify-center px-0 border-l-0'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon
                    className={cn(
                      'w-4 h-4 shrink-0',
                      active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                    )}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            'inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full',
                            item.badgeColor === 'red'
                              ? 'bg-red-500 text-white'
                              : 'bg-blue-600 text-white'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-1 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 ml-1 shrink-0" />
                      )}
                    </>
                  )}
                  {collapsed && item.badge && (
                    <span
                      className={cn(
                        'absolute top-1 right-1 inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] font-bold rounded-full',
                        item.badgeColor === 'red'
                          ? 'bg-red-500 text-white'
                          : 'bg-blue-600 text-white'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 group relative',
                    active
                      ? 'bg-blue-600/15 text-blue-400 border-l-2 border-blue-500 pl-[10px]'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-2 border-transparent',
                    collapsed && 'justify-center px-0 border-l-0'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon
                    className={cn(
                      'w-4 h-4 shrink-0',
                      active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                    )}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            'inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full',
                            item.badgeColor === 'red'
                              ? 'bg-red-500 text-white'
                              : 'bg-blue-600 text-white'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && item.badge && (
                    <span
                      className={cn(
                        'absolute top-1 right-1 inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] font-bold rounded-full',
                        item.badgeColor === 'red'
                          ? 'bg-red-500 text-white'
                          : 'bg-blue-600 text-white'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              )}

              {/* Submenu */}
              {hasChildren && isOpen && !collapsed && (
                <div className="mt-0.5 ml-7 space-y-0.5 border-l border-slate-800 pl-3">
                  {item.children!.map((child) => {
                    const childActive = pathname === child.href
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 group',
                          childActive
                            ? 'text-blue-400 bg-blue-600/10'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
                        )}
                      >
                        <child.icon className={cn('w-3.5 h-3.5 shrink-0', childActive ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400')} />
                        <span className="truncate">{child.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className={cn('border-t border-slate-800 p-3', collapsed && 'px-1.5')}>
        {collapsed ? (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-bold text-white">
              JD
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
              JD
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-medium text-slate-300 truncate">Jean Dupont</span>
              <span className="text-[10px] text-slate-600 truncate">LeadGen B2B v1.0</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
