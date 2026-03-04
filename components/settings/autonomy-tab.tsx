'use client'

import { useState } from 'react'
import { ShieldCheck, ShieldAlert, Zap, Clock, DollarSign, Activity } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AGENTS_AUTONOMY, AUTONOMY_LOGS } from '@/lib/mock/settings-data'
import type { AgentAutonomy } from '@/lib/mock/settings-data'

const LEVEL_STYLES: Record<AgentAutonomy['level'], string> = {
  supervised: 'bg-red-600/20 text-red-400 border-red-700/40',
  assisted:   'bg-amber-600/20 text-amber-400 border-amber-700/40',
  autonomous: 'bg-emerald-600/20 text-emerald-400 border-emerald-700/40',
}

const LEVEL_LABELS: Record<AgentAutonomy['level'], string> = {
  supervised: 'Supervisé',
  assisted:   'Assisté',
  autonomous: 'Autonome',
}

export function AutonomyTab() {
  const [globalAutonomy, setGlobalAutonomy] = useState(true)
  const [budgetMax, setBudgetMax]           = useState('50')
  const [actionsMax, setActionsMax]         = useState('200')
  const [agents, setAgents]                 = useState(AGENTS_AUTONOMY)

  function updateAgentLevel(id: string, level: AgentAutonomy['level']) {
    setAgents((prev) => prev.map((a) => a.id === id ? { ...a, level } : a))
  }

  const totalAutonomousActions = AUTONOMY_LOGS.length
  const totalCost               = AUTONOMY_LOGS.reduce((s, l) => s + l.cost, 0)

  return (
    <div className="flex flex-col gap-6">

      {/* Global toggle */}
      <Card className="bg-slate-900 border-slate-800 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg border',
              globalAutonomy
                ? 'bg-emerald-600/20 border-emerald-700/40'
                : 'bg-red-600/20 border-red-700/40'
            )}>
              {globalAutonomy
                ? <Zap className="w-5 h-5 text-emerald-400" />
                : <ShieldAlert className="w-5 h-5 text-red-400" />
              }
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Mode autonome global</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {globalAutonomy
                  ? 'Les agents peuvent agir selon leur niveau configuré'
                  : 'Tous les agents sont en mode supervisé — approbation manuelle requise'
                }
              </p>
            </div>
          </div>
          <Switch
            checked={globalAutonomy}
            onCheckedChange={setGlobalAutonomy}
            className="data-[state=checked]:bg-emerald-600"
          />
        </div>
      </Card>

      {/* Global limits */}
      <Card className="bg-slate-900 border-slate-800 p-5 flex flex-col gap-5">
        <p className="text-sm font-semibold text-slate-200">Limites globales (mode autonome)</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-3 h-3" /> Budget max en autonome
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">€</span>
              <Input
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                type="number"
                className="bg-slate-800 border-slate-700 text-slate-200 focus-visible:ring-blue-500"
              />
              <span className="text-slate-500 text-xs whitespace-nowrap">/ jour</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3 h-3" /> Actions max
            </Label>
            <div className="flex items-center gap-2">
              <Input
                value={actionsMax}
                onChange={(e) => setActionsMax(e.target.value)}
                type="number"
                className="bg-slate-800 border-slate-700 text-slate-200 focus-visible:ring-blue-500"
              />
              <span className="text-slate-500 text-xs whitespace-nowrap">/ jour</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Per-agent table */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-200">Niveau d'autonomie par agent</p>
            <p className="text-xs text-slate-500 mt-0.5">Supervisé → Assisté → Autonome</p>
          </div>
          <div className="flex gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Supervisé</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Assisté</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Autonome</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Agent', 'Pôle', 'Niveau', 'Conditions', 'Actions / sem.', 'Auto. aujourd\'hui'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0', agent.poleColor)}>
                        {agent.initials}
                      </div>
                      <span className="text-sm text-slate-200 font-medium">{agent.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">{agent.pole}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Select
                      value={agent.level}
                      onValueChange={(v) => updateAgentLevel(agent.id, v as AgentAutonomy['level'])}
                    >
                      <SelectTrigger className={cn('h-7 w-36 text-xs border', LEVEL_STYLES[agent.level])}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="supervised" className="text-xs text-red-400 focus:bg-slate-700">Supervisé</SelectItem>
                        <SelectItem value="assisted"   className="text-xs text-amber-400 focus:bg-slate-700">Assisté</SelectItem>
                        <SelectItem value="autonomous" className="text-xs text-emerald-400 focus:bg-slate-700">Autonome</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[240px] truncate">{agent.conditions}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{agent.actionsThisWeek}</td>
                  <td className="px-4 py-2.5 text-xs font-mono">
                    <span className={agent.autonomousActionsToday > 0 ? 'text-emerald-400' : 'text-slate-600'}>
                      {agent.autonomousActionsToday}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Autonomy logs */}
      <Card className="bg-slate-900 border-slate-800 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-200">Journal des decisions autonomes</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {totalAutonomousActions} actions autonomes aujourd'hui · coût total : €{totalCost.toFixed(2)}
            </p>
          </div>
          <Badge className="bg-blue-600/20 text-blue-400 border-blue-700/40 text-xs">
            Aujourd'hui
          </Badge>
        </div>
        <div className="flex flex-col divide-y divide-slate-800/50">
          {AUTONOMY_LOGS.map((log) => (
            <div key={log.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5', log.poleColor)}>
                {log.agentInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-200">{log.agentName}</span>
                  <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-700/40">{log.action}</Badge>
                  <span className="text-[11px] text-slate-600 ml-auto shrink-0">{log.timestamp}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{log.decision}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">Coût : €{log.cost.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Button className="bg-blue-600 hover:bg-blue-700 text-white w-fit">
        Enregistrer les niveaux d'autonomie
      </Button>
    </div>
  )
}
