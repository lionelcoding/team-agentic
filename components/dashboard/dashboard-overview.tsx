'use client'

import { OrchestratorStatus } from './orchestrator-status'
import { CostSummary } from './cost-summary'
import { ModelRouting } from './model-routing'
import { AgentConsumptionTable } from './agent-consumption-table'
import { ActivityTimeline } from './activity-timeline'
import { AlertsPanel } from './alerts-panel'

export function DashboardOverview() {
  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 text-balance">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Vue d&apos;ensemble — 6 agents VPS</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-600/10 border border-emerald-700/30 text-emerald-400 text-xs font-medium">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      {/* Row 1 — 3 columns */}
      <section aria-label="Statut operationnel" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <OrchestratorStatus />
        <CostSummary />
        <ModelRouting />
      </section>

      {/* Row 2 — Agent table */}
      <section aria-label="Agents VPS">
        <AgentConsumptionTable />
      </section>

      {/* Row 3 — Timeline + Alerts (60/40) */}
      <section aria-label="Activite et alertes" className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ActivityTimeline />
        </div>
        <div className="lg:col-span-2">
          <AlertsPanel />
        </div>
      </section>
    </div>
  )
}
