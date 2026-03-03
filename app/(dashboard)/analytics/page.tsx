"use client"

import { useState } from "react"
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts"
import { TrendingUp, Download } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Mock data ────────────────────────────────────────────────────────────────

const WEEKS = ["S1","S2","S3","S4","S5","S6","S7","S8","S9","S10","S11","S12"]

function trend(start: number, growth: number, noise = 0.15) {
  return WEEKS.map((_, i) => Math.round(start * Math.pow(1 + growth, i) * (1 + (Math.random() - 0.5) * noise)))
}

const leads_total     = trend(180, 0.08)
const leads_qualified = leads_total.map((v, i) => Math.round(v * (0.28 + i * 0.006)))
const leads_converted = leads_qualified.map((v, i) => Math.round(v * (0.10 + i * 0.008)))
const mrr_data        = trend(7200, 0.10)
const costs_data      = trend(380, 0.04)
const weekly_data     = WEEKS.map((w, i) => ({
  week: w,
  leads_new:   leads_total[i],
  qualified:   leads_qualified[i],
  converted:   leads_converted[i],
  mrr:         mrr_data[i],
  cost:        costs_data[i],
  roi:         Math.round(((mrr_data[i] * 12 - costs_data[i] * 12) / (costs_data[i] * 12)) * 100),
}))

const SOURCES_PIE = [
  { name: "BODACC",   value: 34, color: "#3b82f6" },
  { name: "LinkedIn", value: 28, color: "#0ea5e9" },
  { name: "Twitter",  value: 17, color: "#6366f1" },
  { name: "Reddit",   value: 11, color: "#f97316" },
  { name: "Referral", value: 7,  color: "#22c55e" },
  { name: "Direct",   value: 3,  color: "#64748b" },
]

const TIER_DATA = [
  { tier: "T1 — Enterprise", count: 28,  color: "#f59e0b" },
  { tier: "T2 — Scale-up",   count: 67,  color: "#3b82f6" },
  { tier: "T3 — PME",        count: 143, color: "#8b5cf6" },
  { tier: "T4 — Startup",    count: 89,  color: "#22c55e" },
  { tier: "T5 — Micro",      count: 34,  color: "#64748b" },
]

const ROI_DATA = WEEKS.slice(-6).map((w, i) => ({
  week: w,
  cost:    costs_data[6 + i],
  revenue: mrr_data[6 + i] * 3,
}))

const FUNNEL_STEPS = [
  { phase: "Acquisition", value: leads_total[11],     pct: 100, color: "#3b82f6", textColor: "text-blue-400" },
  { phase: "Activation",  value: leads_qualified[11], pct: 32,  color: "#22c55e", textColor: "text-green-400" },
  { phase: "Retention",   value: Math.round(leads_qualified[11] * 0.52), pct: 17, color: "#eab308", textColor: "text-yellow-400" },
  { phase: "Referral",    value: Math.round(leads_converted[11] * 0.45), pct: 5,  color: "#a855f7", textColor: "text-purple-400" },
  { phase: "Revenue",     value: leads_converted[11], pct: 8,   color: "#10b981", textColor: "text-emerald-400" },
]

const CONVERSION_RATES = [
  { stage: "Acq → Activ", rate: 32, color: "#3b82f6" },
  { stage: "Activ → Ret", rate: 52, color: "#22c55e" },
  { stage: "Ret → Ref",   rate: 28, color: "#eab308" },
  { stage: "Ref → Rev",   rate: 61, color: "#a855f7" },
]

// ─── Funnel visual ────────────────────────────────────────────────────────────

