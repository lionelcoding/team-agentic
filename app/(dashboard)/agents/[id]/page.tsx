"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Bot, Power, PowerOff, RotateCcw, Loader2,
  FileText, Clock, Play, ToggleLeft, ToggleRight,
  Save, Terminal, Tag, Brain, Hash, AlertCircle, CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useGatewayCommand } from "@/hooks/useGatewayCommand"
import type { AgentStatus, Persona } from "@/lib/agents-data"
import { getTagColor } from "@/lib/agents-data"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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

interface WorkspaceFile {
  filename: string
  size: number
  modified: string
}

interface CronJob {
  id: string
  name: string
  description?: string
  schedule: { expr: string; tz?: string; kind?: string }
  enabled: boolean
  agentId?: string
  state?: {
    lastStatus?: string
    lastRunAtMs?: number
    nextRunAtMs?: number
    lastRunStatus?: string
    consecutiveErrors?: number
  }
}

const statusConfig: Record<string, { color: string; label: string; pulse: boolean }> = {
  idle: { color: "bg-emerald-400", label: "Disponible", pulse: false },
  working: { color: "bg-yellow-400", label: "En cours", pulse: true },
  error: { color: "bg-red-400", label: "Erreur", pulse: true },
  disabled: { color: "bg-slate-500", label: "Desactive", pulse: false },
  provisioning: { color: "bg-blue-400", label: "Provisioning", pulse: true },
  deleting: { color: "bg-red-600", label: "Suppression", pulse: true },
}

type Tab = "overview" | "files" | "crons"

