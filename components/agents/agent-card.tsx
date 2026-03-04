"use client"

import { Eye, MoreVertical, Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { Agent } from "@/lib/agents-data"
import { POLE_COLORS, PHASE_COLORS } from "@/lib/agents-data"

const STATUS_CONFIG: Record<string, { dot: string; label: string; pulse: boolean }> = {
  idle:    { dot: "bg-slate-500", label: "Inactif",   pulse: false },
  working: { dot: "bg-blue-400",  label: "En cours",  pulse: true  },
  error:   { dot: "bg-red-400",   label: "Erreur",    pulse: false },
  disabled: { dot: "bg-slate-600", label: "Desactive", pulse: false },
  provisioning: { dot: "bg-blue-400", label: "Provisioning", pulse: true },
  deleting: { dot: "bg-red-600", label: "Suppression", pulse: true },
}

interface AgentCardProps {
  agent: Agent
  onView: (agent: Agent) => void
  onToggle: (id: string) => void
}

export function AgentCard({ agent, onView, onToggle }: AgentCardProps) {
  const pole = agent.pole ? POLE_COLORS[agent.pole] : { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/30", avatar: "from-slate-500 to-slate-700" }
  const status = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle
  const xpPct = Math.round((agent.xp / agent.xpNext) * 100)

  return (
    <div
      className={cn(
        "bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col gap-3 hover:border-slate-700 transition-colors",
        !agent.enabled && "opacity-50"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className={cn(
              "w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white",
              pole.avatar
            )}>
              {agent.name.slice(0, 2).toUpperCase()}
            </div>
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900",
              status.dot,
              status.pulse && "animate-pulse"
            )} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-50 truncate">{agent.name}</p>
            <p className="text-xs text-slate-400 truncate">{agent.role}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-500 hover:text-slate-300 hover:bg-slate-800 shrink-0">
              <MoreVertical size={13} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700 text-slate-200 w-40">
            <DropdownMenuItem className="text-xs hover:bg-slate-800 cursor-pointer gap-2" onClick={() => onView(agent)}>
              <Eye size={12} /> Voir le détail
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs hover:bg-slate-800 cursor-pointer gap-2" onClick={() => onToggle(agent.id)}>
              <Power size={12} /> {agent.enabled ? "Désactiver" : "Activer"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {agent.pole && (
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border", pole.bg, pole.text, pole.border)}>
            {agent.pole}
          </span>
        )}
        {agent.phase && (
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", PHASE_COLORS[agent.phase])}>
            {agent.phase}
          </span>
        )}
        <span className={cn(
          "text-[10px] font-medium px-1.5 py-0.5 rounded border ml-auto",
          agent.status === "error" ? "bg-red-500/15 text-red-400 border-red-500/30" :
          agent.status === "working" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" :
          "bg-slate-700/40 text-slate-400 border-slate-700"
        )}>
          {status.label}
        </span>
      </div>

      {/* Stats 2x3 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div className="col-span-2">
          <span className="text-slate-500">Dernière action</span>
          <p className="text-slate-300 truncate text-[11px]">
            {agent.actions[0]?.description.slice(0, 40)}…
          </p>
        </div>
        <div>
          <span className="text-slate-500">Tâches</span>
          <p className="text-slate-200 font-medium">{agent.tasksActive}/{agent.tasksTotal}</p>
        </div>
        <div>
          <span className="text-slate-500">Taux échec</span>
          <p className={cn("font-medium", agent.failureRate > 5 ? "text-red-400" : "text-slate-200")}>
            {agent.failureRate}%
          </p>
        </div>
        <div>
          <span className="text-slate-500">Tokens/j</span>
          <p className="text-slate-200 font-medium font-mono">{(agent.tokensDay / 1000).toFixed(0)}K</p>
        </div>
        <div>
          <span className="text-slate-500">Coût/j</span>
          <p className="text-slate-200 font-medium">€{agent.costDay.toFixed(2)}</p>
        </div>
      </div>

      {/* XP bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-500">Nv.{agent.level} — {agent.xp.toLocaleString("fr-FR")} XP</span>
          <span className="text-[10px] text-slate-600">{xpPct}%</span>
        </div>
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full", pole.avatar.replace("from-", "bg-").split(" ")[0])}
            style={{ width: `${xpPct}%` }} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
        <Button size="sm" variant="ghost"
          className="flex-1 h-7 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 gap-1"
          onClick={() => onView(agent)}>
          <Eye size={12} /> Détail
        </Button>
        <Button size="sm" variant="ghost"
          className={cn("flex-1 h-7 text-xs gap-1",
            agent.enabled ? "text-slate-400 hover:text-amber-400 hover:bg-amber-500/10" : "text-slate-400 hover:text-green-400 hover:bg-green-500/10"
          )}
          onClick={() => onToggle(agent.id)}>
          <Power size={12} /> {agent.enabled ? "Désactiver" : "Activer"}
        </Button>
      </div>
    </div>
  )
}
