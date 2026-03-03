"use client"

import { useState } from "react"
import {
  TrendingDown, TrendingUp, DollarSign, Target, Zap, CheckCircle2, ChevronDown, ChevronUp,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, CartesianGrid, Cell,
} from "recharts"
import { cn } from "@/lib/utils"

// ─── Mock data ────────────────────────────────────────────────────────────────

const POLE_BG: Record<string, string> = {
  ACQ: "bg-blue-600",   SYS: "bg-purple-600", GRO: "bg-green-600",
  SUP: "bg-red-600",    OPS: "bg-orange-600",  GOV: "bg-slate-600",
}

interface AgentCost {
  id: string; name: string; pole: string; model: string
  tokensIn: number; tokensOut: number; cost: number
  pct: number; actions: number; costPerAction: number
}

const AGENT_COSTS: AgentCost[] = [
  { id:"victor",  name:"Victor",  pole:"SYS", model:"claude-opus-4-6",   tokensIn:45200, tokensOut:12800, cost:8.50, pct:36.2, actions:203, costPerAction:0.042 },
  { id:"iris",    name:"Iris",    pole:"ACQ", model:"claude-sonnet-4-5", tokensIn:28100, tokensOut:9400,  cost:3.20, pct:13.6, actions:87,  costPerAction:0.037 },
  { id:"hugo",    name:"Hugo",    pole:"ACQ", model:"claude-haiku-4-5",  tokensIn:62400, tokensOut:18200, cost:2.80, pct:11.9, actions:312, costPerAction:0.009 },
  { id:"simon",   name:"Simon",   pole:"ACQ", model:"claude-sonnet-4-5", tokensIn:19800, tokensOut:7200,  cost:2.10, pct:8.9,  actions:94,  costPerAction:0.022 },
  { id:"alice",   name:"Alice",   pole:"GRO", model:"claude-sonnet-4-5", tokensIn:16500, tokensOut:6800,  cost:1.90, pct:8.1,  actions:78,  costPerAction:0.024 },
  { id:"diane",   name:"Diane",   pole:"ACQ", model:"claude-sonnet-4-5", tokensIn:14200, tokensOut:4800,  cost:1.40, pct:5.9,  actions:156, costPerAction:0.009 },
  { id:"sophie",  name:"Sophie",  pole:"SYS", model:"claude-haiku-4-5",  tokensIn:18900, tokensOut:5200,  cost:0.90, pct:3.8,  actions:67,  costPerAction:0.013 },
  { id:"thomas",  name:"Thomas",  pole:"GRO", model:"claude-haiku-4-5",  tokensIn:12100, tokensOut:3800,  cost:0.65, pct:2.8,  actions:43,  costPerAction:0.015 },
  { id:"clara",   name:"Clara",   pole:"GOV", model:"claude-haiku-4-5",  tokensIn:9800,  tokensOut:2900,  cost:0.45, pct:1.9,  actions:28,  costPerAction:0.016 },
  { id:"margaux", name:"Margaux", pole:"GRO", model:"claude-haiku-4-5",  tokensIn:7200,  tokensOut:2100,  cost:0.35, pct:1.5,  actions:32,  costPerAction:0.011 },
  { id:"nathan",  name:"Nathan",  pole:"SYS", model:"claude-haiku-4-5",  tokensIn:6800,  tokensOut:1900,  cost:0.30, pct:1.3,  actions:19,  costPerAction:0.016 },
  { id:"yann",    name:"Yann",    pole:"GRO", model:"claude-haiku-4-5",  tokensIn:5400,  tokensOut:1600,  cost:0.25, pct:1.1,  actions:24,  costPerAction:0.010 },
  { id:"lea",     name:"Léa",     pole:"SUP", model:"claude-haiku-4-5",  tokensIn:4200,  tokensOut:1200,  cost:0.18, pct:0.8,  actions:15,  costPerAction:0.012 },
  { id:"paul",    name:"Paul",    pole:"SUP", model:"claude-haiku-4-5",  tokensIn:3800,  tokensOut:1000,  cost:0.15, pct:0.6,  actions:12,  costPerAction:0.012 },
  { id:"camille", name:"Camille", pole:"OPS", model:"claude-haiku-4-5",  tokensIn:2900,  tokensOut:800,   cost:0.11, pct:0.5,  actions:8,   costPerAction:0.014 },
  { id:"jules",   name:"Jules",   pole:"OPS", model:"claude-haiku-4-5",  tokensIn:2100,  tokensOut:600,   cost:0.08, pct:0.3,  actions:6,   costPerAction:0.013 },
]

