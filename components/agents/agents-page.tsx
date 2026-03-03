"use client"

import { useState, useMemo, useEffect } from "react"
import { Bot, Search, Grid3X3, GitBranch, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { AgentCard } from "./agent-card"
import { AgentDetailSheet } from "./agent-detail-sheet"
import { AgentOrgChart } from "./agent-org-chart"
import type { Agent, Pole, AgentStatus, AarrrPhase } from "@/lib/agents-data"
import { POLE_COLORS } from "@/lib/agents-data"
import { getAgents } from "@/lib/supabase/queries"

const POLES: (Pole | "ALL")[] = ["ALL", "ACQ", "SYS", "GRO", "SUP", "OPS", "GOV"]
const STATUSES: (AgentStatus | "ALL")[] = ["ALL", "idle", "working", "error"]
const PHASES: (AarrrPhase | "ALL")[] = ["ALL", "Acquisition", "Activation", "Retention", "Referral", "Revenue"]

export function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [view, setView] = useState<"grid" | "org">("grid")
  const [search, setSearch] = useState("")
  const [poleFilter, setPoleFilter] = useState<Pole | "ALL">("ALL")
  const [statusFilter, setStatusFilter] = useState<AgentStatus | "ALL">("ALL")
  const [phaseFilter, setPhaseFilter] = useState<AarrrPhase | "ALL">("ALL")

  useEffect(() => {
    async function fetchAgents() {
      try {
        const data = await getAgents()
        setAgents(data)
      } catch (err) {
        console.error("Failed to fetch agents:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchAgents()
  }, [])

  const filtered = useMemo(() => {
    return agents.filter(a => {
      if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.role.toLowerCase().includes(search.toLowerCase())) return false
      if (poleFilter !== "ALL" && a.pole !== poleFilter) return false
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false
      if (phaseFilter !== "ALL" && a.phase !== phaseFilter) return false
      return true
    })
  }, [agents, search, poleFilter, statusFilter, phaseFilter])

  const toggleAgent = (id: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a))
  }

  const activeCount = agents.filter(a => a.status === "working").length
  const errorCount = agents.filter(a => a.status === "error").length

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
            <Bot size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-50">Agents</h1>
            <p className="text-xs text-slate-500">
              {agents.length} agents · 6 pôles · Framework AARRR ·{" "}
              <span className="text-blue-400">{activeCount} actifs</span>
              {errorCount > 0 && <span className="text-red-400"> · {errorCount} en erreur</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <Button size="sm" variant="ghost" className={cn("h-7 gap-1.5 text-xs px-3", view === "grid" ? "bg-slate-700 text-slate-100" : "text-slate-500 hover:text-slate-300")} onClick={() => setView("grid")}>
            <Grid3X3 size={13} /> Grille
          </Button>
          <Button size="sm" variant="ghost" className={cn("h-7 gap-1.5 text-xs px-3", view === "org" ? "bg-slate-700 text-slate-100" : "text-slate-500 hover:text-slate-300")} onClick={() => setView("org")}>
            <GitBranch size={13} /> Organigramme
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-52">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher un agent..." className="h-8 pl-8 text-xs bg-slate-900 border-slate-700 text-slate-300 placeholder:text-slate-600" />
        </div>
        {/* Pole chips */}
        <div className="flex items-center gap-1 flex-wrap">
          {POLES.map(p => {
            const active = poleFilter === p
            const color = p !== "ALL" ? POLE_COLORS[p as Pole] : null
            return (
              <button key={p} onClick={() => setPoleFilter(p as Pole | "ALL")} className={cn(
                "text-xs px-2.5 py-1 rounded-full border font-medium transition-colors",
                active ? color ? cn(color.bg, color.text, color.border) : "bg-slate-700 text-slate-200 border-slate-600" : "bg-slate-800/60 text-slate-500 border-slate-700 hover:text-slate-300"
              )}>
                {p === "ALL" ? "Tous" : p}
              </button>
            )
          })}
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as AgentStatus | "ALL")}>
          <SelectTrigger className="h-8 w-32 text-xs bg-slate-900 border-slate-700 text-slate-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
            <SelectItem value="ALL" className="text-xs">Tous statuts</SelectItem>
            <SelectItem value="idle" className="text-xs">Inactif</SelectItem>
            <SelectItem value="working" className="text-xs">En cours</SelectItem>
            <SelectItem value="error" className="text-xs">Erreur</SelectItem>
          </SelectContent>
        </Select>
        <Select value={phaseFilter} onValueChange={v => setPhaseFilter(v as AarrrPhase | "ALL")}>
          <SelectTrigger className="h-8 w-36 text-xs bg-slate-900 border-slate-700 text-slate-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
            <SelectItem value="ALL" className="text-xs">Toutes phases</SelectItem>
            {PHASES.filter(p => p !== "ALL").map(p => (
              <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-slate-600 ml-auto">{filtered.length} résultat{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={32} className="text-blue-400 animate-spin" />
          <p className="text-sm text-slate-500">Chargement des agents...</p>
        </div>
      ) : view === "org" ? (
        <AgentOrgChart agents={filtered} onSelectAgent={setSelectedAgent} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {filtered.map(agent => (
            <AgentCard key={agent.id} agent={agent} onView={setSelectedAgent} onToggle={toggleAgent} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3">
              <Bot size={32} className="text-slate-700" />
              <p className="text-sm text-slate-500">Aucun agent ne correspond aux filtres.</p>
            </div>
          )}
        </div>
      )}

      {/* Detail sheet */}
      <AgentDetailSheet agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
    </div>
  )
}
