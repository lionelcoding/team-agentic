"use client"

import { cn } from "@/lib/utils"
import type { Agent, Pole } from "@/lib/agents-data"
import { POLE_COLORS } from "@/lib/agents-data"

const POLE_ORDER: Pole[] = ["SYS", "ACQ", "GRO", "SUP", "OPS", "GOV"]
const POLE_LABELS: Record<Pole, string> = {
  SYS: "Système", ACQ: "Acquisition", GRO: "Croissance",
  SUP: "Support", OPS: "Opérations", GOV: "Gouvernance",
}

const STATUS_DOT: Record<string, string> = {
  idle: "bg-slate-500",
  working: "bg-blue-400 animate-pulse",
  error: "bg-red-400",
}

interface AgentOrgChartProps {
  agents: Agent[]
  onSelectAgent: (agent: Agent) => void
}

export function AgentOrgChart({ agents, onSelectAgent }: AgentOrgChartProps) {
  const orchestrator = agents.find(a => a.id === "victor")
  const byPole = POLE_ORDER.reduce((acc, pole) => {
    acc[pole] = agents.filter(a => a.pole === pole && a.id !== "victor")
    return acc
  }, {} as Record<Pole, Agent[]>)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 overflow-x-auto">
      <div className="flex flex-col items-center gap-0 min-w-[900px]">

        {/* Root — OpenClaw / Victor */}
        <div className="flex flex-col items-center gap-2">
          <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 tracking-wider">
            OpenClaw LeadGen
          </div>
          <div className="w-px h-4 bg-slate-700" />
          {orchestrator && (
            <OrgNode agent={orchestrator} onSelect={onSelectAgent} />
          )}
          <div className="w-px h-4 bg-slate-700" />
        </div>

        {/* Horizontal connector spanning all poles */}
        <div className="flex items-center w-full justify-center gap-0">
          {POLE_ORDER.map((pole, i) => (
            <div key={pole} className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center w-full">
                <div className={cn(
                  "w-full flex items-center justify-center",
                  i === 0 ? "border-t-0" : ""
                )}>
                  {/* Connector line */}
                  <div className={cn(
                    "w-1/2 h-px bg-slate-700",
                    i === 0 ? "bg-transparent" : ""
                  )} />
                  <div className="w-px h-4 bg-slate-700" />
                  <div className={cn(
                    "w-1/2 h-px bg-slate-700",
                    i === POLE_ORDER.length - 1 ? "bg-transparent" : ""
                  )} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Poles */}
        <div className="flex items-start gap-4 w-full">
          {POLE_ORDER.map(pole => {
            const poleAgents = byPole[pole]
            const color = POLE_COLORS[pole]
            return (
              <div key={pole} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                {/* Pole header */}
                <div className={cn("w-full text-center text-[10px] font-bold px-2 py-1.5 rounded-md border", color.bg, color.text, color.border)}>
                  {pole} — {POLE_LABELS[pole]}
                </div>
                {/* Agents */}
                <div className="flex flex-col items-center gap-2 w-full">
                  {poleAgents.map((agent, i) => (
                    <div key={agent.id} className="flex flex-col items-center gap-0 w-full">
                      {i > 0 && <div className="w-px h-2 bg-slate-700/50" />}
                      <OrgNode agent={agent} onSelect={onSelectAgent} compact />
                    </div>
                  ))}
                  {poleAgents.length === 0 && (
                    <div className="text-[10px] text-slate-600 italic">Aucun agent</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function OrgNode({ agent, onSelect, compact = false }: { agent: Agent; onSelect: (a: Agent) => void; compact?: boolean }) {
  const pole = agent.pole ? POLE_COLORS[agent.pole] : { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/30", avatar: "from-slate-500 to-slate-700" }
  return (
    <button
      onClick={() => onSelect(agent)}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-slate-900 hover:bg-slate-800 hover:border-slate-600 transition-colors w-full",
        compact ? "px-2 py-1.5" : "px-3 py-2"
      )}
    >
      <div className="relative shrink-0">
        <div className={cn(
          "rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-white",
          compact ? "w-7 h-7 text-[10px]" : "w-10 h-10 text-xs",
          pole.avatar
        )}>
          {agent.name.slice(0, 2).toUpperCase()}
        </div>
        <span className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900", STATUS_DOT[agent.status])} />
      </div>
      <div className="text-left min-w-0 flex-1">
        <p className={cn("font-semibold text-slate-100 truncate", compact ? "text-[10px]" : "text-xs")}>{agent.name}</p>
        <p className={cn("text-slate-500 truncate", compact ? "text-[9px]" : "text-[10px]")}>{agent.role}</p>
      </div>
    </button>
  )
}
