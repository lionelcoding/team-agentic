"use client"

import { cn } from "@/lib/utils"
import { CheckSquare, Square, AlertTriangle, Wrench, Target, Calendar } from "lucide-react"

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
  status: string
  objective: string | null
  success_metrics: SuccessMetric[] | null
  steps: ProjectStep[] | null
  complexity: 'simple' | 'moyen' | 'complexe' | null
  deadline: string | null
  tools_resources: string[] | null
  risks: string[] | null
  okr: string | null
}

const COMPLEXITY_STYLES: Record<string, { label: string; cls: string }> = {
  simple:   { label: "Simple",   cls: "bg-emerald-600/20 text-emerald-400 border-emerald-700/40" },
  moyen:    { label: "Moyen",    cls: "bg-amber-600/20 text-amber-400 border-amber-700/40" },
  complexe: { label: "Complexe", cls: "bg-red-600/20 text-red-400 border-red-700/40" },
}

function normalizePlanFromRaw(raw: string): Partial<Project> | null {
  try {
    const parsed = JSON.parse(raw)
    const plan = (typeof parsed.plan === 'object' && parsed.plan !== null ? parsed.plan : parsed) as Record<string, unknown>

    const result: Partial<Project> = {}

    result.objective = (plan.objective || plan.topic || plan.title || plan.description || plan.summary) as string | null

    if (Array.isArray(plan.steps)) {
      result.steps = plan.steps as ProjectStep[]
    } else if (Array.isArray(plan.actions)) {
      result.steps = (plan.actions as Record<string, unknown>[]).map(a => ({
        label: (a.step || a.label || a.description || JSON.stringify(a)) as string,
        done: false,
      }))
    }

    if (plan.complexity) result.complexity = plan.complexity as Project['complexity']
    else if (plan.relevance) {
      const relMap: Record<string, 'simple' | 'moyen' | 'complexe'> = { high: 'complexe', medium: 'moyen', low: 'simple' }
      result.complexity = relMap[plan.relevance as string] || 'moyen'
    }

    if (Array.isArray(plan.success_metrics)) result.success_metrics = plan.success_metrics as SuccessMetric[]
    if (Array.isArray(plan.risks)) result.risks = plan.risks as string[]
    else if (plan.notes) result.risks = [plan.notes as string]
    if (Array.isArray(plan.tools_resources)) result.tools_resources = plan.tools_resources as string[]
    else if (Array.isArray(plan.tools)) result.tools_resources = plan.tools as string[]
    if (plan.okr) result.okr = plan.okr as string
    else if (plan.qualification) result.okr = plan.qualification as string
    if (plan.deadline) result.deadline = plan.deadline as string

    return result
  } catch {
    return null
  }
}

function hasPlanFields(project: Project): boolean {
  return !!(project.objective || (project.steps && project.steps.length > 0) || (project.success_metrics && project.success_metrics.length > 0))
}

export default function ProjectPlanTab({
  project,
  rawPlanContent,
  onValidate,
  onRequestChanges,
}: {
  project: Project
  rawPlanContent?: string | null
  onValidate: () => void
  onRequestChanges: () => void
}) {
  // Use project fields if populated, otherwise try to extract from raw message
  const hasFields = hasPlanFields(project)
  const rawPlan = !hasFields && rawPlanContent ? normalizePlanFromRaw(rawPlanContent) : null
  const planReceived = hasFields || !!rawPlan
  const isDraft = project.status === 'draft'

  // Merge: prefer project DB fields, fallback to raw extraction
  const displayProject = rawPlan && !hasFields ? { ...project, ...rawPlan } : project

  if (!planReceived) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <Target className="w-8 h-8 mb-3 opacity-40" />
        <p className="text-sm font-medium">En attente du plan agent...</p>
        <p className="text-xs mt-1 text-slate-600">L'agent analyse le signal et proposera un plan structuré.</p>
      </div>
    )
  }

  const complexity = displayProject.complexity ? COMPLEXITY_STYLES[displayProject.complexity] : null
  const metrics = displayProject.success_metrics || []
  const steps = displayProject.steps || []
  const tools = displayProject.tools_resources || []
  const risks = displayProject.risks || []

  return (
    <div className="flex flex-col gap-4">
      {/* Objective */}
      {displayProject.objective && (
        <div className="bg-slate-800/60 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Objectif</p>
          <p className="text-sm text-slate-200">{displayProject.objective}</p>
        </div>
      )}

      {/* Complexity + Deadline + OKR row */}
      <div className="grid grid-cols-2 gap-3">
        {complexity && (
          <div className="bg-slate-800/60 rounded-lg p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Complexité</p>
            <span className={cn("inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border", complexity.cls)}>
              {complexity.label}
            </span>
          </div>
        )}
        {displayProject.deadline && (
          <div className="bg-slate-800/60 rounded-lg p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Deadline</p>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-sm text-slate-200">
                {new Date(displayProject.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        )}
      </div>

      {displayProject.okr && (
        <div className="bg-slate-800/60 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">OKR</p>
          <p className="text-sm text-slate-200">{displayProject.okr}</p>
        </div>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <div className="bg-slate-800/60 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Étapes</p>
          <div className="flex flex-col gap-1.5">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                {step.done ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                )}
                <span className={cn("text-sm", step.done ? "text-slate-500 line-through" : "text-slate-300")}>
                  {step.label}
                </span>
                {step.agent && (
                  <span className="text-[10px] text-slate-600 ml-auto shrink-0">@{step.agent}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success metrics */}
      {metrics.length > 0 && (
        <div className="bg-slate-800/60 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Métriques de succès</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700">
                  <th className="text-left py-1 pr-3">Nom</th>
                  <th className="text-left py-1 pr-3">Baseline</th>
                  <th className="text-left py-1 pr-3">Cible</th>
                  <th className="text-left py-1">Type</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    <td className="py-1.5 pr-3 text-slate-300 font-medium">{m.name}</td>
                    <td className="py-1.5 pr-3 text-slate-400">{String(m.baseline)}</td>
                    <td className="py-1.5 pr-3 text-slate-400">{String(m.target)}</td>
                    <td className="py-1.5 text-slate-500">{m.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tools */}
      {tools.length > 0 && (
        <div className="bg-slate-800/60 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">
            <Wrench className="w-3 h-3 inline mr-1" />Outils / Ressources
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tools.map((t, i) => (
              <span key={i} className="text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">
                {typeof t === 'string' ? t : JSON.stringify(t)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-3">
          <p className="text-[10px] text-red-400 uppercase tracking-wide mb-2">
            <AlertTriangle className="w-3 h-3 inline mr-1" />Risques
          </p>
          <ul className="flex flex-col gap-1">
            {risks.map((r, i) => (
              <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                <span className="text-red-500 mt-0.5">•</span>
                {typeof r === 'string' ? r : (r as Record<string, unknown>).description as string || JSON.stringify(r)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {isDraft && planReceived && (
        <div className="flex gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onValidate}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            Valider le plan
          </button>
          <button
            onClick={onRequestChanges}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Demander des modifications
          </button>
        </div>
      )}
    </div>
  )
}