function FunnelVisual() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
      <h2 className="text-sm font-semibold text-slate-200 mb-5">Entonnoir AARRR — Semaine 12</h2>
      <div className="flex items-end justify-center gap-2 flex-wrap sm:flex-nowrap">
        {FUNNEL_STEPS.map((step, i) => {
          const minW = 60
          const maxW = 100
          const w = minW + ((maxW - minW) * step.pct) / 100
          return (
            <div key={step.phase} className="flex flex-col items-center gap-2 flex-1 min-w-[80px]">
              <div className="text-center">
                <p className={cn("text-lg font-bold", step.textColor)}>{step.value.toLocaleString("fr-FR")}</p>
                <p className="text-[10px] text-slate-600">{step.pct}%</p>
              </div>
              <div
                className="rounded-sm transition-all w-full"
                style={{
                  height: `${30 + (step.pct / 100) * 60}px`,
                  background: step.color,
                  opacity: 0.85,
                  clipPath: i < FUNNEL_STEPS.length - 1
                    ? `polygon(0 0, 100% 0, ${100 - (100 - (FUNNEL_STEPS[i+1]?.pct ?? step.pct)) / 3}% 100%, ${(100 - (FUNNEL_STEPS[i+1]?.pct ?? step.pct)) / 3}% 100%)`
                    : undefined,
                }}
              />
              <p className="text-xs font-medium text-slate-400 text-center">{step.phase}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Charts grid ─────────────────────────────────────────────────────────────

const tooltip = { contentStyle: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 } }

function ChartsGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* 1. Leads par source (pie) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Leads par source</h3>
        <div className="flex items-center gap-3">
          <ResponsiveContainer width={110} height={110}>
            <PieChart>
              <Pie data={SOURCES_PIE} cx={50} cy={50} innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={2}>
                {SOURCES_PIE.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            {SOURCES_PIE.map(s => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-[10px] text-slate-400 truncate flex-1">{s.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Évolution leads (line) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Évolution leads — 12 sem.</h3>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={weekly_data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltip} />
            <Line type="monotone" dataKey="leads_new"  name="Total"     stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="qualified"  name="Qualifiés"  stroke="#22c55e" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            <Line type="monotone" dataKey="converted"  name="Convertis"  stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="2 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 3. Distribution tier (bar horizontal) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Distribution Tier</h3>
        <div className="flex flex-col gap-2.5">
          {TIER_DATA.map(t => (
            <div key={t.tier} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-24 shrink-0 truncate">{t.tier.split(" — ")[0]}</span>
              <div className="flex-1 h-5 bg-slate-800 rounded overflow-hidden relative">
                <div className="h-full rounded transition-all" style={{ width: `${(t.count / 143) * 100}%`, background: t.color, opacity: 0.8 }} />
                <span className="absolute right-2 top-0 bottom-0 flex items-center text-[9px] text-slate-400 font-mono">{t.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. MRR area */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">MRR — 12 semaines</h3>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={weekly_data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
            <Tooltip {...tooltip} formatter={(v: number) => [`€${v.toLocaleString("fr-FR")}`, "MRR"]} />
            <Area type="monotone" dataKey="mrr" stroke="#3b82f6" strokeWidth={2} fill="url(#mrrGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 5. ROI par canal (grouped bar) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">ROI par période — Coût vs Revenue</h3>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={ROI_DATA} barSize={12} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
            <Tooltip {...tooltip} formatter={(v: number, name: string) => [`€${v.toLocaleString("fr-FR")}`, name === "cost" ? "Coût" : "Revenue"]} />
            <Bar dataKey="cost"    name="Coût"    fill="#ef4444" opacity={0.8} radius={[2,2,0,0]} />
            <Bar dataKey="revenue" name="Revenue" fill="#22c55e" opacity={0.8} radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 6. Taux conversion funnel */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Taux de conversion AARRR</h3>
        <div className="flex flex-col gap-3">
          {CONVERSION_RATES.map(c => (
            <div key={c.stage} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">{c.stage}</span>
                <span className="text-xs font-bold font-mono" style={{ color: c.color }}>{c.rate}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${c.rate}%`, background: c.color }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between text-xs">
          <span className="text-slate-500">Conversion globale</span>
          <span className="text-emerald-400 font-bold font-mono">{weekly_data[11].converted}/{weekly_data[11].leads_new} = {((weekly_data[11].converted / weekly_data[11].leads_new) * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}

// ─── Weekly table ─────────────────────────────────────────────────────────────

function WeeklyTable({ range }: { range: number }) {
  const data = weekly_data.slice(0, range)
  const totals = data.reduce((acc, d) => ({
    leads_new:  acc.leads_new  + d.leads_new,
    qualified:  acc.qualified  + d.qualified,
    converted:  acc.converted  + d.converted,
    mrr:        Math.max(acc.mrr, d.mrr),
    cost:       acc.cost       + d.cost,
  }), { leads_new: 0, qualified: 0, converted: 0, mrr: 0, cost: 0 })

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          Récapitulatif hebdomadaire
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              {["Semaine","Leads","Qualifiés","Convertis","MRR","Coût","ROI"].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {data.map((d, i) => (
              <tr key={d.week} className={cn("hover:bg-slate-800/20 transition-colors", i === data.length - 1 && "font-medium")}>
                <td className="px-4 py-2 text-sm text-slate-400 font-mono">{d.week}</td>
                <td className="px-4 py-2 text-sm text-slate-300 font-mono">{d.leads_new}</td>
                <td className="px-4 py-2 text-sm text-slate-300 font-mono">{d.qualified}</td>
                <td className="px-4 py-2 text-sm text-emerald-400 font-mono">{d.converted}</td>
                <td className="px-4 py-2 text-sm text-blue-400 font-mono">€{d.mrr.toLocaleString("fr-FR")}</td>
                <td className="px-4 py-2 text-sm text-slate-400 font-mono">€{d.cost}</td>
                <td className="px-4 py-2">
                  <span className={cn("text-sm font-bold font-mono", d.roi >= 200 ? "text-emerald-400" : d.roi >= 100 ? "text-yellow-400" : "text-red-400")}>
                    {d.roi}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-700 bg-slate-800/40">
              <td className="px-4 py-2.5 text-sm font-bold text-slate-200">Total</td>
              <td className="px-4 py-2.5 text-sm font-bold text-slate-100 font-mono">{totals.leads_new}</td>
              <td className="px-4 py-2.5 text-sm font-bold text-slate-100 font-mono">{totals.qualified}</td>
              <td className="px-4 py-2.5 text-sm font-bold text-emerald-300 font-mono">{totals.converted}</td>
              <td className="px-4 py-2.5 text-sm font-bold text-blue-300 font-mono">€{totals.mrr.toLocaleString("fr-FR")}</td>
              <td className="px-4 py-2.5 text-sm font-bold text-slate-100 font-mono">€{totals.cost}</td>
              <td className="px-4 py-2.5 text-sm font-bold text-emerald-300 font-mono">
                {Math.round(((totals.mrr * 12 - totals.cost * 12) / (totals.cost * 12)) * 100)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [range, setRange] = useState<7 | 30 | 90 | 12>(12)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Analytics AARRR</h1>
          <p className="text-sm text-slate-400 mt-0.5">Évolution du funnel sur 12 semaines</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            {([7,30,90,12] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={cn("text-xs px-3 py-1.5 rounded-md transition-colors whitespace-nowrap",
                  range === r ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300")}>
                {r === 12 ? "12 sem." : `${r}j`}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      <FunnelVisual />
      <ChartsGrid />
      <WeeklyTable range={range === 12 ? 12 : Math.min(range, 12)} />
    </div>
  )
}
