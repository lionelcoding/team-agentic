"use client"

import { cn } from "@/lib/utils"
import { FileText, ExternalLink, CheckCircle, XCircle } from "lucide-react"

interface SuccessMetric {
  name: string
  baseline: string | number
  target: string | number
  actual: string | number | null
  type: 'quanti' | 'quali'
}

interface Project {
  id: string
  status: string
  results: Record<string, unknown> | null
  artifact_content: string | null
  artifact_path: string | null
  success_metrics: SuccessMetric[] | null
}

function renderMarkdownLite(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-slate-200 mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-slate-100 mt-4 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-slate-50 mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-200">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-slate-300">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-slate-300">$2</li>')
    .replace(/\n\n/g, '<br/><br/>')
}

function isMetricMet(metric: SuccessMetric): boolean | null {
  if (metric.actual === null || metric.actual === undefined) return null
  if (metric.type === 'quali') return true
  const target = Number(metric.target)
  const actual = Number(metric.actual)
  if (isNaN(target) || isNaN(actual)) return null
  return actual >= target
}

function computeGap(metric: SuccessMetric): string {
  if (metric.actual === null || metric.actual === undefined) return "—"
  const target = Number(metric.target)
  const actual = Number(metric.actual)
  if (isNaN(target) || isNaN(actual)) return "—"
  const gap = actual - target
  if (gap === 0) return "0"
  return gap > 0 ? `+${gap}` : String(gap)
}

export default function ProjectResultsTab({ project }: { project: Project }) {
  const isTerminal = project.status === 'completed' || project.status === 'failed'
  const metrics = project.success_metrics || []
  const hasActuals = metrics.some(m => m.actual !== null && m.actual !== undefined)
  const result = project.results as Record<string, unknown> | null

  if (!isTerminal && !project.artifact_content && !hasActuals) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <FileText className="w-8 h-8 mb-3 opacity-40" />
        <p className="text-sm">Pas encore de résultats.</p>
        <p className="text-xs mt-1 text-slate-600">Les résultats seront visibles une fois le projet terminé.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary from results */}
      {result && (result.summary as string) && (
        <div className="bg-slate-800/60 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Résumé</p>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{result.summary as string}</p>
        </div>
      )}

      {/* Artifact / Deliverable */}
      {project.artifact_content && (
        <div className="bg-slate-800/60 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide flex items-center gap-1">
              <FileText className="w-3 h-3" /> Livrable
            </p>
            {project.artifact_path && (
              <span className="text-[10px] text-slate-600 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> {project.artifact_path}
              </span>
            )}
          </div>
          <div
            className="text-sm text-slate-300 prose-sm max-h-[300px] overflow-y-auto whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: renderMarkdownLite(project.artifact_content) }}
          />
        </div>
      )}

      {/* Post-mortem: metrics table with actuals */}
      {hasActuals && (
        <div className="bg-slate-800/60 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Post-mortem — Métriques</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700">
                  <th className="text-left py-1 pr-2">Nom</th>
                  <th className="text-left py-1 pr-2">Baseline</th>
                  <th className="text-left py-1 pr-2">Cible</th>
                  <th className="text-left py-1 pr-2">Réel</th>
                  <th className="text-left py-1 pr-2">Écart</th>
                  <th className="text-left py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, i) => {
                  const met = isMetricMet(m)
                  const gap = computeGap(m)
                  return (
                    <tr key={i} className="border-b border-slate-800/50">
                      <td className="py-1.5 pr-2 text-slate-300 font-medium">{m.name}</td>
                      <td className="py-1.5 pr-2 text-slate-400">{String(m.baseline)}</td>
                      <td className="py-1.5 pr-2 text-slate-400">{String(m.target)}</td>
                      <td className="py-1.5 pr-2 text-slate-200 font-medium">{m.actual !== null ? String(m.actual) : "—"}</td>
                      <td className={cn("py-1.5 pr-2 font-medium",
                        gap.startsWith('+') ? "text-emerald-400" : gap.startsWith('-') ? "text-red-400" : "text-slate-400"
                      )}>{gap}</td>
                      <td className="py-1.5">
                        {met === null ? (
                          <span className="text-slate-600">—</span>
                        ) : met ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
