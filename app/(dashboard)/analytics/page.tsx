"use client"

import { useState, useEffect, useMemo } from "react"
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"
import { TrendingUp, Download, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActionRow {
  id: string
  agent_id: string
  action_type: string
  result: string | null
  tokens_used: number
  cost: number
  created_at: string
}

interface CostEntry {
  amount: number
  date: string
}

const tooltip = { contentStyle: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 } }

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9", "#f97316", "#64748b"]
const BAR_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9", "#f97316", "#ec4899"]

// ─── Helper: filter by range ─────────────────────────────────────────────────

function filterByDays(items: { created_at?: string; date?: string }[], days: number) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  return items.filter(i => (i.created_at || i.date || "") >= cutoff)
}

// ─── Charts ──────────────────────────────────────────────────────────────────

function ActionsDonut({ actions }: { actions: ActionRow[] }) {
  const byType: Record<string, number> = {}
  for (const a of actions) {
    byType[a.action_type] = (byType[a.action_type] || 0) + 1
  }
  const data = Object.entries(byType).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Actions par type</h3>
      {data.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">Pas de donnees</p>
      ) : (
        <div className="flex items-center gap-3">
          <ResponsiveContainer width={110} height={110}>
            <PieChart>
              <Pie data={data} cx={50} cy={50} innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            {data.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-[10px] text-slate-400 truncate flex-1">{s.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ActionsPerDay({ actions }: { actions: ActionRow[] }) {
  const byDay: Record<string, number> = {}
  for (const a of actions) {
    const day = a.created_at.substring(0, 10)
    byDay[day] = (byDay[day] || 0) + 1
  }
  const data = Object.entries(byDay).sort().map(([day, count]) => ({
    day: new Date(day).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    count,
  }))

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Actions par jour</h3>
      {data.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">Pas de donnees</p>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltip} />
            <Line type="monotone" dataKey="count" name="Actions" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function ActionsByAgent({ actions }: { actions: ActionRow[] }) {
  const byAgent: Record<string, number> = {}
  for (const a of actions) {
    byAgent[a.agent_id] = (byAgent[a.agent_id] || 0) + 1
  }
  const data = Object.entries(byAgent).sort((a, b) => b[1] - a[1]).map(([agent, count]) => ({ agent, count }))
  const max = data.length > 0 ? data[0].count : 1

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Actions par agent</h3>
      {data.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">Pas de donnees</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {data.map((t, i) => (
            <div key={t.agent} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-20 shrink-0 truncate">{t.agent}</span>
              <div className="flex-1 h-5 bg-slate-800 rounded overflow-hidden relative">
                <div className="h-full rounded transition-all" style={{ width: `${(t.count / max) * 100}%`, background: BAR_COLORS[i % BAR_COLORS.length], opacity: 0.8 }} />
                <span className="absolute right-2 top-0 bottom-0 flex items-center text-[9px] text-slate-400 font-mono">{t.count}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TokensPerDay({ actions }: { actions: ActionRow[] }) {
  const byDay: Record<string, number> = {}
  for (const a of actions) {
    const day = a.created_at.substring(0, 10)
    byDay[day] = (byDay[day] || 0) + (Number(a.tokens_used) || 0)
  }
  const data = Object.entries(byDay).sort().map(([day, tokens]) => ({
    day: new Date(day).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    tokens,
  }))

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Tokens par jour</h3>
      {data.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">Pas de donnees</p>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="tokGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
            <Tooltip {...tooltip} formatter={(v: number) => [v.toLocaleString("fr-FR"), "Tokens"]} />
            <Area type="monotone" dataKey="tokens" stroke="#3b82f6" strokeWidth={2} fill="url(#tokGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function CostPerDay({ costEntries }: { costEntries: CostEntry[] }) {
  const byDay: Record<string, number> = {}
  for (const e of costEntries) {
    byDay[e.date] = (byDay[e.date] || 0) + Number(e.amount)
  }
  const data = Object.entries(byDay).sort().map(([day, cost]) => ({
    day: new Date(day).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    cost: Math.round(cost * 10000) / 10000,
  }))

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Cout par jour (cost_entries)</h3>
      {data.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">Pas de donnees</p>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} barSize={12} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip {...tooltip} formatter={(v: number) => [`$${v.toFixed(4)}`, "Cout"]} />
            <Bar dataKey="cost" name="Cout" fill="#ef4444" opacity={0.8} radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function ErrorRates({ actions }: { actions: ActionRow[] }) {
  const agentStats: Record<string, { success: number; failure: number }> = {}
  for (const a of actions) {
    if (!agentStats[a.agent_id]) agentStats[a.agent_id] = { success: 0, failure: 0 }
    if (a.result === "failure" || a.result === "error") {
      agentStats[a.agent_id].failure += 1
    } else {
      agentStats[a.agent_id].success += 1
    }
  }

  const data = Object.entries(agentStats).map(([agent, s]) => ({
    agent,
    total: s.success + s.failure,
    errorRate: s.failure / (s.success + s.failure) * 100,
    successRate: s.success / (s.success + s.failure) * 100,
  })).sort((a, b) => b.errorRate - a.errorRate)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Taux d'erreur par agent</h3>
      {data.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">Pas de donnees</p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map(c => (
            <div key={c.agent} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">{c.agent}</span>
                <span className={cn("text-xs font-bold font-mono", c.errorRate > 10 ? "text-red-400" : "text-emerald-400")}>
                  {c.errorRate.toFixed(1)}% err
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${c.successRate}%` }} />
                <div className="h-full bg-red-500 transition-all" style={{ width: `${c.errorRate}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Summary table ───────────────────────────────────────────────────────────

function SummaryTable({ actions, costEntries }: { actions: ActionRow[]; costEntries: CostEntry[] }) {
  // Group by week (ISO week)
  function getWeek(dateStr: string): string {
    const d = new Date(dateStr)
    const jan1 = new Date(d.getFullYear(), 0, 1)
    const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
    return `S${weekNum}`
  }

  const weekMap: Record<string, { actions: number; tokens: number; cost: number }> = {}
  for (const a of actions) {
    const w = getWeek(a.created_at)
    if (!weekMap[w]) weekMap[w] = { actions: 0, tokens: 0, cost: 0 }
    weekMap[w].actions += 1
    weekMap[w].tokens += Number(a.tokens_used) || 0
    weekMap[w].cost += Number(a.cost) || 0
  }

  // Also add cost_entries costs
  for (const e of costEntries) {
    const w = getWeek(e.date)
    if (!weekMap[w]) weekMap[w] = { actions: 0, tokens: 0, cost: 0 }
    // cost_entries are separate from action costs, show as additive
  }

  const weeks = Object.entries(weekMap).sort().map(([week, v]) => ({ week, ...v }))
  const totals = weeks.reduce((acc, d) => ({
    actions: acc.actions + d.actions,
    tokens: acc.tokens + d.tokens,
    cost: acc.cost + d.cost,
  }), { actions: 0, tokens: 0, cost: 0 })

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          Recapitulatif hebdomadaire
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              {["Semaine", "Actions", "Tokens", "Cout"].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {weeks.map(d => (
              <tr key={d.week} className="hover:bg-slate-800/20 transition-colors">
                <td className="px-4 py-2 text-sm text-slate-400 font-mono">{d.week}</td>
                <td className="px-4 py-2 text-sm text-slate-300 font-mono">{d.actions}</td>
                <td className="px-4 py-2 text-sm text-slate-300 font-mono">{d.tokens.toLocaleString("fr-FR")}</td>
                <td className="px-4 py-2 text-sm text-emerald-400 font-mono">${d.cost.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-700 bg-slate-800/40">
              <td className="px-4 py-2.5 text-sm font-bold text-slate-200">Total</td>
              <td className="px-4 py-2.5 text-sm font-bold text-slate-100 font-mono">{totals.actions}</td>
              <td className="px-4 py-2.5 text-sm font-bold text-slate-100 font-mono">{totals.tokens.toLocaleString("fr-FR")}</td>
              <td className="px-4 py-2.5 text-sm font-bold text-emerald-300 font-mono">${totals.cost.toFixed(4)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

function exportCSV(actions: ActionRow[]) {
  const header = "id,agent_id,action_type,result,tokens_used,cost,created_at"
  const rows = actions.map(a => `${a.id},${a.agent_id},${a.action_type},${a.result || ""},${a.tokens_used},${a.cost},${a.created_at}`)
  const csv = [header, ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "analytics_export.csv"
  link.click()
  URL.revokeObjectURL(url)
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [range, setRange] = useState<7 | 30 | 90>(30)
  const [loading, setLoading] = useState(true)
  const [allActions, setAllActions] = useState<ActionRow[]>([])
  const [allCosts, setAllCosts] = useState<CostEntry[]>([])

  useEffect(() => {
    const supabase = createClient()
    async function fetchData() {
      const [actionsRes, costsRes] = await Promise.all([
        supabase.from("agent_actions").select("id, agent_id, action_type, result, tokens_used, cost, created_at").order("created_at", { ascending: false }),
        supabase.from("cost_entries").select("amount, date").order("date", { ascending: false }),
      ])
      if (actionsRes.error) console.error("Error fetching actions:", actionsRes.error)
      if (costsRes.error) console.error("Error fetching costs:", costsRes.error)
      setAllActions(actionsRes.data || [])
      setAllCosts(costsRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const actions = useMemo(() => filterByDays(allActions, range) as ActionRow[], [allActions, range])
  const costs = useMemo(() => filterByDays(allCosts.map(c => ({ ...c, created_at: c.date })), range).map(c => c as unknown as CostEntry), [allCosts, range])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span className="ml-2 text-sm text-slate-400">Chargement...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">Activite des agents — {actions.length} actions sur {range}j</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            {([7, 30, 90] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={cn("text-xs px-3 py-1.5 rounded-md transition-colors whitespace-nowrap",
                  range === r ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300")}>
                {r}j
              </button>
            ))}
          </div>
          <button
            onClick={() => exportCSV(actions)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Actions totales", value: actions.length.toLocaleString("fr-FR") },
          { label: "Tokens totaux", value: actions.reduce((s, a) => s + (Number(a.tokens_used) || 0), 0).toLocaleString("fr-FR") },
          { label: "Cout total (actions)", value: `$${actions.reduce((s, a) => s + (Number(a.cost) || 0), 0).toFixed(4)}` },
          { label: "Agents actifs", value: String(new Set(actions.map(a => a.agent_id)).size) },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-xl font-bold text-slate-100 mt-1 font-mono">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ActionsDonut actions={actions} />
        <ActionsPerDay actions={actions} />
        <ActionsByAgent actions={actions} />
        <TokensPerDay actions={actions} />
        <CostPerDay costEntries={costs} />
        <ErrorRates actions={actions} />
      </div>

      <SummaryTable actions={actions} costEntries={costs} />
    </div>
  )
}
