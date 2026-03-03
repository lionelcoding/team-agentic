'use client'

import { useState } from 'react'
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

interface Alert {
  id: number
  severity: Severity
  title: string
  desc: string
  time: string
  acknowledged: boolean
}

const severityConfig: Record<Severity, { label: string; icon: React.ElementType; bg: string; border: string; text: string; dot: string }> = {
  CRITICAL: {
    label: 'CRITIQUE',
    icon: AlertCircle,
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    dot: 'bg-red-500',
  },
  HIGH: {
    label: 'ÉLEVÉ',
    icon: AlertTriangle,
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    dot: 'bg-orange-500',
  },
  MEDIUM: {
    label: 'MOYEN',
    icon: Info,
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    dot: 'bg-yellow-500',
  },
  LOW: {
    label: 'BAS',
    icon: CheckCircle2,
    bg: 'bg-slate-700/30',
    border: 'border-slate-700',
    text: 'text-slate-400',
    dot: 'bg-slate-500',
  },
}

const initialAlerts: Alert[] = [
  {
    id: 1,
    severity: 'CRITICAL',
    title: 'Budget mensuel à 62%',
    desc: 'Projection fin de mois : €478 sur budget €500. Risque dépassement dans 4 jours.',
    time: 'il y a 5 min',
    acknowledged: false,
  },
  {
    id: 2,
    severity: 'CRITICAL',
    title: 'Taux bounce email +8%',
    desc: 'Agent Perso Seq : domaine client-corp.fr blacklisté. 23 emails non délivrés.',
    time: 'il y a 22 min',
    acknowledged: false,
  },
  {
    id: 3,
    severity: 'HIGH',
    title: 'Pipeline Stage 3 bloqué',
    desc: '7 prospects en Proposition depuis +14 jours sans activité. Relance nécessaire.',
    time: 'il y a 1h 15',
    acknowledged: false,
  },
  {
    id: 4,
    severity: 'HIGH',
    title: 'API Clearbit dégradée',
    desc: 'Latence x3 (1200ms avg). Enrichissement ralenti pour 34 leads en file.',
    time: 'il y a 2h 08',
    acknowledged: false,
  },
  {
    id: 5,
    severity: 'MEDIUM',
    title: 'Taux réussite Perso Seq',
    desc: 'Agent en dessous de 90% — 3 emails rejetés par filtres spam ce matin.',
    time: 'il y a 3h 40',
    acknowledged: false,
  },
  {
    id: 6,
    severity: 'MEDIUM',
    title: 'Segment ICP obsolète',
    desc: 'Segment "PME Industrie" non mis à jour depuis 21 jours. Révision recommandée.',
    time: 'il y a 5h 20',
    acknowledged: false,
  },
  {
    id: 7,
    severity: 'LOW',
    title: 'Rapport hebdo disponible',
    desc: 'Synthèse des performances AARRR générée par Victor. 16 pages, 42 KPIs.',
    time: 'il y a 2h 20',
    acknowledged: false,
  },
  {
    id: 8,
    severity: 'LOW',
    title: 'Mise à jour modèle disponible',
    desc: 'Claude 3.7 Sonnet disponible. Amélioration ~12% sur tâches de personnalisation.',
    time: 'il y a 6h 00',
    acknowledged: false,
  },
]

const severityOrder: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts)
  const [filter, setFilter] = useState<Severity | 'ALL'>('ALL')

  const acknowledge = (id: number) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    )
  }

  const dismiss = (id: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  const filtered = alerts.filter(
    (a) => !a.acknowledged && (filter === 'ALL' || a.severity === filter)
  )

  const counts = alerts.reduce(
    (acc, a) => {
      if (!a.acknowledged) acc[a.severity] = (acc[a.severity] || 0) + 1
      return acc
    },
    {} as Record<Severity, number>
  )

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg flex flex-col">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Alertes</h3>
        <span className="text-xs text-slate-500">
          {alerts.filter((a) => !a.acknowledged).length} actives
        </span>
      </div>

      {/* Filter pills */}
      <div className="px-4 py-2.5 border-b border-slate-800 flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setFilter('ALL')}
          className={cn(
            'text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors',
            filter === 'ALL'
              ? 'bg-slate-700 text-slate-200'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          )}
        >
          Toutes
        </button>
        {severityOrder.map((sev) => {
          const cfg = severityConfig[sev]
          return (
            <button
              key={sev}
              onClick={() => setFilter(sev)}
              className={cn(
                'flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors',
                filter === sev ? cn(cfg.bg, cfg.border, cfg.text) : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
              {cfg.label}
              {counts[sev] ? (
                <span className="ml-0.5 font-bold">{counts[sev]}</span>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* Alerts list */}
      <div className="overflow-y-auto max-h-[400px] divide-y divide-slate-800/60">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-600">
            <CheckCircle2 className="w-8 h-8 mb-2" />
            <p className="text-sm">Aucune alerte active</p>
          </div>
        ) : (
          filtered.map((alert) => {
            const cfg = severityConfig[alert.severity]
            const Icon = cfg.icon
            return (
              <div
                key={alert.id}
                className={cn(
                  'flex gap-3 px-4 py-3 transition-colors hover:bg-slate-800/20 border-l-2',
                  cfg.border.replace('border-', 'border-l-')
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', cfg.text)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded border',
                        cfg.bg, cfg.border, cfg.text
                      )}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-slate-600">{alert.time}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 mb-0.5">{alert.title}</p>
                  <p className="text-[11px] text-slate-500 leading-snug">{alert.desc}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => acknowledge(alert.id)}
                      className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Acknowledger
                    </button>
                    <span className="text-slate-700">·</span>
                    <button
                      onClick={() => dismiss(alert.id)}
                      className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      Ignorer
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => dismiss(alert.id)}
                  className="text-slate-700 hover:text-slate-400 transition-colors shrink-0 mt-0.5"
                  aria-label="Fermer l'alerte"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
