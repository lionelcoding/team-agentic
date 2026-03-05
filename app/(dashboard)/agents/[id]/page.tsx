"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Bot, Power, PowerOff, RotateCcw, Loader2,
  FileText, Clock, Play, ToggleLeft, ToggleRight,
  Save, Terminal, Tag, Brain, Hash, AlertCircle, CheckCircle2, Activity,
  Plus, Pencil, Trash2, X,
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

const statusConfig: Record<string, { color: string; label: string; pulse: boolean }> = {
  idle: { color: "bg-emerald-400", label: "Disponible", pulse: false },
  working: { color: "bg-yellow-400", label: "En cours", pulse: true },
  error: { color: "bg-red-400", label: "Erreur", pulse: true },
  disabled: { color: "bg-slate-500", label: "Desactive", pulse: false },
  provisioning: { color: "bg-blue-400", label: "Provisioning", pulse: true },
  deleting: { color: "bg-red-600", label: "Suppression", pulse: true },
}

type Tab = "overview" | "files" | "crons" | "activity"

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
          { id: "activity" as Tab, label: "Activite", icon: Activity },
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
      {tab === "activity" && <ActivityTab agentId={agentId} />}
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
// Crons Tab — reads from cron_schedule DB table + realtime + CRUD
// ---------------------------------------------------------------------------
interface DbCronSchedule {
  id: string
  agent_id: string | null
  cron_expression: string | null
  time_label: string | null
  period: string | null
  task_description: string | null
  gateway_message: string | null
  wake_mode: string | null
  deliver_telegram: boolean
  enabled: boolean
  last_run_at: string | null
  last_result: string | null
  created_at: string
}

interface CronFormData {
  name: string
  schedule_expr: string
  description: string
}

