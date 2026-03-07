"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  FolderKanban, LayoutGrid, Table2, Loader2,
  ChevronRight, Clock, CheckCheck, AlertTriangle, Play, Pause,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import ProjectDetailModal from "@/components/projects/project-detail-modal"

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectStatus = "draft" | "validating" | "running" | "completed" | "failed" | "paused"

interface SuccessMetric {
  name: string
  baseline: string | number
  target: string | number
  actual: string | number | null
  type: 'quanti' | 'quali'
}

interface ProjectStep {
  label: string
  done: boolean
  agent?: string
}

interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  assigned_agent: string | null
  related_signal_id: string | null
  related_handover_id: string | null
  category: string | null
  priority: string | null
  results: Record<string, unknown> | null
  started_at: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  objective: string | null
  success_metrics: SuccessMetric[] | null
  steps: ProjectStep[] | null
  complexity: 'simple' | 'moyen' | 'complexe' | null
  deadline: string | null
  tools_resources: string[] | null
  risks: string[] | null
  okr: string | null
  artifact_content: string | null
  artifact_path: string | null
}

interface Column {
  id: ProjectStatus
  label: string
  color: string
  dotColor: string
  Icon: typeof Clock
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: Column[] = [
  { id: "draft",      label: "Brouillon",    color: "text-slate-400",   dotColor: "bg-slate-500",   Icon: Clock },
  { id: "validating", label: "Validation",   color: "text-amber-400",   dotColor: "bg-amber-500",   Icon: Clock },
  { id: "running",    label: "En cours",     color: "text-blue-400",    dotColor: "bg-blue-500",    Icon: Play },
  { id: "completed",  label: "Terminé",      color: "text-emerald-400", dotColor: "bg-emerald-500", Icon: CheckCheck },
  { id: "failed",     label: "Échoué",       color: "text-red-400",     dotColor: "bg-red-500",     Icon: AlertTriangle },
  { id: "paused",     label: "Pausé",        color: "text-orange-400",  dotColor: "bg-orange-500",  Icon: Pause },
]

const AGENT_COLORS: Record<string, string> = {
  monitor: "bg-purple-600", research: "bg-blue-600", architect: "bg-indigo-600",
  outbound: "bg-green-600", tam: "bg-orange-600", main: "bg-slate-600",
}

const PRIORITY_STYLES: Record<string, { label: string; cls: string }> = {
  urgent: { label: "URGENT", cls: "text-red-400 bg-red-600/20 border-red-700/40" },
  high:   { label: "HIGH",   cls: "text-orange-400 bg-orange-600/20 border-orange-700/40" },
  normal: { label: "NORMAL", cls: "text-blue-400 bg-blue-600/20 border-blue-700/40" },
  low:    { label: "LOW",    cls: "text-slate-400 bg-slate-700/40 border-slate-700/40" },
}

const CATEGORY_STYLES: Record<string, { label: string; cls: string }> = {
  knowledge:       { label: "Knowledge", cls: "text-emerald-400" },
  strategy:        { label: "Strategy",  cls: "text-amber-400" },
  outbound_inbound:{ label: "Outbound",  cls: "text-blue-400" },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

// ─── Project Detail Modal (imported from components/projects/project-detail-modal) ────

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, onClick, onDragStart }: {
  project: Project
  onClick: () => void
  onDragStart: (id: string) => void
}) {
  const priority = PRIORITY_STYLES[project.priority || "normal"] || PRIORITY_STYLES.normal
  const category = CATEGORY_STYLES[project.category || "knowledge"] || CATEGORY_STYLES.knowledge

  return (
    <div
      draggable
      onDragStart={() => onDragStart(project.id)}
      onClick={onClick}
      className="bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md hover:shadow-black/20 active:opacity-70 group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-slate-100 leading-tight line-clamp-2">{project.name}</p>
        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0", priority.cls)}>
          {priority.label}
        </span>
      </div>

      {project.description && (
        <p className="text-xs text-slate-500 mb-2 line-clamp-2">{project.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {project.assigned_agent && (
            <>
              <span className={cn("inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] font-bold", AGENT_COLORS[project.assigned_agent] || "bg-slate-600")}>
                {project.assigned_agent.slice(0, 2).toUpperCase()}
              </span>
              <span className="text-[10px] text-slate-600">{project.assigned_agent}</span>
            </>
          )}
        </div>
        <span className="text-[10px] text-slate-600">{relTime(project.created_at)}</span>
      </div>

      <div className="flex items-center gap-1.5 mt-2">
        <span className={cn("text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity", category.cls)}>{category.label}</span>
        {project.related_signal_id && (
          <span className="text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">· signal</span>
        )}
        {project.objective && project.status === 'draft' && (
          <span className="ml-auto text-[9px] font-bold text-emerald-400 bg-emerald-600/20 border border-emerald-700/30 px-1.5 py-0.5 rounded">
            Plan proposé
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Table View ───────────────────────────────────────────────────────────────

function ProjectTableView({ projects, onProjectClick }: { projects: Project[]; onProjectClick: (p: Project) => void }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              {["Projet", "Agent", "Catégorie", "Priorité", "Statut", "Créé"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {projects.map(p => {
              const col = COLUMNS.find(c => c.id === p.status)
              const priority = PRIORITY_STYLES[p.priority || "normal"] || PRIORITY_STYLES.normal
              const category = CATEGORY_STYLES[p.category || "knowledge"] || CATEGORY_STYLES.knowledge
              return (
                <tr key={p.id} onClick={() => onProjectClick(p)} className="hover:bg-slate-800/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-100 max-w-[300px] truncate">{p.name}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{p.assigned_agent || "—"}</td>
                  <td className="px-4 py-3"><span className={cn("text-xs font-medium", category.cls)}>{category.label}</span></td>
                  <td className="px-4 py-3"><span className={cn("text-xs font-bold px-1.5 py-0.5 rounded border", priority.cls)}>{priority.label}</span></td>
                  <td className="px-4 py-3"><span className={cn("text-xs font-medium", col?.color)}>{col?.label}</span></td>
                  <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{relTime(p.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"kanban" | "table">("kanban")
  const [filterAgent, setFilterAgent] = useState("all")
  const [filterCategory, setFilterCategory] = useState("all")
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<ProjectStatus | null>(null)
  const [detailProject, setDetailProject] = useState<Project | null>(null)

  const fetchProjects = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (err) {
      console.error("Failed to fetch projects:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("projects-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => fetchProjects())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchProjects])

  const agents = useMemo(() => {
    const names = new Set<string>()
    projects.forEach(p => { if (p.assigned_agent) names.add(p.assigned_agent) })
    return Array.from(names).sort()
  }, [projects])

  const filtered = useMemo(() => projects.filter(p => {
    if (filterAgent !== "all" && p.assigned_agent !== filterAgent) return false
    if (filterCategory !== "all" && p.category !== filterCategory) return false
    return true
  }), [projects, filterAgent, filterCategory])

  const columnData = useMemo(() => {
    return COLUMNS.map(col => ({
      ...col,
      projects: filtered.filter(p => p.status === col.id),
    }))
  }, [filtered])

  const handleStatusChange = async (id: string, status: ProjectStatus) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error("Failed to update project:", err)
      }
      setDetailProject(null)
    } catch (err) {
      console.error("Failed to update project:", err)
    }
  }

  function handleDrop(targetStatus: ProjectStatus) {
    if (!dragId) return
    handleStatusChange(dragId, targetStatus)
    setDragId(null)
    setDragOver(null)
  }

  const totalProjects = filtered.length
  const running = filtered.filter(p => p.status === "running").length
  const completed = filtered.filter(p => p.status === "completed").length

  const selCls = "bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 size={32} className="text-blue-400 animate-spin" />
        <p className="text-sm text-slate-500">Chargement des projets...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <FolderKanban size={18} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-50 leading-tight">Projets</h1>
            <p className="text-xs text-slate-500">
              Suivi des tâches post-dispatch · {totalProjects} projet{totalProjects !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setView("kanban")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                view === "kanban" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200")}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
            <button
              onClick={() => setView("table")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                view === "table" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200")}
            >
              <Table2 className="w-3.5 h-3.5" /> Tableau
            </button>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 flex items-center gap-3">
          <FolderKanban className="w-4 h-4 text-slate-300 shrink-0" />
          <div>
            <p className="text-base font-bold text-slate-300">{totalProjects}</p>
            <p className="text-[11px] text-slate-600">Total</p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 flex items-center gap-3">
          <Play className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <p className="text-base font-bold text-blue-400">{running}</p>
            <p className="text-[11px] text-slate-600">En cours</p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 flex items-center gap-3">
          <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <p className="text-base font-bold text-emerald-400">{completed}</p>
            <p className="text-[11px] text-slate-600">Terminés</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center flex-wrap gap-2">
        <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)} className={selCls}>
          <option value="all">Agent : tous</option>
          {agents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={selCls}>
          <option value="all">Catégorie : toutes</option>
          {Object.entries(CATEGORY_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {(filterAgent !== "all" || filterCategory !== "all") && (
          <button
            onClick={() => { setFilterAgent("all"); setFilterCategory("all") }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Views */}
      {view === "table" ? (
        <ProjectTableView projects={filtered} onProjectClick={setDetailProject} />
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {columnData.map(col => (
              <div
                key={col.id}
                className={cn(
                  "w-64 flex flex-col rounded-xl border transition-colors",
                  dragOver === col.id ? "border-blue-600/60 bg-blue-600/5" : "border-slate-800 bg-slate-900/50"
                )}
                onDragOver={e => { e.preventDefault(); setDragOver(col.id) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(col.id)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", col.dotColor)} />
                    <span className={cn("text-sm font-semibold", col.color)}>{col.label}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                    {col.projects.length}
                  </span>
                </div>
                {/* Cards */}
                <div className="flex flex-col gap-2 p-3 min-h-[150px]">
                  {col.projects.map(p => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      onClick={() => setDetailProject(p)}
                      onDragStart={setDragId}
                    />
                  ))}
                  {col.projects.length === 0 && (
                    <div className="flex flex-col items-center justify-center flex-1 py-8 text-slate-700 border-2 border-dashed border-slate-800 rounded-lg">
                      <ChevronRight className="w-5 h-5 mb-1 opacity-40" />
                      <p className="text-xs">Déposer ici</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {detailProject && (
        <ProjectDetailModal
          project={detailProject}
          onClose={() => setDetailProject(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
