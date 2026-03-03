'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts'
import { Cpu } from 'lucide-react'

const modelData = [
  { model: 'Claude Haiku', requests: 4820, color: '#22c55e', cost: 0.0004 },
  { model: 'Claude Sonnet', requests: 1240, color: '#3b82f6', cost: 0.003 },
  { model: 'Claude Opus', requests: 320, color: '#a855f7', cost: 0.015 },
  { model: 'GPT-4o Mini', requests: 2100, color: '#10b981', cost: 0.0006 },
  { model: 'GPT-4o', requests: 480, color: '#f59e0b', cost: 0.005 },
]

const totalRequests = modelData.reduce((s, m) => s + m.requests, 0)

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { model: string; requests: number; color: string } }[] }) => {
  if (active && payload?.length) {
    const d = payload[0].payload
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs">
        <p className="text-slate-200 font-medium">{d.model}</p>
        <p className="text-slate-400">{d.requests.toLocaleString('fr-FR')} requêtes</p>
      </div>
    )
  }
  return null
}

export function ModelRouting() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Model Routing</h3>
        <Cpu className="w-4 h-4 text-slate-500" />
      </div>

      {/* Total */}
      <div className="bg-slate-800/60 rounded-lg p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Total aujourd'hui</p>
          <p className="text-2xl font-bold text-slate-50 mt-0.5">
            {totalRequests.toLocaleString('fr-FR')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Latence moy.</p>
          <p className="text-sm font-semibold text-slate-300">1.24s</p>
        </div>
      </div>

      {/* Bar chart horizontal */}
      <div className="h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={modelData}
            layout="vertical"
            margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="30%"
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="model"
              width={90}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="requests" radius={[0, 3, 3, 0]}>
              {modelData.map((entry, index) => (
                <Cell key={index} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="flex flex-col gap-2">
        {modelData.map((m) => (
          <div key={m.model} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: m.color }}
            />
            <span className="text-xs text-slate-400 flex-1 truncate">{m.model}</span>
            <span className="text-xs text-slate-500">
              {((m.requests / totalRequests) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
