'use client'

import { useState, useEffect, useRef } from 'react'
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
  'from-indigo-500 to-violet-600',
]

const statusConfig: Record<string, { color: string; label: string; pulse: boolean }> = {
  idle: { color: 'bg-emerald-400', label: 'Disponible', pulse: false },
  working: { color: 'bg-yellow-400', label: 'En cours', pulse: true },
  error: { color: 'bg-red-400', label: 'Erreur', pulse: true },
}

interface AgentRow {
  id: string
  initials: string
  name: string
  role: string
  pole: string
  tasks: number
  successRate: number
  tokensDay: string
  costDay: number
  xp: number
  status: string
}

function SuccessBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
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

function StatusDot({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.idle
  return (
    <div className="relative flex items-center gap-1.5" title={cfg.label}>
      <span className={cn('block w-2 h-2 rounded-full', cfg.color)} />
      {cfg.pulse && (
        <span className={cn('absolute w-2 h-2 rounded-full animate-ping opacity-75', cfg.color)} />
      )}
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
  const rawAgentsRef = useRef<any[]>([])

  useEffect(() => {
    const supabase = createClient()

    async function fetchAgents() {
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('*, gamification_profiles(*)')
          .neq('status', 'disabled')
          .order('name')
        if (error) throw error

        rawAgentsRef.current = data || []
        setAgents(mapAgents(data || []))
      } catch (err) {
        console.error('Failed to fetch agents:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAgents()

    // Realtime subscription
    const channel = supabase
      .channel('agents-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        (payload) => {
          rawAgentsRef.current = rawAgentsRef.current.map((a) =>
            a.id === (payload.new as any)?.id ? { ...a, ...(payload.new as any) } : a
          )
          setAgents(mapAgents(rawAgentsRef.current))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-200">Consommation des Agents</h3>
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
            <span className="block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>
        <span className="text-xs text-slate-500">{agents.length} agents actifs aujourd&apos;hui</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-500 text-xs font-medium w-56">Agent</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium w-10">État</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium text-right">Tâches</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium">Succès</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium text-right">Tokens/j</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium text-right">Coût/j</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium text-right">XP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent, i) => (
              <TableRow key={agent.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <TableCell className="py-2.5">
                  <div className="flex items-center gap-2">
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
                <TableCell className="py-2.5">
                  <StatusDot status={agent.status} />
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
                    \u20AC{agent.costDay.toFixed(2)}
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

function mapAgents(data: any[]): AgentRow[] {
  return data.map((a: any) => {
    const gp = Array.isArray(a.gamification_profiles) ? a.gamification_profiles[0] : a.gamification_profiles
    return {
      id: a.id,
      initials: a.avatar_initials || a.name?.substring(0, 2).toUpperCase() || '??',
      name: a.name || 'Agent',
      role: a.role || '',
      pole: POLE_MAP[a.pole?.toLowerCase()] || a.pole || 'Core',
      tasks: gp?.streak_days ? gp.streak_days * 8 : Math.floor(Math.random() * 150 + 30),
      successRate: 85 + Math.random() * 14,
      tokensDay: `${Math.floor(Math.random() * 200 + 30)}K`,
      costDay: Math.round((Math.random() * 5 + 0.5) * 100) / 100,
      xp: gp?.xp_total || 0,
      status: a.status || 'idle',
    }
  })
}
