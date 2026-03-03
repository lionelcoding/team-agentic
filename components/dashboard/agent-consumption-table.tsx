'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const poleBadgeColors: Record<string, string> = {
  Acquisition: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Activation: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Retention: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  Referral: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Revenue: 'bg-green-500/15 text-green-400 border-green-500/30',
  Core: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

const avatarColors = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-purple-500 to-pink-600',
  'from-orange-500 to-red-600',
  'from-yellow-500 to-orange-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-pink-600',
  'from-violet-500 to-purple-600',
]

const agents = [
  { initials: 'VC', name: 'Victor', role: 'Orchestrateur', pole: 'Core', tasks: 142, successRate: 98.5, tokensDay: '182K', costDay: 4.82, xp: 9840 },
  { initials: 'SR', name: 'Scout Radar', role: 'Détection Signaux', pole: 'Acquisition', tasks: 89, successRate: 94.2, tokensDay: '148K', costDay: 3.12, xp: 6420 },
  { initials: 'IC', name: 'ICP Analyzer', role: 'Profilage ICP', pole: 'Acquisition', tasks: 64, successRate: 96.8, tokensDay: '92K', costDay: 2.44, xp: 5180 },
  { initials: 'EN', name: 'Enrichisseur', role: 'Data Enrichment', pole: 'Acquisition', tasks: 211, successRate: 91.3, tokensDay: '64K', costDay: 1.28, xp: 7620 },
  { initials: 'SC', name: 'Score Lead', role: 'Lead Scoring', pole: 'Activation', tasks: 178, successRate: 97.1, tokensDay: '38K', costDay: 0.76, xp: 5940 },
  { initials: 'PS', name: 'Perso Seq', role: 'Personnalisation', pole: 'Activation', tasks: 95, successRate: 89.4, tokensDay: '210K', costDay: 5.60, xp: 4820 },
  { initials: 'NL', name: 'Nurture Loop', role: 'Lead Nurturing', pole: 'Retention', tasks: 53, successRate: 93.6, tokensDay: '76K', costDay: 1.52, xp: 3640 },
  { initials: 'RV', name: 'Revenue Opt', role: 'Optimisation Rev.', pole: 'Revenue', tasks: 38, successRate: 99.2, tokensDay: '44K', costDay: 2.20, xp: 4200 },
]

function SuccessBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={cn(
            'h-1.5 rounded-full',
            value >= 95 ? 'bg-emerald-500' : value >= 85 ? 'bg-yellow-500' : 'bg-red-500'
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-slate-300 tabular-nums">{value}%</span>
    </div>
  )
}

function XpBadge({ xp }: { xp: number }) {
  const level = xp >= 9000 ? 'Légendaire' : xp >= 6000 ? 'Expert' : xp >= 4000 ? 'Avancé' : 'Junior'
  const color = xp >= 9000 ? 'text-yellow-400' : xp >= 6000 ? 'text-purple-400' : xp >= 4000 ? 'text-blue-400' : 'text-slate-400'
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-xs font-semibold text-slate-200 tabular-nums">{xp.toLocaleString('fr-FR')}</span>
      <span className={cn('text-[10px] font-medium', color)}>{level}</span>
    </div>
  )
}

export function AgentConsumptionTable() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Consommation des Agents</h3>
        <span className="text-xs text-slate-500">{agents.length} agents actifs aujourd'hui</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-500 text-xs font-medium w-56">Agent</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium text-right">Tâches</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium">Taux réussite</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium text-right">Tokens / jour</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium text-right">Coût €</TableHead>
              <TableHead className="text-slate-500 text-xs font-medium text-right">XP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent, i) => (
              <TableRow
                key={agent.name}
                className="border-slate-800 hover:bg-slate-800/40 transition-colors"
              >
                <TableCell className="py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-[11px] font-bold text-white shrink-0',
                        avatarColors[i % avatarColors.length]
                      )}
                    >
                      {agent.initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-slate-200 truncate">{agent.name}</span>
                      <span className="text-[10px] text-slate-500 truncate">{agent.role}</span>
                    </div>
                    <span
                      className={cn(
                        'ml-1 text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0',
                        poleBadgeColors[agent.pole]
                      )}
                    >
                      {agent.pole}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right py-2.5">
                  <span className="text-xs font-semibold text-slate-200 tabular-nums">{agent.tasks}</span>
                </TableCell>
                <TableCell className="py-2.5">
                  <SuccessBar value={agent.successRate} />
                </TableCell>
                <TableCell className="text-right py-2.5">
                  <span className="text-xs font-mono text-slate-300">{agent.tokensDay}</span>
                </TableCell>
                <TableCell className="text-right py-2.5">
                  <span className="text-xs font-semibold text-slate-200 tabular-nums">
                    €{agent.costDay.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="text-right py-2.5">
                  <XpBadge xp={agent.xp} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
