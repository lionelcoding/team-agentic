"use client"

import { useState, useEffect } from "react"
import {
  TrendingDown, TrendingUp, DollarSign, Target, Zap, CheckCircle2, ChevronDown, ChevronUp, Loader2,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, CartesianGrid,
} from "recharts"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

// ─── Types ───────────────────────────────────────────────────────────────────

interface CostEntry {
  id: string
  agent_id: string | null
  category: string
  amount: number
  date: string
}

interface ActionRow {
  agent_id: string
  tokens_used: number
  cost: number
}

interface AgentRow {
  id: string
  name: string
  model: string | null
  tags: string[]
}

interface AgentCost {
  id: string
  name: string
  model: string
  tokens: number
  cost: number
  pct: number
  actions: number
  costPerAction: number
  tags: string[]
}

// ─── Suggestions (mock — no data source) ─────────────────────────────────────

const SUGGESTIONS = [
  {
    id: "haiku", title: "Migrer heartbeats vers Haiku",
    saving: "-$67/mois", desc: "Les taches heartbeat utilisent des modeles couteux. Migrer vers Haiku reduit le cout de 82% pour ces taches repetitives.",
    effort: "Faible", impact: "Eleve",
  },
  {
    id: "cache", title: "Activer le prompt caching",
    saving: "-$45/mois", desc: "Les system prompts des agents sont reconstruits a chaque appel. Le Prompt Caching reduirait les tokens input de ~60%.",
    effort: "Faible", impact: "Moyen",
  },
  {
    id: "batch", title: "Batch API pour enrichissement",
    saving: "-$23/mois", desc: "Regrouper les appels en batches de 20 active le -50% batch discount.",
    effort: "Moyen", impact: "Moyen",
  },
]

// ─── Summary cards ───────────────────────────────────────────────────────────

