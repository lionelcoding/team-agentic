'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function OrchestratorStatus() {
  const [totalAgents, setTotalAgents] = useState(0)
  const [workingAgents, setWorkingAgents] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function fetch() {
      const { data } = await supabase.from('agents').select('id, status')
      if (data) {
        setTotalAgents(data.length)
        setWorkingAgents(data.filter((a) => a.status === 'working').length)
      }
      setLoading(false)
    }
    fetch()

    const channel = supabase
      .channel('orchestrator-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => {
        fetch()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const pct = totalAgents > 0 ? Math.round((workingAgents / totalAgents) * 100) : 0

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Gateway</h3>
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs text-emerald-400 font-medium">Actif</span>
        </span>
      </div>

      {/* Avatar Morpheus */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-900/30">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">Morpheus (main)</p>
          <p className="text-xs text-slate-500">Agent principal multi-persona</p>
        </div>
      </div>

      {/* Progress agents actifs */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Agents actifs</span>
          {loading ? (
            <Loader2 className="w-3 h-3 text-slate-500 animate-spin" />
          ) : (
            <span className="text-xs font-semibold text-slate-200">{workingAgents} / {totalAgents}</span>
          )}
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2">
          <div
            className={cn(
              'h-2 rounded-full transition-all duration-500',
              pct > 50 ? 'bg-gradient-to-r from-blue-600 to-blue-400' : 'bg-gradient-to-r from-slate-600 to-slate-500'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-600">{pct}% de capacite utilisee</p>
      </div>
    </div>
  )
}
