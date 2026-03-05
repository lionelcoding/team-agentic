'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const MONTHLY_BUDGET = 500

interface CostEntry {
  amount: number
  category: string
  date: string
}

const CATEGORY_COLORS: Record<string, string> = {
  api_tokens: 'bg-blue-500',
  hosting: 'bg-emerald-500',
  tools: 'bg-purple-500',
  fixed: 'bg-slate-500',
}

const CATEGORY_LABELS: Record<string, string> = {
  api_tokens: 'API Tokens',
  hosting: 'Hosting',
  tools: 'Outils',
  fixed: 'Fixe',
}

export function CostSummary() {
  const [loading, setLoading] = useState(true)
  const [dailySpend, setDailySpend] = useState(0)
  const [monthlySpent, setMonthlySpent] = useState(0)
  const [projection, setProjection] = useState(0)
  const [breakdown, setBreakdown] = useState<{ label: string; amount: number; color: string }[]>([])

  useEffect(() => {
    const supabase = createClient()
    async function fetch() {
      const { data, error } = await supabase
        .from('cost_entries')
        .select('amount, category, date')
        .order('date', { ascending: false })

      if (error) {
        console.error('Error fetching costs:', error)
        setLoading(false)
        return
      }

      const entries: CostEntry[] = data || []
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const dayOfMonth = now.getDate()
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

      let daily = 0
      let monthly = 0
      const catMap: Record<string, number> = {}

      for (const e of entries) {
        if (e.date === todayStr) daily += Number(e.amount)
        if (e.date >= monthStart) {
          monthly += Number(e.amount)
          const cat = e.category || 'other'
          catMap[cat] = (catMap[cat] || 0) + Number(e.amount)
        }
      }

      const proj = dayOfMonth > 0 ? (monthly / dayOfMonth) * daysInMonth : 0

      setDailySpend(Math.round(daily * 100) / 100)
      setMonthlySpent(Math.round(monthly * 100) / 100)
      setProjection(Math.round(proj * 100) / 100)
      setBreakdown(
        Object.entries(catMap)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, amount]) => ({
            label: CATEGORY_LABELS[cat] || cat,
            amount: Math.round(amount * 100) / 100,
            color: CATEGORY_COLORS[cat] || 'bg-slate-500',
          }))
      )
      setLoading(false)
    }
    fetch()
  }, [])

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-center h-[280px]">
        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
      </div>
    )
  }

  const monthlyPercent = MONTHLY_BUDGET > 0 ? Math.round((monthlySpent / MONTHLY_BUDGET) * 100) : 0
  const budgetColor =
    monthlyPercent < 60
      ? 'from-emerald-500 to-emerald-400'
      : monthlyPercent < 80
      ? 'from-yellow-500 to-yellow-400'
      : 'from-red-500 to-red-400'
  const projectionColor = projection < MONTHLY_BUDGET ? 'text-emerald-400' : 'text-red-400'
  const avgPerDay = monthlySpent > 0 && new Date().getDate() > 0
    ? monthlySpent / new Date().getDate()
    : 0

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Resume des Couts</h3>
        <TrendingUp className="w-4 h-4 text-slate-500" />
      </div>

      {/* Depense du jour */}
      <div className="bg-slate-800/60 rounded-lg p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Depense aujourd'hui</p>
          <p className="text-2xl font-bold text-slate-50 mt-0.5">${dailySpend.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Moyenne / jour</p>
          <p className="text-sm font-semibold text-slate-300">${avgPerDay.toFixed(2)}</p>
        </div>
      </div>

      {/* Budget mensuel */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Budget mensuel</span>
          <span className="text-xs font-semibold text-slate-200">
            ${monthlySpent.toFixed(0)} / ${MONTHLY_BUDGET}
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div
            className={cn('bg-gradient-to-r h-2.5 rounded-full transition-all duration-700', budgetColor)}
            style={{ width: `${Math.min(monthlyPercent, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-600">{monthlyPercent}% utilise</span>
          <span className="text-[10px] text-slate-600">
            ${Math.max(MONTHLY_BUDGET - monthlySpent, 0).toFixed(0)} restant
          </span>
        </div>
      </div>

      {/* Projection */}
      <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {projection > MONTHLY_BUDGET && (
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
          )}
          <span className="text-xs text-slate-400">Projection fin de mois</span>
        </div>
        <span className={cn('text-sm font-bold', projectionColor)}>
          ${projection.toFixed(2)}
        </span>
      </div>

      {/* Breakdown */}
      {breakdown.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {breakdown.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full shrink-0', item.color)} />
              <span className="text-xs text-slate-400 flex-1">{item.label}</span>
              <span className="text-xs font-medium text-slate-300">${item.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