function SummaryCards({ costEntries }: { costEntries: CostEntry[] }) {
  const now = new Date()
  const todayStr = now.toISOString().split("T")[0]
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  let dailySpend = 0
  let monthlySpent = 0
  for (const e of costEntries) {
    if (e.date === todayStr) dailySpend += Number(e.amount)
    if (e.date >= monthStart) monthlySpent += Number(e.amount)
  }

  const monthlyBudget = 500
  const budgetPct = monthlyBudget > 0 ? Math.round((monthlySpent / monthlyBudget) * 100) : 0
  const projection = dayOfMonth > 0 ? (monthlySpent / dayOfMonth) * daysInMonth : 0
  const trend = dailySpend > 0 ? ((dailySpend - (monthlySpent / Math.max(dayOfMonth, 1))) / Math.max(monthlySpent / Math.max(dayOfMonth, 1), 0.01) * 100) : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Today */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="p-2 bg-blue-600/15 rounded-lg"><DollarSign className="w-4 h-4 text-blue-400" /></div>
          {trend !== 0 && (
            <span className={cn("flex items-center gap-1 text-xs font-medium", trend > 0 ? "text-red-400" : "text-emerald-400")}>
              {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend > 0 ? "+" : ""}{trend.toFixed(0)}%
            </span>
          )}
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-100">${dailySpend.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Depense aujourd'hui</p>
        </div>
      </div>

      {/* Monthly budget */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="p-2 bg-green-600/15 rounded-lg"><Target className="w-4 h-4 text-green-400" /></div>
          <span className="text-xs font-medium text-slate-400">{budgetPct}%</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-100">${monthlySpent.toFixed(0)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Budget mensuel / ${monthlyBudget}</p>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", budgetPct > 80 ? "bg-red-500" : budgetPct > 60 ? "bg-yellow-500" : "bg-emerald-500")} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
        </div>
      </div>

      {/* Projection */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="p-2 bg-purple-600/15 rounded-lg"><Zap className="w-4 h-4 text-purple-400" /></div>
        </div>
        <div>
          <p className={cn("text-2xl font-bold", projection > monthlyBudget ? "text-red-400" : "text-slate-100")}>${projection.toFixed(0)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Projection fin de mois</p>
        </div>
      </div>

      {/* ROI — kept as mock */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="p-2 bg-amber-600/15 rounded-lg"><TrendingUp className="w-4 h-4 text-amber-400" /></div>
          <span className="text-xs font-medium text-slate-500">mock</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-100">—</p>
          <p className="text-xs text-slate-500 mt-0.5">ROI estime</p>
        </div>
        <p className="text-[10px] text-slate-600">Pas de donnees leads/revenue</p>
      </div>
    </div>
  )
}

// ─── Agent table ─────────────────────────────────────────────────────────────

function AgentTable({ agentCosts }: { agentCosts: AgentCost[] }) {
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc")
  const sorted = [...agentCosts].sort((a, b) => sortDir === "desc" ? b.cost - a.cost : a.cost - b.cost)
  const total = agentCosts.reduce((acc, a) => ({
    tokens: acc.tokens + a.tokens,
    cost: acc.cost + a.cost,
    actions: acc.actions + a.actions,
  }), { tokens: 0, cost: 0, actions: 0 })

  if (agentCosts.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-sm text-slate-500">
        Aucune donnee d'agent
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-slate-200">Couts par agent</h2>
        <button onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
          Trier {sortDir === "desc" ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              {["Agent", "Modele", "Tokens", "Cout", "% total", "Actions", "$/action"].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {sorted.map(a => (
              <tr key={a.id} className={cn("hover:bg-slate-800/30 transition-colors", a.pct >= 20 && "border-l-2 border-amber-500/50")}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0">
                      {a.name.slice(0,2).toUpperCase()}
                    </span>
                    <p className="text-sm font-medium text-slate-200">{a.name}</p>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span className="font-mono text-xs text-slate-400">{a.model || "—"}</span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{a.tokens.toLocaleString("fr-FR")}</td>
                <td className="px-4 py-2.5">
                  <span className={cn("font-mono text-sm font-semibold", a.pct >= 20 ? "text-amber-400" : "text-slate-200")}>
                    ${a.cost.toFixed(4)}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", a.pct >= 20 ? "bg-amber-500" : "bg-blue-500")} style={{ width: `${Math.min(a.pct, 100)}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 font-mono w-10">{a.pct.toFixed(1)}%</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{a.actions}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-400">${a.costPerAction.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-700 bg-slate-800/30">
              <td className="px-4 py-2.5 text-sm font-bold text-slate-200">Total</td>
              <td />
              <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-300">{total.tokens.toLocaleString("fr-FR")}</td>
              <td className="px-4 py-2.5 font-mono text-sm font-bold text-slate-100">${total.cost.toFixed(4)}</td>
              <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-300">100%</td>
              <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-300">{total.actions}</td>
              <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-300">${total.actions > 0 ? (total.cost / total.actions).toFixed(4) : "0"}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Charts row ──────────────────────────────────────────────────────────────

function ChartsRow({ costEntries }: { costEntries: CostEntry[] }) {
  // Group by month + category
  const monthMap: Record<string, Record<string, number>> = {}
  for (const e of costEntries) {
    const month = e.date.substring(0, 7) // "YYYY-MM"
    if (!monthMap[month]) monthMap[month] = {}
    const cat = e.category || "other"
    monthMap[month][cat] = (monthMap[month][cat] || 0) + Number(e.amount)
  }

  const months = Object.keys(monthMap).sort()
  const allCategories = [...new Set(costEntries.map(e => e.category || "other"))]
  const COLORS: Record<string, string> = {
    api_tokens: "#3b82f6",
    hosting: "#22c55e",
    tools: "#8b5cf6",
    fixed: "#334155",
  }

  const chartData = months.map(m => {
    const label = new Date(m + "-15").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
    const row: Record<string, string | number> = { month: label }
    for (const cat of allCategories) {
      row[cat] = Math.round((monthMap[m][cat] || 0) * 10000) / 10000
    }
    return row
  })

  const inputCls = "w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
  const [mrr, setMrr] = useState("12450")
  const [cost, setCost] = useState("556")
  const [leads, setLeads] = useState("234")
  const [churn, setChurn] = useState("3")

  const mrrN = parseFloat(mrr) || 0
  const costN = parseFloat(cost) || 1
  const leadsN = parseFloat(leads) || 1
  const churnN = parseFloat(churn) || 1

  const cac = costN / leadsN
  const ltv = (mrrN / leadsN) / (churnN / 100)
  const ltvCac = ltv / cac
  const roi = ((mrrN * 12 - costN * 12) / (costN * 12)) * 100
  const payback = cac / (mrrN / leadsN)

  const gaugeAngle = Math.min((roi / 500) * 180, 180)
  const x = 80 + 65 * Math.cos(((gaugeAngle - 180) * Math.PI) / 180)
  const y = 80 + 65 * Math.sin(((gaugeAngle - 180) * Math.PI) / 180)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Stacked bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Couts par categorie — par mois</h2>
        {chartData.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">Pas de donnees</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number, name: string) => [`$${v.toFixed(4)}`, name]}
              />
              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
              {allCategories.map((cat, i) => (
                <Bar key={cat} dataKey={cat} name={cat} stackId="a" fill={COLORS[cat] || `hsl(${i * 60}, 60%, 50%)`} radius={i === allCategories.length - 1 ? [3,3,0,0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ROI Calculator */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-slate-200">Calculateur ROI</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">MRR total ($)</label>
            <input className={inputCls} value={mrr} onChange={e => setMrr(e.target.value)} type="number" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Cout mensuel ($)</label>
            <input className={inputCls} value={cost} onChange={e => setCost(e.target.value)} type="number" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Leads convertis</label>
            <input className={inputCls} value={leads} onChange={e => setLeads(e.target.value)} type="number" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Churn mensuel (%)</label>
            <input className={inputCls} value={churn} onChange={e => setChurn(e.target.value)} type="number" />
          </div>
        </div>

        <div className="flex items-start gap-4">
          <svg width="160" height="90" viewBox="0 0 160 90" className="shrink-0">
            <path d="M 15 80 A 65 65 0 0 1 145 80" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
            <path d={`M 15 80 A 65 65 0 0 1 ${x} ${y}`} fill="none"
              stroke={roi > 200 ? "#22c55e" : roi > 100 ? "#f59e0b" : "#ef4444"}
              strokeWidth="12" strokeLinecap="round" />
            <text x="80" y="72" textAnchor="middle" className="font-bold" style={{ fill: "#f1f5f9", fontSize: 18, fontWeight: 700 }}>
              {Math.round(roi)}%
            </text>
            <text x="80" y="86" textAnchor="middle" style={{ fill: "#64748b", fontSize: 10 }}>ROI</text>
          </svg>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 flex-1">
            {[
              { label: "LTV", value: `$${ltv.toFixed(0)}` },
              { label: "CAC", value: `$${cac.toFixed(0)}` },
              { label: "LTV:CAC", value: `${ltvCac.toFixed(1)}x` },
              { label: "Payback", value: `${payback.toFixed(1)}m` },
            ].map(m => (
              <div key={m.label}>
                <p className="text-[10px] text-slate-600">{m.label}</p>
                <p className="text-sm font-bold text-slate-200 font-mono">{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Suggestions ─────────────────────────────────────────────────────────────

function Suggestions() {
  const [applied, setApplied] = useState<Set<string>>(new Set())

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-200 mb-3">Optimisations suggerees</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SUGGESTIONS.map(s => (
          <div key={s.id} className={cn(
            "bg-slate-900 border rounded-lg p-4 flex flex-col gap-3 transition-colors",
            applied.has(s.id) ? "border-emerald-700/50 bg-emerald-900/10" : "border-slate-800 hover:border-slate-700",
          )}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-200 leading-snug">{s.title}</p>
              <span className="text-lg font-bold text-emerald-400 whitespace-nowrap shrink-0">{s.saving}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed flex-1">{s.desc}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">Effort: {s.effort}</span>
              <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">Impact: {s.impact}</span>
              <button
                onClick={() => setApplied(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n })}
                className={cn(
                  "ml-auto flex items-center gap-1.5 text-xs px-3 py-1 rounded transition-colors",
                  applied.has(s.id)
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-700/40"
                    : "bg-blue-600 hover:bg-blue-500 text-white",
                )}
              >
                {applied.has(s.id) && <CheckCircle2 className="w-3 h-3" />}
                {applied.has(s.id) ? "Applique" : "Appliquer"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CostsPage() {
  const [loading, setLoading] = useState(true)
  const [costEntries, setCostEntries] = useState<CostEntry[]>([])
  const [agentCosts, setAgentCosts] = useState<AgentCost[]>([])

  useEffect(() => {
    const supabase = createClient()
    async function fetchData() {
      // Fetch cost_entries, agent_actions aggregates, and agents in parallel
      const [costsRes, actionsRes, agentsRes] = await Promise.all([
        supabase.from("cost_entries").select("id, agent_id, category, amount, date").order("date", { ascending: false }),
        supabase.from("agent_actions").select("agent_id, tokens_used, cost"),
        supabase.from("agents").select("id, name, model, tags"),
      ])

      if (costsRes.error) console.error("Error fetching costs:", costsRes.error)
      if (actionsRes.error) console.error("Error fetching actions:", actionsRes.error)
      if (agentsRes.error) console.error("Error fetching agents:", agentsRes.error)

      const costs: CostEntry[] = costsRes.data || []
      const actions: ActionRow[] = actionsRes.data || []
      const agents: AgentRow[] = agentsRes.data || []

      setCostEntries(costs)

      // Aggregate actions by agent
      const agentMap: Record<string, { tokens: number; cost: number; actions: number }> = {}
      for (const a of actions) {
        if (!a.agent_id) continue
        if (!agentMap[a.agent_id]) agentMap[a.agent_id] = { tokens: 0, cost: 0, actions: 0 }
        agentMap[a.agent_id].tokens += Number(a.tokens_used) || 0
        agentMap[a.agent_id].cost += Number(a.cost) || 0
        agentMap[a.agent_id].actions += 1
      }

      const totalCost = Object.values(agentMap).reduce((s, v) => s + v.cost, 0)
      const agentLookup: Record<string, AgentRow> = {}
      for (const ag of agents) agentLookup[ag.id] = ag

      const result: AgentCost[] = Object.entries(agentMap)
        .map(([id, v]) => ({
          id,
          name: agentLookup[id]?.name || id,
          model: agentLookup[id]?.model || "—",
          tokens: v.tokens,
          cost: v.cost,
          pct: totalCost > 0 ? (v.cost / totalCost) * 100 : 0,
          actions: v.actions,
          costPerAction: v.actions > 0 ? v.cost / v.actions : 0,
          tags: agentLookup[id]?.tags || [],
        }))
        .sort((a, b) => b.cost - a.cost)

      setAgentCosts(result)
      setLoading(false)
    }
    fetchData()
  }, [])

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
          <h1 className="text-2xl font-bold text-slate-50">Couts &amp; ROI</h1>
          <p className="text-sm text-slate-400 mt-0.5">Suivi des depenses API et retour sur investissement</p>
        </div>
        <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg transition-colors">
          Export CSV
        </button>
      </div>

      <SummaryCards costEntries={costEntries} />
      <AgentTable agentCosts={agentCosts} />
      <ChartsRow costEntries={costEntries} />
      <Suggestions />
    </div>
  )
}
