'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2, Clock, Zap } from 'lucide-react'

const recentActions = [
  { label: 'Analyse ICP terminée', time: 'il y a 2 min', status: 'done' },
  { label: 'Enrichissement 42 leads', time: 'il y a 8 min', status: 'done' },
  { label: 'Séquence email lancée', time: 'il y a 15 min', status: 'running' },
]

export function OrchestratorStatus() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Orchestrateur</h3>
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs text-emerald-400 font-medium">Actif</span>
        </span>
      </div>

      {/* Avatar Victor */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-900/30">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">Victor (VC)</p>
          <p className="text-xs text-slate-500">Agent Orchestrateur Principal</p>
        </div>
      </div>

      {/* Progress agents actifs */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Agents actifs</span>
          <span className="text-xs font-semibold text-slate-200">8 / 16</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full transition-all duration-500"
            style={{ width: '50%' }}
          />
        </div>
        <p className="text-[10px] text-slate-600">50% de capacité utilisée</p>
      </div>

      {/* Dernières actions */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-slate-400">Dernières actions</p>
        {recentActions.map((action, i) => (
          <div key={i} className="flex items-center gap-2">
            {action.status === 'done' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-pulse" />
            )}
            <span className="text-xs text-slate-300 flex-1 truncate">{action.label}</span>
            <span className="text-[10px] text-slate-600 shrink-0">{action.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
