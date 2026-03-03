"use client"

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { SignalItem } from "@/lib/signal-data"

interface SignalStatsSidebarProps {
  signals: SignalItem[]
}

const SOURCE_COLORS: Record<string, string> = {
  Twitter: "#38bdf8",
  Reddit: "#f97316",
  YouTube: "#ef4444",
  LinkedIn: "#3b82f6",
  RSS: "#fbbf24",
}

const IMPACT_COLORS = {
  HIGH: "#f87171",
  MEDIUM: "#fbbf24",
  LOW: "#4ade80",
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200">
        {payload[0].name}: {payload[0].value}
      </div>
    )
  }
  return null
}

export function SignalStatsSidebar({ signals }: SignalStatsSidebarProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayCount = signals.filter((s) => s.createdAt >= today).length
  const totalCount = signals.length
  const approvedCount = signals.filter((s) => s.status === "approved" || s.status === "dispatched").length
  const approvalRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0

  // Source aggregation
  const sourceCounts = signals.reduce(
    (acc, s) => {
      acc[s.source] = (acc[s.source] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const sourceData = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }))

  // Impact aggregation for donut
  const impactCounts = signals.reduce(
    (acc, s) => {
      acc[s.impact] = (acc[s.impact] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const impactData = Object.entries(impactCounts).map(([name, value]) => ({ name, value }))

  // Approval pie
  const approvalData = [
    { name: "Approuvés", value: approvedCount },
    { name: "Autres", value: totalCount - approvedCount },
  ]

  return (
    <aside className="w-[280px] shrink-0 flex flex-col gap-4">
      {/* Today's count */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <p className="text-xs text-slate-400 mb-1">Signaux aujourd'hui</p>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-slate-50">{todayCount}</span>
          <span className="text-xs text-slate-500 mb-1">/ {totalCount} total</span>
        </div>
      </div>

      {/* Approval rate */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <p className="text-xs text-slate-400 mb-3">Taux d'approbation</p>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={80} height={80}>
            <PieChart>
              <Pie
                data={approvalData}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={38}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
              >
                <Cell fill="#22c55e" />
                <Cell fill="#1e293b" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div>
            <p className="text-2xl font-bold text-slate-50">{approvalRate}%</p>
            <p className="text-xs text-slate-400">{approvedCount} approuvés</p>
            <p className="text-xs text-slate-500">{totalCount - approvedCount} restants</p>
          </div>
        </div>
      </div>

      {/* Top sources */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <p className="text-xs text-slate-400 mb-3">Top Sources</p>
        <div className="space-y-2">
          {sourceData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: SOURCE_COLORS[item.name] ?? "#64748b" }}
              />
              <span className="text-xs text-slate-300 w-20 shrink-0">{item.name}</span>
              <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((item.value / totalCount) * 100)}%`,
                    backgroundColor: SOURCE_COLORS[item.name] ?? "#64748b",
                  }}
                />
              </div>
              <span className="text-xs text-slate-500 w-4 text-right">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Impact donut */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <p className="text-xs text-slate-400 mb-3">Signaux par impact</p>
        <ResponsiveContainer width="100%" height={120}>
          <PieChart>
            <Pie
              data={impactData}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={50}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={2}
              stroke="#0f172a"
            >
              {impactData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={IMPACT_COLORS[entry.name as keyof typeof IMPACT_COLORS] ?? "#64748b"}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-4 mt-1">
          {impactData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: IMPACT_COLORS[entry.name as keyof typeof IMPACT_COLORS] ?? "#64748b" }}
              />
              <span className="text-xs text-slate-400">{entry.name}</span>
              <span className="text-xs font-medium text-slate-300">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Source bar chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <p className="text-xs text-slate-400 mb-3">Volume par source</p>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={sourceData} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 3, 3, 0]}>
              {sourceData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={SOURCE_COLORS[entry.name] ?? "#64748b"}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </aside>
  )
}
