"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Bot, Search, Power, PowerOff, RotateCcw, Loader2, Terminal, Tag, Brain, Hash } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useGatewayCommand } from "@/hooks/useGatewayCommand"
import type { AgentStatus, Persona } from "@/lib/agents-data"
import { getTagColor } from "@/lib/agents-data"

interface DbAgent {
  id: string
  name: string
  role: string
  status: AgentStatus
  enabled: boolean
  model: string | null
  workspace_path: string | null
  personas: Persona[]
  description: string | null
  tags: string[]
  memory_size_tokens: number
  daily_notes_count: number
  tokens_used: number
  tasks_count: number
  tasks_failed: number
  last_action: string | null
  last_action_at: string | null
  created_at: string
}

const statusConfig: Record<string, { color: string; label: string; pulse: boolean }> = {
  idle: { color: "bg-emerald-400", label: "Disponible", pulse: false },
  working: { color: "bg-yellow-400", label: "En cours", pulse: true },
  error: { color: "bg-red-400", label: "Erreur", pulse: true },
  disabled: { color: "bg-slate-500", label: "Desactive", pulse: false },
  provisioning: { color: "bg-blue-400", label: "Provisioning", pulse: true },
  deleting: { color: "bg-red-600", label: "Suppression", pulse: true },
}

function StatusDot({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.idle
  return (
    <div className="relative flex items-center gap-1.5" title={cfg.label}>
      <span className={cn("block w-2.5 h-2.5 rounded-full", cfg.color)} />
      {cfg.pulse && (
        <span className={cn("absolute w-2.5 h-2.5 rounded-full animate-ping opacity-75", cfg.color)} />
      )}
      <span className="text-xs text-slate-400">{cfg.label}</span>
    </div>
  )
}

function CommandButton({
  label,
  icon: Icon,
  command,
  agentId,
  variant = "default",
}: {
  label: string
  icon: React.ElementType
  command: string
  agentId: string
  variant?: "default" | "danger"
}) {
  const { sendCommand, isLoading, status, error } = useGatewayCommand()

  return (
    <button
      onClick={(e) => { e.stopPropagation(); sendCommand(command, agentId) }}
      disabled={isLoading}
      title={error ? `Erreur: ${error}` : status === "done" ? "Commande envoyee" : label}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-50",
        variant === "danger"
          ? "bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20"
          : "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20",
        status === "done" && "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
        status === "error" && "bg-red-500/15 text-red-400 border-red-500/20"
      )}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
      {label}
    </button>
  )
}

export default function AgentsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<DbAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const rawRef = useRef<DbAgent[]>([])

  useEffect(() => {
    const supabase = createClient()

    async function fetch() {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("name")

      if (error) {
        console.error("Error fetching agents:", error)
        setLoading(false)
        return
      }

      rawRef.current = data || []
      setAgents(data || [])
      setLoading(false)
    }

    fetch()

    // Realtime
    const channel = supabase
      .channel("agents-page-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agents" },
        (payload) => {
          rawRef.current = rawRef.current.map((a) =>
            a.id === (payload.new as DbAgent)?.id ? { ...a, ...(payload.new as DbAgent) } : a
          )
          setAgents([...rawRef.current])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase()) ||
      a.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span className="ml-2 text-sm text-slate-400">Chargement des agents...</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="w-7 h-7 text-blue-400" /> Agents
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {agents.length} agents sur le VPS — controle via gateway_commands
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-600/10 border border-emerald-700/30 text-emerald-400 text-xs font-medium">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, role ou tag..."
          className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((agent) => (
          <div
            key={agent.id}
            onClick={() => router.push(`/agents/${agent.id}`)}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-blue-500/30 transition-all cursor-pointer"
          >
            {/* Top: Name + Status */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white shrink-0",
                  getTagColor(agent.tags?.[0] || "").avatar
                )}>
                  {agent.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{agent.name}</h3>
                  <p className="text-xs text-slate-400">{agent.role}</p>
                </div>
              </div>
              <StatusDot status={agent.status} />
            </div>

            {/* Description */}
            {agent.description && (
              <p className="text-xs text-slate-500 mb-3 line-clamp-2">{agent.description}</p>
            )}

            {/* Tags */}
            {agent.tags && agent.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {agent.tags.map((tag) => {
                  const colors = getTagColor(tag)
                  return (
                    <span
                      key={tag}
                      className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", colors.bg, colors.text, colors.border)}
                    >
                      <Tag className="w-2.5 h-2.5 inline mr-0.5" />
                      {tag}
                    </span>
                  )
                })}
              </div>
            )}

            {/* Personas (Morpheus) */}
            {agent.personas && agent.personas.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Brain className="w-3 h-3" /> Personas ({agent.personas.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {agent.personas.map((p) => (
                    <span
                      key={p.topic}
                      className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded"
                    >
                      <Hash className="w-2.5 h-2.5 inline mr-0.5" />
                      {p.topic.replace("#", "")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              <div className="bg-slate-900/50 rounded-lg px-3 py-2">
                <span className="text-slate-500">Modele</span>
                <p className="text-slate-300 font-mono text-[10px] truncate mt-0.5">
                  {agent.model?.split("/").pop() || "—"}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg px-3 py-2">
                <span className="text-slate-500">Workspace</span>
                <p className="text-slate-300 font-mono text-[10px] truncate mt-0.5 flex items-center gap-1">
                  <Terminal className="w-3 h-3 shrink-0" />
                  {agent.workspace_path?.split("/").pop() || "—"}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg px-3 py-2">
                <span className="text-slate-500">Tokens utilises</span>
                <p className="text-slate-300 font-semibold mt-0.5">
                  {agent.tokens_used ? `${Math.round(agent.tokens_used / 1000)}K` : "0"}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg px-3 py-2">
                <span className="text-slate-500">Taches</span>
                <p className="text-slate-300 font-semibold mt-0.5">
                  {agent.tasks_count || 0}
                  {agent.tasks_failed > 0 && (
                    <span className="text-red-400 ml-1">({agent.tasks_failed} err)</span>
                  )}
                </p>
              </div>
            </div>

            {/* Command buttons */}
            <div className="flex gap-2 pt-3 border-t border-slate-700/50">
              <CommandButton
                label="Wake"
                icon={Power}
                command="wake"
                agentId={agent.id}
              />
              <CommandButton
                label="Sleep"
                icon={PowerOff}
                command="sleep"
                agentId={agent.id}
              />
              <CommandButton
                label="Restart"
                icon={RotateCcw}
                command="restart"
                agentId={agent.id}
                variant="danger"
              />
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Bot className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Aucun agent trouve</p>
        </div>
      )}
    </div>
  )
}
