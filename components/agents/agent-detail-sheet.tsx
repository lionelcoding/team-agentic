"use client"

import { useState } from "react"
import { X, Flame, Search, ChevronDown, ChevronUp } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Agent, AgentMemoryEntry } from "@/lib/agents-data"
import { POLE_COLORS, PHASE_COLORS, getRelativeTime } from "@/lib/agents-data"

const TABS = ["Vue d'ensemble", "Actions récentes", "Tokens", "Mémoire", "Gamification"] as const
type Tab = typeof TABS[number]

const MEMORY_CATEGORIES: AgentMemoryEntry["category"][] = ["context", "facts", "beliefs", "patterns"]
const MEMORY_LABELS: Record<AgentMemoryEntry["category"], string> = {
  context: "Contexte", facts: "Faits", beliefs: "Croyances", patterns: "Patterns",
}

const ACTION_STATUS = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  error: "bg-red-500/15 text-red-400 border-red-500/30",
  running: "bg-blue-500/15 text-blue-400 border-blue-500/30",
}

const ChartTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200">
        {payload[0].payload.day}: {(payload[0].value / 1000).toFixed(0)}K tokens
      </div>
    )
  }
  return null
}

interface AgentDetailSheetProps {
  agent: Agent | null
  onClose: () => void
}