// ---------------------------------------------------------------------------
// Command button (reused from agents page)
// ---------------------------------------------------------------------------
function CommandButton({
  label, icon: Icon, command, agentId, variant = "default",
}: {
  label: string; icon: React.ElementType; command: string; agentId: string; variant?: "default" | "danger"
}) {
  const { sendCommand, isLoading, status, error } = useGatewayCommand()
  return (
    <button
      onClick={() => sendCommand(command, agentId)}
      disabled={isLoading}
      title={error ? `Erreur: ${error}` : status === "done" ? "Commande envoyee" : label}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50",
        variant === "danger"
          ? "bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20"
          : "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20",
        status === "done" && "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
        status === "error" && "bg-red-500/15 text-red-400 border-red-500/20"
      )}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
      {label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AgentDetailPage() {
  const params = useParams<{ id: string }>()
  const agentId = params.id

  const [agent, setAgent] = useState<DbAgent | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("overview")

  // Fetch agent + realtime
  useEffect(() => {
    const supabase = createClient()

    async function fetch() {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agentId)
        .single()

      if (error) console.error("Error fetching agent:", error)
      setAgent(data)
      setLoading(false)
    }

    fetch()

    const channel = supabase
      .channel(`agent-detail-${agentId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "agents", filter: `id=eq.${agentId}` }, (payload) => {
        setAgent((prev) => prev ? { ...prev, ...(payload.new as DbAgent) } : prev)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [agentId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span className="ml-2 text-sm text-slate-400">Chargement...</span>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="p-6 text-center py-32">
        <Bot className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">Agent introuvable : {agentId}</p>
        <Link href="/agents" className="text-blue-400 text-sm mt-2 inline-block hover:underline">
          Retour aux agents
        </Link>
      </div>
    )
  }

  const cfg = statusConfig[agent.status] || statusConfig.idle

  return (
    <div className="p-6 space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Link href="/agents" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className={cn(
            "w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white shrink-0",
            getTagColor(agent.tags?.[0] || "").avatar
          )}>
            {agent.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{agent.name}</h1>
            <p className="text-sm text-slate-400">{agent.role}</p>
          </div>
          <div className="relative flex items-center gap-1.5 ml-4" title={cfg.label}>
            <span className={cn("block w-2.5 h-2.5 rounded-full", cfg.color)} />
            {cfg.pulse && <span className={cn("absolute w-2.5 h-2.5 rounded-full animate-ping opacity-75", cfg.color)} />}
            <span className="text-xs text-slate-400">{cfg.label}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 w-fit">
        {([
          { id: "overview" as Tab, label: "Vue d'ensemble", icon: Bot },
          { id: "files" as Tab, label: "Fichiers", icon: FileText },
          { id: "crons" as Tab, label: "Crons", icon: Clock },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all",
              tab === t.id
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && <OverviewTab agent={agent} />}
      {tab === "files" && <FilesTab agentId={agentId} />}
      {tab === "crons" && <CronsTab agentId={agentId} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------
function OverviewTab({ agent }: { agent: DbAgent }) {
  return (
    <div className="space-y-6">
      {/* Description */}
      {agent.description && (
        <p className="text-sm text-slate-400">{agent.description}</p>
      )}

      {/* Tags */}
      {agent.tags && agent.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {agent.tags.map((tag) => {
            const colors = getTagColor(tag)
            return (
              <span key={tag} className={cn("text-xs font-medium px-2.5 py-1 rounded-full border", colors.bg, colors.text, colors.border)}>
                <Tag className="w-3 h-3 inline mr-1" />{tag}
              </span>
            )
          })}
        </div>
      )}

      {/* Personas */}
      {agent.personas && agent.personas.length > 0 && (
        <div>
          <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Brain className="w-3.5 h-3.5" /> Personas ({agent.personas.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {agent.personas.map((p) => (
              <span key={p.topic} className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">
                <Hash className="w-3 h-3 inline mr-0.5" />{p.topic.replace("#", "")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Modele", value: agent.model?.split("/").pop() || "—", icon: Terminal },
          { label: "Workspace", value: agent.workspace_path?.split("/").pop() || "—", icon: Terminal },
          { label: "Tokens utilises", value: agent.tokens_used ? `${Math.round(agent.tokens_used / 1000)}K` : "0" },
          { label: "Taches", value: `${agent.tasks_count || 0}${agent.tasks_failed > 0 ? ` (${agent.tasks_failed} err)` : ""}` },
          { label: "Memoire (tokens)", value: agent.memory_size_tokens ? `${Math.round(agent.memory_size_tokens / 1000)}K` : "0" },
          { label: "Notes quotidiennes", value: String(agent.daily_notes_count || 0) },
          { label: "Derniere action", value: agent.last_action || "—" },
          { label: "Derniere activite", value: agent.last_action_at ? new Date(agent.last_action_at).toLocaleString("fr-FR") : "—" },
        ].map((item) => (
          <div key={item.label} className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3">
            <span className="text-xs text-slate-500">{item.label}</span>
            <p className="text-sm text-slate-300 font-medium mt-1 truncate">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Command buttons */}
      <div>
        <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Commandes</h3>
        <div className="flex gap-3">
          <CommandButton label="Wake" icon={Power} command="wake" agentId={agent.id} />
          <CommandButton label="Sleep" icon={PowerOff} command="sleep" agentId={agent.id} />
          <CommandButton label="Restart" icon={RotateCcw} command="restart" agentId={agent.id} variant="danger" />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Files Tab
// ---------------------------------------------------------------------------
function FilesTab({ agentId }: { agentId: string }) {
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [originalContent, setOriginalContent] = useState("")
  const [loadingContent, setLoadingContent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  // Load file list
  useEffect(() => {
    async function fetchFiles() {
      setLoadingFiles(true)
      setError(null)
      try {
        const res = await fetch(`/api/agent-files?agent_id=${agentId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setFiles(data.files || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement")
      }
      setLoadingFiles(false)
    }
    fetchFiles()
  }, [agentId])

  // Load file content
  const loadFile = useCallback(async (filename: string) => {
    setSelectedFile(filename)
    setLoadingContent(true)
    setError(null)
    setSaveStatus("idle")
    try {
      const res = await fetch(`/api/agent-files?agent_id=${agentId}&file=${encodeURIComponent(filename)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setContent(data.content || "")
      setOriginalContent(data.content || "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de lecture")
    }
    setLoadingContent(false)
  }, [agentId])

  // Save file
  const saveFile = useCallback(async () => {
    if (!selectedFile) return
    setSaving(true)
    setSaveStatus("idle")
    try {
      const res = await fetch("/api/agent-files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, file: selectedFile, content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOriginalContent(content)
      setSaveStatus("success")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } catch (err) {
      setSaveStatus("error")
      setError(err instanceof Error ? err.message : "Erreur de sauvegarde")
    }
    setSaving(false)
  }, [agentId, selectedFile, content])

  const hasChanges = content !== originalContent

  return (
    <div className="flex gap-4 min-h-[500px]">
      {/* File list */}
      <div className="w-56 shrink-0 bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 space-y-1">
        <h3 className="text-xs text-slate-500 uppercase tracking-wider px-2 mb-2">Fichiers workspace</h3>
        {loadingFiles ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-xs text-slate-500 px-2">Aucun fichier</p>
        ) : (
          files.map((f) => (
            <button
              key={f.filename}
              onClick={() => loadFile(f.filename)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2",
                selectedFile === f.filename
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                  : "text-slate-300 hover:bg-slate-700/50"
              )}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{f.filename}</span>
            </button>
          ))
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col">
        {!selectedFile ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Selectionnez un fichier pour le visualiser
          </div>
        ) : loadingContent ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="ml-2 text-sm text-slate-400">Chargement de {selectedFile}...</span>
          </div>
        ) : (
          <>
            {/* Editor header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-white">{selectedFile}</span>
                {hasChanges && <span className="text-xs text-yellow-400">(modifie)</span>}
              </div>
              <button
                onClick={saveFile}
                disabled={saving || !hasChanges}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40",
                  saveStatus === "success"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : saveStatus === "error"
                    ? "bg-red-500/15 text-red-400 border border-red-500/20"
                    : "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20"
                )}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                 saveStatus === "success" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                 <Save className="w-3.5 h-3.5" />}
                {saveStatus === "success" ? "Sauvegarde" : "Sauvegarder"}
              </button>
            </div>

            {/* Textarea */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 w-full min-h-[400px] bg-slate-900/80 border border-slate-700/50 rounded-lg p-4 text-sm text-slate-300 font-mono resize-y focus:outline-none focus:border-blue-500/50 leading-relaxed"
              spellCheck={false}
            />
          </>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Crons Tab
// ---------------------------------------------------------------------------
function CronsTab({ agentId }: { agentId: string }) {
  const [crons, setCrons] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [actionStatus, setActionStatus] = useState<Record<string, "success" | "error">>({})

  useEffect(() => {
    async function fetchCrons() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/crons")
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        // Normalize: data may be { crons: [...] } or { output: "..." } or array
        const list = Array.isArray(data) ? data : (data.crons || data.jobs || [])
        setCrons(list)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement")
      }
      setLoading(false)
    }
    fetchCrons()
  }, [])

  const runCron = useCallback(async (cronId: string) => {
    setActionLoading((s) => ({ ...s, [cronId]: true }))
    try {
      const res = await fetch("/api/crons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run", cron_id: cronId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setActionStatus((s) => ({ ...s, [cronId]: "success" }))
      setTimeout(() => setActionStatus((s) => { const n = { ...s }; delete n[cronId]; return n }), 3000)
    } catch {
      setActionStatus((s) => ({ ...s, [cronId]: "error" }))
    }
    setActionLoading((s) => ({ ...s, [cronId]: false }))
  }, [])

  const toggleCron = useCallback(async (cronId: string, enabled: boolean) => {
    setActionLoading((s) => ({ ...s, [`toggle-${cronId}`]: true }))
    try {
      const res = await fetch("/api/crons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", cron_id: cronId, enabled }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setCrons((prev) => prev.map((c) => c.id === cronId ? { ...c, enabled } : c))
    } catch {
      setActionStatus((s) => ({ ...s, [`toggle-${cronId}`]: "error" }))
    }
    setActionLoading((s) => ({ ...s, [`toggle-${cronId}`]: false }))
  }, [])

  // Filter crons relevant to this agent (or show all if none have agentId)
  const filtered = crons.filter((c) => c.agentId === agentId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
        <span className="ml-2 text-sm text-slate-400">Chargement des crons...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        {error}
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16">
        <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Aucun cron pour cet agent</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50">
            <th className="text-left text-xs text-slate-500 uppercase tracking-wider px-4 py-3">Nom</th>
            <th className="text-left text-xs text-slate-500 uppercase tracking-wider px-4 py-3">Schedule</th>
            <th className="text-left text-xs text-slate-500 uppercase tracking-wider px-4 py-3">Dernier run</th>
            <th className="text-left text-xs text-slate-500 uppercase tracking-wider px-4 py-3">Statut</th>
            <th className="text-right text-xs text-slate-500 uppercase tracking-wider px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((cron) => (
            <tr key={cron.id} className="border-b border-slate-700/30 last:border-b-0 hover:bg-slate-700/20 transition-colors">
              <td className="px-4 py-3">
                <div>
                  <span className="text-white font-medium">{cron.name || cron.id}</span>
                  {cron.agentId && (
                    <span className="ml-2 text-[10px] text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">
                      {cron.agentId}
                    </span>
                  )}
                </div>
                {cron.description && (
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">{cron.description}</p>
                )}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-400">{cron.schedule?.expr || "—"}</td>
              <td className="px-4 py-3 text-xs text-slate-400">
                {cron.state?.lastRunAtMs ? new Date(cron.state.lastRunAtMs).toLocaleString("fr-FR") : "—"}
                {cron.state?.lastRunStatus && (
                  <span className={cn("ml-1.5", cron.state.lastRunStatus === "ok" ? "text-emerald-400" : "text-red-400")}>
                    ({cron.state.lastRunStatus})
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                  cron.enabled
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                )}>
                  {cron.enabled ? "Actif" : "Inactif"}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {/* Run now */}
                  <button
                    onClick={() => runCron(cron.id)}
                    disabled={!!actionLoading[cron.id]}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-50",
                      actionStatus[cron.id] === "success"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : actionStatus[cron.id] === "error"
                        ? "bg-red-500/15 text-red-400 border border-red-500/20"
                        : "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20"
                    )}
                  >
                    {actionLoading[cron.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Run
                  </button>

                  {/* Toggle */}
                  <button
                    onClick={() => toggleCron(cron.id, !cron.enabled)}
                    disabled={!!actionLoading[`toggle-${cron.id}`]}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-50 bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600/30"
                  >
                    {actionLoading[`toggle-${cron.id}`] ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : cron.enabled ? (
                      <ToggleRight className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-3.5 h-3.5" />
                    )}
                    {cron.enabled ? "Desactiver" : "Activer"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
