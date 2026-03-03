'use client'

import { usePathname } from 'next/navigation'
import { Bell, Search, Menu, ChevronRight, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface Crumb {
  label: string
  href: string
}

const routeMap: Record<string, Crumb[]> = {
  '/dashboard': [{ label: 'Dashboard', href: '/dashboard' }],
  '/agents': [{ label: 'Agents IA', href: '/agents' }],
  '/pipeline': [{ label: 'Pipeline', href: '/pipeline' }],
  '/signal': [{ label: 'Signal', href: '/signal' }],
  '/signal/knowledge': [
    { label: 'Signal', href: '/signal' },
    { label: 'Knowledge', href: '/signal/knowledge' },
  ],
  '/signal/strategy': [
    { label: 'Signal', href: '/signal' },
    { label: 'Strategy', href: '/signal/strategy' },
  ],
  '/signal/outbound': [
    { label: 'Signal', href: '/signal' },
    { label: 'Outbound', href: '/signal/outbound' },
  ],
  '/handover': [{ label: 'Handover', href: '/handover' }],
  '/analytics': [{ label: 'Analytics', href: '/analytics' }],
  '/rewards': [{ label: 'Rewards', href: '/rewards' }],
  '/costs': [{ label: 'Coûts', href: '/costs' }],
  '/settings': [{ label: 'Paramètres', href: '/settings' }],
}

interface HeaderProps {
  onMenuClick: () => void
  collapsed: boolean
}

export function Header({ onMenuClick, collapsed }: HeaderProps) {
  const pathname = usePathname()
  const crumbs = routeMap[pathname] || [{ label: 'Dashboard', href: '/dashboard' }]

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 flex items-center gap-4 h-[60px] bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 px-4 transition-all duration-300',
        collapsed ? 'left-16' : 'left-60'
      )}
    >
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden text-slate-400 hover:text-slate-200 hover:bg-slate-800 w-8 h-8"
        onClick={onMenuClick}
      >
        <Menu className="w-4 h-4" />
        <span className="sr-only">Menu</span>
      </Button>

      {/* Breadcrumb */}
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 flex-1 min-w-0">
        <span className="text-xs text-slate-600 hidden sm:block">LeadGen B2B</span>
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3 text-slate-700 hidden sm:block" />
            <span
              className={cn(
                'text-xs font-medium truncate',
                i === crumbs.length - 1
                  ? 'text-slate-200'
                  : 'text-slate-500 hover:text-slate-300 cursor-pointer'
              )}
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      {/* Search */}
      <div className="relative hidden sm:block w-48 lg:w-64">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
        <Input
          type="search"
          placeholder="Rechercher..."
          className="h-8 pl-8 text-xs bg-slate-900 border-slate-700 text-slate-300 placeholder:text-slate-600 focus:border-blue-600/60 focus:ring-blue-600/20"
        />
      </div>

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative text-slate-400 hover:text-slate-200 hover:bg-slate-800 w-8 h-8"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-slate-950" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-72 bg-slate-900 border-slate-800 text-slate-200"
        >
          <DropdownMenuLabel className="text-slate-400 text-xs font-medium">
            Notifications
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-800" />
          {[
            { title: 'Handover en attente', desc: '2 leads nécessitent une attention humaine', time: 'il y a 5 min', color: 'bg-red-500' },
            { title: 'Signal détecté', desc: "3 nouveaux signaux d'achat identifiés", time: 'il y a 12 min', color: 'bg-blue-500' },
            { title: 'Agent Outbound', desc: '47 emails envoyés cette heure', time: 'il y a 1h', color: 'bg-emerald-500' },
          ].map((notif, i) => (
            <DropdownMenuItem key={i} className="flex flex-col items-start gap-1 py-2.5 px-3 cursor-pointer hover:bg-slate-800 focus:bg-slate-800">
              <div className="flex items-center gap-2 w-full">
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', notif.color)} />
                <span className="text-xs font-medium text-slate-200 flex-1 truncate">{notif.title}</span>
                <span className="text-[10px] text-slate-600 shrink-0">{notif.time}</span>
              </div>
              <p className="text-[11px] text-slate-500 pl-3.5 leading-snug">{notif.desc}</p>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-slate-800" />
          <DropdownMenuItem className="text-xs text-blue-400 justify-center cursor-pointer hover:bg-slate-800 focus:bg-slate-800">
            Voir toutes les notifications
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-full p-0 overflow-hidden hover:ring-2 hover:ring-blue-500/50 transition-all"
            aria-label="Menu utilisateur"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-bold text-white">
              JD
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52 bg-slate-900 border-slate-800 text-slate-200"
        >
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-slate-200">Jean Dupont</span>
            <span className="text-xs text-slate-500 font-normal">jean@leadgen.io</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-800" />
          <DropdownMenuItem className="text-xs text-slate-300 hover:bg-slate-800 focus:bg-slate-800 cursor-pointer gap-2">
            <Moon className="w-3.5 h-3.5" />
            Profil
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs text-slate-300 hover:bg-slate-800 focus:bg-slate-800 cursor-pointer gap-2">
            <Moon className="w-3.5 h-3.5" />
            Paramètres
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-800" />
          <DropdownMenuItem className="text-xs text-red-400 hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