export function AgentDetailSheet({ agent, onClose }: AgentDetailSheetProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Vue d'ensemble")
  const [memorySearch, setMemorySearch] = useState("")
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(MEMORY_CATEGORIES))

  if (!agent) return null
  const pole = agent.pole ? POLE_COLORS[agent.pole] : { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/30", avatar: "from-slate-500 to-slate-700" }
  const xpPct = Math.round((agent.xp / agent.xpNext) * 100)

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const filteredMemory = agent.memory.filter(
    m => !memorySearch || m.key.toLowerCase().includes(memorySearch.toLowerCase()) || m.value.toLowerCase().includes(memorySearch.toLowerCase())
  )

  const totalWeekTokens = agent.tokenWeek.reduce((s, d) => s + d.tokens, 0)

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[420px] bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Sheet header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white", pole.avatar)}>
              {agent.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-50">{agent.name}</p>
              <p className="text-xs text-slate-400">{agent.role}{agent.pole ? ` · ${agent.pole}` : ''}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="w-8 h-8 text-slate-500 hover:text-slate-200 hover:bg-slate-800">
            <X size={16} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 shrink-0 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors relative",
                activeTab === tab ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
              )}>
              {tab}
              {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* TAB 1 — Overview */}
          {activeTab === "Vue d'ensemble" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                {agent.pole && (
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded border", pole.bg, pole.text, pole.border)}>{agent.pole}</span>
                )}
                {agent.phase && (
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded border", PHASE_COLORS[agent.phase])}>{agent.phase}</span>
                )}
                <span className="text-xs text-slate-500 ml-auto">Créé le {agent.createdAt}</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{agent.description}</p>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Capacités</p>
                <div className="flex flex-wrap gap-1.5">
                  {(agent.capabilities || []).map(cap => (
                    <span key={cap} className="text-xs px-2 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">{cap}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Tâches totales", value: agent.tasksTotal.toLocaleString("fr-FR") },
                  { label: "Taux d'échec", value: `${agent.failureRate}%` },
                  { label: "Tokens aujourd'hui", value: `${(agent.tokensDay / 1000).toFixed(0)}K` },
                  { label: "Coût aujourd'hui", value: `€${agent.costDay.toFixed(2)}` },
                ].map(stat => (
                  <div key={stat.label} className="bg-slate-800/60 rounded-lg p-3">
                    <p className="text-[10px] text-slate-500 mb-0.5">{stat.label}</p>
                    <p className="text-base font-bold text-slate-100">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2 — Actions */}
          {activeTab === "Actions récentes" && (
            <div className="flex flex-col gap-1">
              {agent.actions.map(action => (
                <div key={action.id} className="flex items-start gap-3 py-2.5 border-b border-slate-800/60 last:border-0">
                  <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 mt-0.5", ACTION_STATUS[action.status])}>
                    {action.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 leading-snug">{action.description}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{getRelativeTime(action.timestamp)} · €{action.cost.toFixed(3)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3 — Tokens */}
          {activeTab === "Tokens" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/60 rounded-lg p-3">
                  <p className="text-[10px] text-slate-500 mb-0.5">Total semaine</p>
                  <p className="text-base font-bold text-slate-100">{(totalWeekTokens / 1000).toFixed(0)}K</p>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-3">
                  <p className="text-[10px] text-slate-500 mb-0.5">Coût mensuel (est.)</p>
                  <p className="text-base font-bold text-slate-100">€{(agent.costDay * 30).toFixed(2)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tokens 7 derniers jours</p>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={agent.tokenWeek} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="tokens" radius={[3, 3, 0, 0]}>
                      {agent.tokenWeek.map((_, i) => (
                        <Cell key={i} fill={i === agent.tokenWeek.length - 2 ? "#3b82f6" : "#334155"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="border-t border-slate-800 pt-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Répartition des coûts</p>
                {[
                  { label: "Tokens input", pct: 65, cost: (agent.costDay * 0.65).toFixed(3) },
                  { label: "Tokens output", pct: 28, cost: (agent.costDay * 0.28).toFixed(3) },
                  { label: "APIs tierces", pct: 7, cost: (agent.costDay * 0.07).toFixed(3) },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-400 w-24 shrink-0">{item.label}</span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 w-12 text-right">€{item.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4 — Memory */}
          {activeTab === "Mémoire" && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input value={memorySearch} onChange={e => setMemorySearch(e.target.value)}
                  placeholder="Rechercher dans la mémoire..." className="h-8 pl-8 text-xs bg-slate-800 border-slate-700 text-slate-300 placeholder:text-slate-600" />
              </div>
              {MEMORY_CATEGORIES.map(cat => {
                const entries = filteredMemory.filter(m => m.category === cat)
                if (!entries.length) return null
                const isOpen = openCategories.has(cat)
                return (
                  <div key={cat} className="border border-slate-800 rounded-lg overflow-hidden">
                    <button onClick={() => toggleCategory(cat)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-800/40 hover:bg-slate-800/70 transition-colors">
                      <span className="text-xs font-semibold text-slate-300">{MEMORY_LABELS[cat]}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">{entries.length} entrées</span>
                        {isOpen ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="divide-y divide-slate-800/60">
                        {entries.map((entry, i) => (
                          <div key={i} className="px-3 py-2">
                            <p className="text-[10px] font-semibold text-slate-400 mb-0.5">{entry.key}</p>
                            <p className="text-xs text-slate-300 leading-snug">{entry.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* TAB 5 — Gamification */}
          {activeTab === "Gamification" && (
            <div className="flex flex-col gap-4">
              {/* Level + streak */}
              <div className="flex items-center gap-4">
                <div className={cn("w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-2xl font-black text-white", pole.avatar)}>
                  {agent.level}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-100">Niveau {agent.level}</p>
                  <p className="text-xs text-slate-400 mb-2">{agent.xp.toLocaleString("fr-FR")} / {agent.xpNext.toLocaleString("fr-FR")} XP</p>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", pole.avatar.split(" ")[0].replace("from-", "bg-"))}
                      style={{ width: `${xpPct}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-2">
                <Flame size={16} className="text-orange-400" />
                <span className="text-sm font-bold text-slate-100">{agent.streak} jours</span>
                <span className="text-xs text-slate-400">de streak actif</span>
              </div>
              {/* Badges */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Badges</p>
                <div className="grid grid-cols-3 gap-2">
                  {agent.badges.map(badge => (
                    <div key={badge.id}
                      className={cn("flex flex-col items-center gap-1 p-2.5 rounded-lg border text-center",
                        badge.earned ? "bg-slate-800/60 border-slate-700" : "bg-slate-900 border-slate-800 opacity-40"
                      )}>
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-base",
                        badge.earned ? "bg-yellow-500/20 text-yellow-400" : "bg-slate-800 text-slate-600")}>
                        ★
                      </div>
                      <p className="text-[10px] font-medium text-slate-300 leading-tight">{badge.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
