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

function hasPlan(project: Project): boolean {
  return !!(project.objective || (project.steps && project.steps.length > 0) || (project.success_metrics && project.success_metrics.length > 0))
}

export default function ProjectPlanTab({
  project,
  onValidate,
  onRequestChanges,
}: {
  project: Project
  onValidate: () => void
  onRequestChanges: () => void
}) {
  const planReceived = hasPlan(project)
  const isDraft = project.status === 'draft'

  if (!planReceived) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <Target className="w-8 h-8 mb-3 opacity-40" />
        <p className="text-sm font-medium">En attente du plan agent...</p>
        <p className="text-xs mt-1 text-slate-600">L'agent analyse le signal et proposera un plan structuré.</p>
      </div>
    )
  }

  const complexity = project.complexity ? COMPLEXITY_STYLES[project.complexity] : null
  const metrics = project.success_metrics || []
  const steps = project.steps || []
  const tools = project.tools_resources || []
  const risks = project.risks || []

  return (
    <div className="flex flex-col gap-4">
      {/* Objective */}
      {project.objective && (
        <div className="bg-slate-800/60 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Objectif</p>
          <p className="text-sm text-slate-200">{project.objective}</p>
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
        {project.deadline && (
          <div className="bg-slate-800/60 rounded-lg p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Deadline</p>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-sm text-slate-200">
                {new Date(project.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        )}
      </div>

      {project.okr && (
        <div className="bg-slate-800/60 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">OKR</p>
          <p className="text-sm text-slate-200">{project.okr}</p>
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
