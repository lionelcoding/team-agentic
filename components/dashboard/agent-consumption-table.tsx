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
import { getTagColor } from '@/lib/agents-data'

const statusConfig: Record<string, { color: string; label: string; pulse: boolean }> = {
  idle: { color: 'bg-emerald-400', label: 'Disponible', pulse: false },
  working: { color: 'bg-yellow-400', label: 'En cours', pulse: true },
  error: { color: 'bg-red-400', label: 'Erreur', pulse: true },
  disabled: { color: 'bg-slate-500', label: 'Desactive', pulse: false },
  provisioning: { color: 'bg-blue-400', label: 'Provisioning', pulse: true },
  deleting: { color: 'bg-red-600', label: 'Suppression', pulse: true },
}

interface AgentRow {
  id: string
  initials: string
  name: string
  role: string
  tags: string[]
  model: string
  status: string
  tokensUsed: number
  tasksCount: number
  tasksFailed: number
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

export function AgentConsumptionTable() {
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawAgentsRef = useRef<any[]>([])

  useEffect(() => {
    const supabase = createClient()

    async function fetchAgents() {
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('*')
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          <h3 className="text-sm font-semibold text-slate-200">Agents VPS</h3>
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
            <span className="block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>
        <span className="text-xs text-slate-500">{agents.length} agents</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-500 text-xs font-medium w-56">Agent</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium w-10">Etat</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium">Tags</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium">Modele</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium text-right">Tokens</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium text-right">Taches</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <TableCell className="py-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-[11px] font-bold text-white shrink-0',
                        getTagColor(agent.tags?.[0] || '').avatar
                      )}
                    >
                      {agent.initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-slate-200 truncate">{agent.name}</span>
                      <span className="text-[10px] text-slate-500 truncate">{agent.role}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-2.5">
                  <StatusDot status={agent.status} />
                </TableCell>
                <TableCell className="py-2.5">
                  <div className="flex gap-1 flex-wrap">
                    {agent.tags?.map((tag) => {
                      const colors = getTagColor(tag)
                      return (
                        <span
                          key={tag}
                          className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', colors.bg, colors.text, colors.border)}
                        >
                          {tag}
                        </span>
                      )
                    })}
                  </div>
                </TableCell>
                <TableCell className="py-2.5">
                  <span className="text-[10px] font-mono text-slate-400">{agent.model}</span>
                </TableCell>
                <TableCell className="text-right py-2.5">
                  <span className="text-xs font-mono text-slate-300">
                    {agent.tokensUsed ? `${Math.round(agent.tokensUsed / 1000)}K` : '0'}
                  </span>
                </TableCell>
                <TableCell className="text-right py-2.5">
                  <span className="text-xs font-semibold text-slate-200 tabular-nums">
                    {agent.tasksCount}
                    {agent.tasksFailed > 0 && (
                      <span className="text-red-400 text-[10px] ml-1">({agent.tasksFailed} err)</span>
                    )}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAgents(data: any[]): AgentRow[] {
  return data.map((a) => ({
    id: a.id,
    initials: a.name?.substring(0, 2).toUpperCase() || '??',
    name: a.name || 'Agent',
    role: a.role || '',
    tags: a.tags || [],
    model: a.model?.split('/').pop() || '—',
    status: a.status || 'idle',
    tokensUsed: a.tokens_used || 0,
    tasksCount: a.tasks_count || 0,
    tasksFailed: a.tasks_failed || 0,
  }))
}
