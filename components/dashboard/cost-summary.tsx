'use client'

import { TrendingUp, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const dailySpend = 23.45
const monthlyBudget = 500
const monthlySpent = 312.80
const monthlyPercent = Math.round((monthlySpent / monthlyBudget) * 100)
const projection = 478.20

const budgetColor =
  monthlyPercent < 60
    ? 'from-emerald-500 to-emerald-400'
    : monthlyPercent < 80
    ? 'from-yellow-500 to-yellow-400'
    : 'from-red-500 to-red-400'

const projectionColor =
  projection < monthlyBudget ? 'text-emerald-400' : 'text-red-400'

export function CostSummary() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Résumé des Coûts</h3>
        <TrendingUp className="w-4 h-4 text-slate-500" />
      </div>

      {/* Dépense du jour */}
      <div className="bg-slate-800/60 rounded-lg p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Dépense aujourd'hui</p>
          <p className="text-2xl font-bold text-slate-50 mt-0.5">€{dailySpend.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Moyenne / jour</p>
          <p className="text-sm font-semibold text-slate-300">€{(monthlySpent / 26).toFixed(2)}</p>
        </div>
      </div>

      {/* Budget mensuel */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Budget mensuel</span>
          <span className="text-xs font-semibold text-slate-200">
            €{monthlySpent.toFixed(0)} / €{monthlyBudget}
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div
            className={cn('bg-gradient-to-r h-2.5 rounded-full transition-all duration-700', budgetColor)}
            style={{ width: `${Math.min(monthlyPercent, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-600">{monthlyPercent}% utilisé</span>
          <span className="text-[10px] text-slate-600">
            €{(monthlyBudget - monthlySpent).toFixed(0)} restant
          </span>
        </div>
      </div>

      {/* Projection */}
      <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {projection > monthlyBudget && (
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
          )}
          <span className="text-xs text-slate-400">Projection fin de mois</span>
        </div>
        <span className={cn('text-sm font-bold', projectionColor)}>
          €{projection.toFixed(2)}
        </span>
      </div>

      {/* Breakdown */}
      <div className="flex flex-col gap-1.5">
        {[
          { label: 'Claude API', amount: 178.40, color: 'bg-blue-500' },
          { label: 'OpenAI API', amount: 89.20, color: 'bg-emerald-500' },
          { label: 'Infra / Tools', amount: 45.20, color: 'bg-purple-500' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={cn('w-2 h-2 rounded-full shrink-0', item.color)} />
            <span className="text-xs text-slate-400 flex-1">{item.label}</span>
            <span className="text-xs font-medium text-slate-300">€{item.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
