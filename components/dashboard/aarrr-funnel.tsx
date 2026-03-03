'use client'

import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const funnelData = [
  {
    phase: 'Acquisition',
    kpi: '1,243',
    unit: 'leads',
    variation: +12,
    color: '#3b82f6',
    fillColor: '#3b82f620',
    sparkline: [
      { v: 800 }, { v: 950 }, { v: 870 }, { v: 1020 }, { v: 980 }, { v: 1100 }, { v: 1243 },
    ],
  },
  {
    phase: 'Activation',
    kpi: '68.5',
    unit: '%',
    variation: +4.2,
    color: '#22c55e',
    fillColor: '#22c55e20',
    sparkline: [
      { v: 61 }, { v: 63 }, { v: 60 }, { v: 65 }, { v: 67 }, { v: 66 }, { v: 68.5 },
    ],
  },
  {
    phase: 'Rétention',
    kpi: '82.1',
    unit: '%',
    variation: -2.3,
    color: '#eab308',
    fillColor: '#eab30820',
    sparkline: [
      { v: 86 }, { v: 85 }, { v: 84 }, { v: 83.5 }, { v: 84 }, { v: 83 }, { v: 82.1 },
    ],
  },
  {
    phase: 'Referral',
    kpi: '3.8',
    unit: 'NPS',
    variation: +0.6,
    color: '#a855f7',
    fillColor: '#a855f720',
    sparkline: [
      { v: 3.1 }, { v: 3.2 }, { v: 3.0 }, { v: 3.4 }, { v: 3.5 }, { v: 3.7 }, { v: 3.8 },
    ],
  },
  {
    phase: 'Revenue',
    kpi: '€12,450',
    unit: 'MRR',
    variation: +18.4,
    color: '#10b981',
    fillColor: '#10b98120',
    sparkline: [
      { v: 8200 }, { v: 9100 }, { v: 9800 }, { v: 10400 }, { v: 11100 }, { v: 11900 }, { v: 12450 },
    ],
  },
]

export function AarrrFunnel() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      {funnelData.map((item) => (
        <div
          key={item.phase}
          className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col gap-2 min-w-0"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {item.phase}
            </span>
            <span
              className={cn(
                'flex items-center gap-0.5 text-xs font-semibold',
                item.variation >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {item.variation >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {item.variation >= 0 ? '+' : ''}
              {item.variation}%
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-2xl font-bold text-slate-50 leading-none">{item.kpi}</span>
            <span className="text-xs text-slate-500 mt-0.5">{item.unit}</span>
          </div>

          <div className="h-[50px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={item.sparkline} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                <defs>
                  <linearGradient id={`grad-${item.phase}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={item.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={item.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={item.color}
                  strokeWidth={1.5}
                  fill={`url(#grad-${item.phase})`}
                  dot={false}
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <span className="text-[10px] text-slate-600">vs semaine passée</span>
        </div>
      ))}
    </div>
  )
}
