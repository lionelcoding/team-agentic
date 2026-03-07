"use client"

import { useState } from "react"
import {
  X, ExternalLink, ClipboardList, MessageSquare, BarChart3,
  Clock, Play, Pause, CheckCheck, AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import ProjectPlanTab from "./project-plan-tab"
import ProjectDiscussionTab, { useMessageCount } from "./project-discussion-tab"
import ProjectResultsTab from "./project-results-tab"

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

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; Icon: typeof Clock }> = {
  draft:      { label: "Brouillon",  color: "text-slate-400",   Icon: Clock },
  validating: { label: "Validation", color: "text-amber-400",   Icon: Clock },
  running:    { label: "En cours",   color: "text-blue-400",    Icon: Play },
  completed:  { label: "Terminé",    color: "text-emerald-400", Icon: CheckCheck },
  failed:     { label: "Échoué",     color: "text-red-400",     Icon: AlertTriangle },
  paused:     { label: "Pausé",      color: "text-orange-400",  Icon: Pause },
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

type Tab = 'plan' | 'discussion' | 'results'

function getNextStatuses(status: ProjectStatus, hasPlan: boolean): { status: ProjectStatus; label: string }[] {
  switch (status) {
    case 'draft':
      if (!hasPlan) return []
      return [{ status: 'running', label: 'Valider le plan' }]
    case 'validating':
      return [{ status: 'running', label: 'Démarrer' }, { status: 'draft', label: 'Retour brouillon' }]
    case 'running':
      return [{ status: 'completed', label: 'Terminer' }, { status: 'failed', label: 'Échoué' }, { status: 'paused', label: 'Pause' }]
    case 'paused':
      return [{ status: 'running', label: 'Reprendre' }, { status: 'failed', label: 'Échoué' }]
    case 'completed':
    case 'failed':
      return [{ status: 'draft', label: 'Ré-ouvrir' }]
    default:
      return []
  }
}

export default function ProjectDetailModal({ project, onClose, onStatusChange }: {
  project: Project
  onClose: () => void
  onStatusChange: (id: string, status: ProjectStatus) => void
}) {
  const [activeTab, setActiveTab] = useState<Tab>('plan')
  const messageCount = useMessageCount(project.id)

  const priority = PRIORITY_STYLES[project.priority || "normal"] || PRIORITY_STYLES.normal
  const statusCfg = STATUS_CONFIG[project.status]
  const StatusIcon = statusCfg.Icon

  const hasPlan = !!(project.objective || (project.steps && project.steps.length > 0) || (project.success_metrics && project.success_metrics.length > 0))
  const nextStatuses = getNextStatuses(project.status, hasPlan)

  const handleValidatePlan = () => {
    onStatusChange(project.id, 'running')
  }

  const handleRequestChanges = () => {
    setActiveTab('discussion')
  }

  const tabs: { id: Tab; label: string; Icon: typeof ClipboardList; badge?: number }[] = [
    { id: 'plan', label: 'Plan', Icon: ClipboardList },
    { id: 'discussion', label: 'Discussion', Icon: MessageSquare, badge: messageCount },
    { id: 'results', label: 'Résultats', Icon: BarChart3 },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-slate-800">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <StatusIcon className={cn("w-4 h-4", statusCfg.color)} />
                <span className={cn("text-xs font-medium", statusCfg.color)}>{statusCfg.label}</span>
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", priority.cls)}>{priority.label}</span>
              </div>
              <h2 className="text-base font-bold text-slate-100 leading-tight">{project.name}</h2>
              {project.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{project.description}</p>
              )}
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 ml-3">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Agent + meta */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {project.assigned_agent && (
              <div className="flex items-center gap-1.5">
                <span className={cn("w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center", AGENT_COLORS[project.assigned_agent] || "bg-slate-600")}>
                  {project.assigned_agent.slice(0, 2).toUpperCase()}
                </span>
                <span>{project.assigned_agent}</span>
              </div>
            )}
            <span>· {relTime(project.created_at)}</span>
            {project.related_signal_id && (
              <a href="/signal" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                <ExternalLink className="w-3 h-3" /> signal
              </a>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3 -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-400 bg-slate-800/40"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                )}
              >
                <tab.Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === 'plan' && (
            <ProjectPlanTab
              project={project}
              onValidate={handleValidatePlan}
              onRequestChanges={handleRequestChanges}
            />
          )}
          {activeTab === 'discussion' && (
            <ProjectDiscussionTab projectId={project.id} />
          )}
          {activeTab === 'results' && (
            <ProjectResultsTab project={project} />
          )}
        </div>

        {/* Bottom actions (for non-draft or when plan tab not visible) */}
        {activeTab !== 'plan' && nextStatuses.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-800 flex flex-wrap gap-2">
            {nextStatuses.map(ns => (
              <button
                key={ns.status}
                onClick={() => onStatusChange(project.id, ns.status)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                {ns.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