function CronsTab({ agentId }: { agentId: string }) {
  const [crons, setCrons] = useState<DbCronSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [actionStatus, setActionStatus] = useState<Record<string, "success" | "error">>({})

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCron, setEditingCron] = useState<DbCronSchedule | null>(null)
  const [formData, setFormData] = useState<CronFormData>({ name: "", schedule_expr: "", description: "" })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Fetch from cron_schedule table, fallback to API if DB is empty
  useEffect(() => {
    const supabase = createClient()

    async function fetchCrons() {
      setLoading(true)
      setError(null)

      // Try DB first
      const { data, error: fetchErr } = await supabase
        .from("cron_schedule")
        .select("*")
        .eq("agent_id", agentId)
        .order("time_label")

      if (fetchErr) {
        setError(fetchErr.message)
        setLoading(false)
        return
      }

      if (data && data.length > 0) {
        setCrons(data)
        setLoading(false)
        return
      }

      // Fallback: DB empty → fetch from API (OpenClaw via daemon)
      try {
        const res = await fetch("/api/crons")
        const apiData = await res.json()
        if (!res.ok) throw new Error(apiData.error)
        const list = Array.isArray(apiData) ? apiData : (apiData.crons || apiData.jobs || [])
        // Map OpenClaw format → DbCronSchedule shape
        const mapped: DbCronSchedule[] = list
          .filter((c: Record<string, unknown>) => c.agentId === agentId || c.agent_id === agentId)
          .map((c: Record<string, unknown>) => ({
            id: (c.id || c.cronId) as string,
            agent_id: (c.agentId || c.agent_id) as string,
            cron_expression: ((c.schedule as Record<string, string>)?.expr || c.schedule) as string,
            time_label: (c.name || c.id) as string,
            period: null,
            task_description: (c.description || null) as string | null,
            gateway_message: null,
            wake_mode: null,
            deliver_telegram: false,
            enabled: c.enabled !== false,
            last_run_at: (c.state as Record<string, unknown>)?.lastRunAtMs
              ? new Date((c.state as Record<string, number>).lastRunAtMs).toISOString()
              : null,
            last_result: ((c.state as Record<string, unknown>)?.lastRunStatus as string) || null,
            created_at: new Date().toISOString(),
          }))
        setCrons(mapped)
      } catch {
        // Both DB and API empty/failed — just show empty state
        setCrons([])
      }
      setLoading(false)
    }

    fetchCrons()

    // Realtime on cron_schedule filtered by agent_id
    const channel = supabase
      .channel(`crons-${agentId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "cron_schedule",
        filter: `agent_id=eq.${agentId}`,
      }, (payload) => {
        setCrons((prev) => [...prev, payload.new as DbCronSchedule])
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "cron_schedule",
        filter: `agent_id=eq.${agentId}`,
      }, (payload) => {
        setCrons((prev) => prev.map((c) => c.id === (payload.new as DbCronSchedule).id ? payload.new as DbCronSchedule : c))
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "cron_schedule",
      }, (payload) => {
        setCrons((prev) => prev.filter((c) => c.id !== (payload.old as { id: string }).id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [agentId])

  // Run cron
  const runCron = useCallback(async (cron: DbCronSchedule) => {
    const cronId = cron.id
    setActionLoading((s) => ({ ...s, [cron.id]: true }))
    try {
      const res = await fetch("/api/crons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run", cron_id: cronId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setActionStatus((s) => ({ ...s, [cron.id]: "success" }))
      setTimeout(() => setActionStatus((s) => { const n = { ...s }; delete n[cron.id]; return n }), 3000)
    } catch {
      setActionStatus((s) => ({ ...s, [cron.id]: "error" }))
    }
    setActionLoading((s) => ({ ...s, [cron.id]: false }))
  }, [])

  // Toggle cron
  const toggleCron = useCallback(async (cron: DbCronSchedule) => {
    const cronId = cron.id
    const key = `toggle-${cron.id}`
    setActionLoading((s) => ({ ...s, [key]: true }))
    try {
      const res = await fetch("/api/crons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", cron_id: cronId, enabled: !cron.enabled }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
    } catch {
      setActionStatus((s) => ({ ...s, [key]: "error" }))
    }
    setActionLoading((s) => ({ ...s, [key]: false }))
  }, [])

  // Open create modal
  const openCreate = () => {
    setEditingCron(null)
    setFormData({ name: "", schedule_expr: "", description: "" })
    setFormError(null)
    setModalOpen(true)
  }

  // Open edit modal
  const openEdit = (cron: DbCronSchedule) => {
    setEditingCron(cron)
    setFormData({
      name: cron.time_label || "",
      schedule_expr: cron.cron_expression || "",
      description: cron.task_description || "",
    })
    setFormError(null)
    setModalOpen(true)
  }

  // Submit create/edit
  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.schedule_expr.trim()) {
      setFormError("Nom et expression cron requis")
      return
    }
    setFormLoading(true)
    setFormError(null)
    try {
      if (editingCron) {
        const cronId = editingCron.id
        const res = await fetch("/api/crons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            cron_id: cronId,
            name: formData.name,
            schedule_expr: formData.schedule_expr,
            description: formData.description,
          }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
      } else {
        const res = await fetch("/api/crons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            agent_id: agentId,
            name: formData.name,
            schedule_expr: formData.schedule_expr,
            description: formData.description,
          }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
      }
      setModalOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur")
    }
    setFormLoading(false)
  }

  // Delete cron
  const handleDelete = async () => {
    if (!deletingId) return
    const cron = crons.find((c) => c.id === deletingId)
    if (!cron) return
    const cronId = cron.id
    setDeleteLoading(true)
    try {
      const res = await fetch("/api/crons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", cron_id: cronId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setDeletingId(null)
    } catch {
      setActionStatus((s) => ({ ...s, [`delete-${deletingId}`]: "error" }))
    }
    setDeleteLoading(false)
  }

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

  return (
    <div className="space-y-4">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">
          Crons ({crons.length})
        </h3>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Creer un cron
        </button>
      </div>

      {crons.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Aucun cron pour cet agent</p>
        </div>
      ) : (
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
              {crons.map((cron) => (
                <tr key={cron.id} className="border-b border-slate-700/30 last:border-b-0 hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-white font-medium">{cron.time_label || cron.id}</span>
                    {cron.task_description && (
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">{cron.task_description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{cron.cron_expression || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {cron.last_run_at ? new Date(cron.last_run_at).toLocaleString("fr-FR") : "—"}
                    {cron.last_result && (
                      <span className={cn("ml-1.5", cron.last_result === "ok" ? "text-emerald-400" : "text-red-400")}>
                        ({cron.last_result})
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
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Run */}
                      <button
                        onClick={() => runCron(cron)}
                        disabled={!!actionLoading[cron.id]}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-50",
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
                        onClick={() => toggleCron(cron)}
                        disabled={!!actionLoading[`toggle-${cron.id}`]}
                        className="p-1.5 rounded-md text-xs transition-all disabled:opacity-50 bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600/30"
                        title={cron.enabled ? "Desactiver" : "Activer"}
                      >
                        {actionLoading[`toggle-${cron.id}`] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : cron.enabled ? (
                          <ToggleRight className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => openEdit(cron)}
                        className="p-1.5 rounded-md text-xs transition-all bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600/30"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeletingId(cron.id)}
                        className="p-1.5 rounded-md text-xs transition-all bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModalOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editingCron ? "Modifier le cron" : "Creer un cron"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nom</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="daily-report"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Expression cron</label>
                <input
                  type="text"
                  value={formData.schedule_expr}
                  onChange={(e) => setFormData((f) => ({ ...f, schedule_expr: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  placeholder="0 9 * * *"
                />
                <p className="text-[10px] text-slate-500 mt-1">min heure jour mois jour-semaine (ex: 0 9 * * 1-5 = 9h lun-ven)</p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Description (optionnel)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="Rapport quotidien..."
                />
              </div>
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={formLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20 transition-all disabled:opacity-50"
              >
                {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingCron ? "Modifier" : "Creer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeletingId(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white">Supprimer ce cron ?</h3>
            <p className="text-sm text-slate-400">
              Le cron <span className="text-white font-medium">{crons.find((c) => c.id === deletingId)?.time_label || deletingId}</span> sera supprime definitivement.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20 transition-all disabled:opacity-50"
              >
                {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Activity Tab
// ---------------------------------------------------------------------------
const ACTION_TYPE_COLORS: Record<string, string> = {
  toolCall: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  agent_end: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  session_end: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  heartbeat: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  error: "bg-red-500/15 text-red-400 border-red-500/30",
  wake: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  sleep: "bg-slate-500/15 text-slate-400 border-slate-500/30",
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
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

interface AgentAction {
  id: string
  agent_id: string
  action_type: string
  description: string | null
  result: string | null
  tokens_used: number
  cost: number
  model_used: string | null
  created_at: string
}

function ActivityTab({ agentId }: { agentId: string }) {
  const [actions, setActions] = useState<AgentAction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function fetch() {
      const { data, error } = await supabase
        .from("agent_actions")
        .select("id, agent_id, action_type, description, result, tokens_used, cost, model_used, created_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(50)
      if (error) console.error("Error fetching actions:", error)
      setActions(data || [])
      setLoading(false)
    }
    fetch()
  }, [agentId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
        <span className="ml-2 text-sm text-slate-400">Chargement de l'activite...</span>
      </div>
    )
  }

  if (actions.length === 0) {
    return (
      <div className="text-center py-16">
        <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Aucune activite enregistree</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Dernieres actions</h3>
        <span className="text-xs text-slate-500">{actions.length} actions</span>
      </div>
      <div className="overflow-y-auto max-h-[500px] divide-y divide-slate-700/30">
        {actions.map((a) => (
          <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-700/20 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                  ACTION_TYPE_COLORS[a.action_type] || "bg-slate-700 text-slate-400 border-slate-600"
                )}>
                  {a.action_type}
                </span>
                {a.model_used && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    {a.model_used.split("/").pop()}
                  </span>
                )}
                {a.tokens_used > 0 && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    {formatTokens(a.tokens_used)} tok
                  </span>
                )}
                {a.cost > 0 && (
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ${a.cost.toFixed(4)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-snug truncate">
                {a.description || "—"}
              </p>
            </div>
            <span className="text-[10px] text-slate-600 shrink-0 mt-0.5 whitespace-nowrap">
              {timeAgo(a.created_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
