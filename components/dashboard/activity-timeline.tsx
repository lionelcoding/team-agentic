'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const typeBadges: Record<string, string> = {
  toolCall: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  agent_end: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  session_end: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  heartbeat: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  error: 'bg-red-500/15 text-red-400 border-red-500/30',
  wake: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  sleep: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
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

interface ActionRow {
  id: string
  agent_id: string
  action_type: string
  description: string | null
  created_at: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "a l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

function getInitials(agentId: string): string {
  return agentId.substring(0, 2).toUpperCase()
}

// Stable color index from agent_id string
function agentColorIndex(agentId: string): number {
  let hash = 0
  for (let i = 0; i < agentId.length; i++) hash = (hash * 31 + agentId.charCodeAt(i)) | 0
  return Math.abs(hash) % avatarColors.length
}

export function ActivityTimeline() {
  const [actions, setActions] = useState<ActionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function fetch() {
      const { data, error } = await supabase
        .from('agent_actions')
        .select('id, agent_id, action_type, description, created_at')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) console.error('Error fetching timeline:', error)
      setActions(data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg flex flex-col">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Timeline des Actions</h3>
        <span className="text-xs text-slate-500">20 dernieres actions</span>
      </div>
      <div className="overflow-y-auto max-h-[480px] divide-y divide-slate-800/60">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            <span className="ml-2 text-xs text-slate-500">Chargement...</span>
          </div>
        ) : actions.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500">Aucune action</div>
        ) : (
          actions.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-800/30 transition-colors"
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5',
                  avatarColors[agentColorIndex(item.agent_id)]
                )}
              >
                {getInitials(item.agent_id)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-medium text-slate-300">{item.agent_id}</span>
                  <span
                    className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded border',
                      typeBadges[item.action_type] ?? 'bg-slate-700 text-slate-400 border-slate-600'
                    )}
                  >
                    {item.action_type}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-snug truncate">{item.description || '—'}</p>
              </div>
              <span className="text-[10px] text-slate-600 shrink-0 mt-0.5 whitespace-nowrap">
                {timeAgo(item.created_at)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
