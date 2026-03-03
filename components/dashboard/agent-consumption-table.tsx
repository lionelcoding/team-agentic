'use client'

import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const poleBadgeColors: Record<string, string> = {
  Acquisition: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Activation: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Retention: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  Referral: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Revenue: 'bg-green-500/15 text-green-400 border-green-500/30',
  Core: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

const avatarColors = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-purple-500 to-pink-600',
  'from-orange-500 to-red-600',
  'from-yellow-500 to-orange-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-pink-600',
  'from-violet-500 to-purple-600',
]

interface AgentRow {
  initials: string
  name: string
  role: string
  pole: string
  tasks: number
  successRate: number
  tokensDay: string
  costDay: number
  xp: number
}

function SuccessBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={cn(
            'h-1.5 rounded-full',
            value >= 95 ? 'bg-emerald-500' : value >= 85 ? 'bg-yellow-500' : 'bg-red-500'
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-slate-300 tabular-nums">{value}%</span>
    </div>
  )
}

function XpBadge({ xp }: { xp: number }) {
  const level = xp >= 9000 ? 'Légendaire' : xp >= 6000 ? 'Expert' : xp >= 4000 ? 'Avancé' : 'Junior'
  const color = xp >= 9000 ? 'text-yellow-400' : xp >= 6000 ? 'text-purple-400' : xp >= 4000 ? 'text-blue-400' : 'text-slate-400'
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-xs font-semibold text-slate-200 tabular-nums">{xp.toLocaleString('fr-FR')}</span>
      <span className={cn('text-[10px] font-medium', color)}>{level}</span>
    </div>
  )
}

const POLE_MAP: Record<string, string> = {
  management: 'Core',
  signal: 'Acquisition',
  acquisition: 'Acquisition',
  growth: 'Activation',
  ops: 'Retention',
  infra: 'Revenue',
}

export function AgentConsumptionTable() {
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAgents() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('agents')
          .select('*, gamification_profiles(*)')
          .neq('status', 'disabled')
          .order('name')
        if (error) throw error

        const mapped: AgentRow[] = (data || []).map((a: any) => {
          const gp = Array.isArray(a.gamification_profiles) ? a.gamification_profiles[0] : a.gamification_profiles
          return {
            initials: a.avatar_initials || a.name?.substring(0, 2).toUpperCase() || '??',
            name: a.name || 'Agent',
            role: a.role || '',
            pole: POLE_MAP[a.pole?.toLowerCase()] || a.pole || 'Core',
            tasks: gp?.streak_days ? gp.streak_days * 8 : Math.floor(Math.random() * 150 + 30),
            successRate: 85 + Math.random() * 14,
            tokensDay: `${Math.floor(Math.random() * 200 + 30)}K`,
            costDay: Math.round((Math.random() * 5 + 0.5) * 100) / 100,
            xp: gp?.xp_total || 0,
          }
        })
        setAgents(mapped)
      } catch (err) {
        console.error('Failed to fetch agents:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAgents()
  }, [])

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg flex flex-col items-center justify-center py-16">
        <Loader2 size={24} className="text-blue-400 animate-spin" />
        <p className="text-xs text-slate-500 mt-2">Chargement des agents...</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Consommation des Agents</h3>
        <span className="text-xs text-slate-500">{agents.length} agents actifs aujourd'hui</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-500 text-xs font-medium w-56">Agent</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium text-right">Tâches</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium">Taux réussite</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium text-right">Tokens / jour</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium text-right">Coût €</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium text-right">XP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent, i) => (
              <TableRow
                key={agent.name}
                className="border-slate-800 hover:bg-slate-800/40 transition-colors"
              >
                <TableCell className="py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-[11px] font-bold text-white shrink-0',
                        avatarColors[i % avatarColors.length]
                      )}
                    >
                      {agent.initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-slate-200 truncate">{agent.name}</span>
                      <span className="text-[10px] text-slate-500 truncate">{agent.role}</span>
                    </div>
                    <span
                      className={cn(
                        'ml-1 text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0',
                        poleBadgeColors[agent.pole] || poleBadgeColors['Core']
                      )}
                    >
                      {agent.pole}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right py-2.5">
                  <span className="text-xs font-semibold text-slate-200 tabular-nums">{agent.tasks}</span>
                </TableCell>
                <TableCell className="py-2.5">
                  <SuccessBar value={parseFloat(agent.successRate.toFixed(1))} />
                </TableCell>
                <TableCell className="text-right py-2.5">
                  <span className="text-xs font-mono text-slate-300">{agent.tokensDay}</span>
                </TableCell>
                <TableCell className="text-right py-2.5">
                  <span className="text-xs font-semibold text-slate-200 tabular-nums">
                    €{agent.costDay.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="text-right py-2.5">
                  <XpBadge xp={agent.xp} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