const TOTAL_COST = AGENT_COSTS.reduce((s, a) => s + a.cost, 0) // 23.32

const STACKED_DATA = [
  { month: "Oct", fixed: 142, anthropic: 145, tools: 48 },
  { month: "Nov", fixed: 145, anthropic: 162, tools: 52 },
  { month: "Déc", fixed: 145, anthropic: 178, tools: 55 },
  { month: "Jan", fixed: 148, anthropic: 195, tools: 58 },
  { month: "Fév", fixed: 148, anthropic: 210, tools: 62 },
  { month: "Mar", fixed: 148, anthropic: 223, tools: 65 },
]

const SUGGESTIONS = [
  {
    id: "haiku", title: "Migrer heartbeats vers Haiku",
    saving: "−€67/mois", desc: "Les tâches heartbeat des 16 agents utilisent Sonnet. Migrer vers Haiku réduit le coût de 82% pour ces tâches répétitives.",
    effort: "Faible", impact: "Élevé",
  },
  {
    id: "cache", title: "Activer le prompt caching",
    saving: "−€45/mois", desc: "Les system prompts des agents sont reconstruits à chaque appel. Anthropic Prompt Caching réduirait les tokens input de ~60% sur les tâches répétitives.",
    effort: "Faible", impact: "Moyen",
  },
  {
    id: "batch", title: "Batch API pour enrichissement",
    saving: "−€23/mois", desc: "Simon (enrichissement) fait des appels unitaires. Regrouper en batches de 20 leads active le -50% batch discount Anthropic.",
    effort: "Moyen", impact: "Moyen",
  },
]

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards() {
  const sparkData = [4.2, 5.8, 3.1, 6.4, 5.2, 7.8, 9.1]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Today */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="p-2 bg-blue-600/15 rounded-lg"><DollarSign className="w-4 h-4 text-blue-400" /></div>
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
            <TrendingUp className="w-3 h-3" />+12%
          </span>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-100">€23.45</p>
          <p className="text-xs text-slate-500 mt-0.5">Dépense aujourd'hui</p>
        </div>
        <p className="text-[10px] text-slate-600">+€2.52 vs hier (€20.93)</p>
      </div>

      {/* Monthly budget */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="p-2 bg-green-600/15 rounded-lg"><Target className="w-4 h-4 text-green-400" /></div>
          <span className="text-xs font-medium text-slate-400">46%</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-100">€556</p>
          <p className="text-xs text-slate-500 mt-0.5">Budget mensuel / €1,200</p>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: "46%" }} />
        </div>
      </div>

      {/* Cost/lead */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="p-2 bg-purple-600/15 rounded-lg"><Zap className="w-4 h-4 text-purple-400" /></div>
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
            <TrendingDown className="w-3 h-3" />−8%
          </span>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-100">€4.52</p>
          <p className="text-xs text-slate-500 mt-0.5">Coût par lead</p>
        </div>
        <p className="text-[10px] text-slate-600">↓ Tendance positive (−8% sem.)</p>
      </div>

      {/* ROI sparkline */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="p-2 bg-amber-600/15 rounded-lg"><TrendingUp className="w-4 h-4 text-amber-400" /></div>
          <span className="text-xs font-medium text-emerald-400">+18pts</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-100">342%</p>
          <p className="text-xs text-slate-500 mt-0.5">ROI estimé</p>
        </div>
        <ResponsiveContainer width="100%" height={28}>
          <AreaChart data={sparkData.map((v, i) => ({ v, i }))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Area type="monotone" dataKey="v" stroke="#f59e0b" fill="#f59e0b22" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Agent table ──────────────────────────────────────────────────────────────

function AgentTable() {
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc")
  const sorted = [...AGENT_COSTS].sort((a, b) => sortDir === "desc" ? b.cost - a.cost : a.cost - b.cost)
  const total = AGENT_COSTS.reduce((acc, a) => ({
    tokensIn: acc.tokensIn + a.tokensIn,
    tokensOut: acc.tokensOut + a.tokensOut,
    cost: acc.cost + a.cost,
    actions: acc.actions + a.actions,
  }), { tokensIn: 0, tokensOut: 0, cost: 0, actions: 0 })

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-slate-200">Coûts par agent — Aujourd'hui</h2>
        <button onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
          Trier {sortDir === "desc" ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              {["Agent", "Modèle", "Tokens in", "Tokens out", "Coût", "% budget", "Actions", "€/action"].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {sorted.map(a => (
              <tr key={a.id} className={cn("hover:bg-slate-800/30 transition-colors", a.pct >= 10 && "border-l-2 border-amber-500/50")}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold shrink-0", POLE_BG[a.pole])}>
                      {a.name.slice(0,2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{a.name}</p>
                      <p className="text-[10px] text-slate-600">{a.pole}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span className="font-mono text-xs text-slate-400">{a.model.replace("claude-","")}</span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{a.tokensIn.toLocaleString("fr-FR")}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{a.tokensOut.toLocaleString("fr-FR")}</td>
                <td className="px-4 py-2.5">
                  <span className={cn("font-mono text-sm font-semibold", a.pct >= 10 ? "text-amber-400" : "text-slate-200")}>
                    €{a.cost.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", a.pct >= 10 ? "bg-amber-500" : "bg-blue-500")} style={{ width: `${Math.min(a.pct, 100)}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 font-mono w-10">{a.pct}%</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{a.actions}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-400">€{a.costPerAction.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-700 bg-slate-800/30">
              <td className="px-4 py-2.5 text-sm font-bold text-slate-200">Total</td>
              <td />
              <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-300">{total.tokensIn.toLocaleString("fr-FR")}</td>
              <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-300">{total.tokensOut.toLocaleString("fr-FR")}</td>
              <td className="px-4 py-2.5 font-mono text-sm font-bold text-slate-100">€{total.cost.toFixed(2)}</td>
              <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-300">100%</td>
              <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-300">{total.actions}</td>
              <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-300">€{(total.cost / total.actions).toFixed(3)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Charts row ───────────────────────────────────────────────────────────────

function ChartsRow() {
  const [mrr,    setMrr]    = useState("12450")
  const [cost,   setCost]   = useState("556")
  const [leads,  setLeads]  = useState("234")
  const [churn,  setChurn]  = useState("3")

  const mrrN   = parseFloat(mrr)   || 0
  const costN  = parseFloat(cost)  || 1
  const leadsN = parseFloat(leads) || 1
  const churnN = parseFloat(churn) || 1

  const cac      = costN / leadsN
  const ltv      = (mrrN / leadsN) / (churnN / 100)
  const ltvCac   = ltv / cac
  const roi      = ((mrrN * 12 - costN * 12) / (costN * 12)) * 100
  const payback  = cac / (mrrN / leadsN)

  const gaugeAngle = Math.min((roi / 500) * 180, 180)
  const x = 80 + 65 * Math.cos(((gaugeAngle - 180) * Math.PI) / 180)
  const y = 80 + 65 * Math.sin(((gaugeAngle - 180) * Math.PI) / 180)

  const inputCls = "w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Stacked bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Coûts fixes vs variables — 6 mois</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={STACKED_DATA} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number, name: string) => [`€${v}`, name]}
            />
            <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            <Bar dataKey="fixed"     name="Infra fixe"  stackId="a" fill="#334155" radius={[0,0,3,3]} />
            <Bar dataKey="anthropic" name="Anthropic API" stackId="a" fill="#3b82f6" />
            <Bar dataKey="tools"     name="Outils tiers" stackId="a" fill="#8b5cf6" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ROI Calculator */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-slate-200">Calculateur ROI</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">MRR total (€)</label>
            <input className={inputCls} value={mrr}   onChange={e => setMrr(e.target.value)}   type="number" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Coût mensuel (€)</label>
            <input className={inputCls} value={cost}  onChange={e => setCost(e.target.value)}  type="number" />
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

        {/* Gauge + metrics */}
        <div className="flex items-start gap-4">
          {/* SVG arc gauge */}
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
              { label: "LTV",         value: `€${ltv.toFixed(0)}` },
              { label: "CAC",         value: `€${cac.toFixed(0)}` },
              { label: "LTV:CAC",     value: `${ltvCac.toFixed(1)}x` },
              { label: "Payback",     value: `${payback.toFixed(1)}m` },
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

// ─── Suggestions ──────────────────────────────────────────────────────────────

function Suggestions() {
  const [applied, setApplied] = useState<Set<string>>(new Set())

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-200 mb-3">Optimisations suggérées</h2>
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
                {applied.has(s.id) ? "Appliqué" : "Appliquer"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CostsPage() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Coûts &amp; ROI</h1>
          <p className="text-sm text-slate-400 mt-0.5">Suivi des dépenses API et retour sur investissement</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            {(["day","week","month"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn("text-xs px-3 py-1.5 rounded-md transition-colors", period === p ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300")}>
                {{day:"Jour",week:"Semaine",month:"Mois"}[p]}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg transition-colors">
            Export CSV
          </button>
        </div>
      </div>

      <SummaryCards />
      <AgentTable />
      <ChartsRow />
      <Suggestions />
    </div>
  )
}
