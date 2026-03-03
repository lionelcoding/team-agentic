'use client'

import { useState } from 'react'
import { Server, Cpu, MessageCircle, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GatewayTab }    from './gateway-tab'
import { ApiModelsTab }  from './api-models-tab'
import { TelegramTab }   from './telegram-tab'
import { AutonomyTab }   from './autonomy-tab'

const TABS = [
  { id: 'gateway',   label: 'Gateway',     icon: Server,        description: 'Connexion OpenClaw & Tailscale' },
  { id: 'api',       label: 'API & Models',icon: Cpu,           description: 'Modèles, clés, routage' },
  { id: 'telegram',  label: 'Telegram',    icon: MessageCircle, description: 'Bot notifications' },
  { id: 'autonomy',  label: 'Autonomie',   icon: ShieldCheck,   description: 'Carte Blanche par agent' },
] as const

type TabId = typeof TABS[number]['id']

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('gateway')

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-50 text-balance">Paramètres</h1>
        <p className="text-sm text-slate-400 mt-1">
          Configuration système — Gateway, modèles IA, notifications, autonomie
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-slate-800 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                isActive
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab description */}
      <p className="text-xs text-slate-600 -mt-4">
        {TABS.find((t) => t.id === activeTab)?.description}
      </p>

      {/* Content */}
      {activeTab === 'gateway'  && <GatewayTab />}
      {activeTab === 'api'      && <ApiModelsTab />}
      {activeTab === 'telegram' && <TelegramTab />}
      {activeTab === 'autonomy' && <AutonomyTab />}
    </div>
  )
}
