'use client'

import { cn } from '@/lib/utils'

const typeBadges: Record<string, string> = {
  'Enrichissement': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Scoring': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'Email': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Analyse': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'Alerte': 'bg-red-500/15 text-red-400 border-red-500/30',
  'ICP': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  'Pipeline': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'Handover': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
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

const timeline = [
  { initials: 'SR', agent: 'Scout Radar', type: 'Analyse', desc: 'Détection de 3 nouveaux signaux d\'intention sur LinkedIn', time: 'il y a 1 min' },
  { initials: 'EN', agent: 'Enrichisseur', type: 'Enrichissement', desc: '42 leads enrichis avec données firmographiques', time: 'il y a 3 min' },
  { initials: 'PS', agent: 'Perso Seq', type: 'Email', desc: 'Séquence personnalisée envoyée à SaaS Corp (12 contacts)', time: 'il y a 7 min' },
  { initials: 'SC', agent: 'Score Lead', type: 'Scoring', desc: 'Techwave SAS requalifié score 87/100 → Hot Lead', time: 'il y a 11 min' },
  { initials: 'IC', agent: 'ICP Analyzer', type: 'ICP', desc: 'Nouveau segment ICP identifié : Fintech 50-200 salariés', time: 'il y a 18 min' },
  { initials: 'VC', agent: 'Victor', type: 'Pipeline', desc: 'Déplacement de 5 leads Qualification → Proposition', time: 'il y a 24 min' },
  { initials: 'NL', agent: 'Nurture Loop', type: 'Email', desc: 'Relance J+7 envoyée à 18 prospects en nurturing', time: 'il y a 31 min' },
  { initials: 'RV', agent: 'Revenue Opt', type: 'Analyse', desc: 'Opportunité upsell détectée chez DataFlow SA (€4 200)', time: 'il y a 38 min' },
  { initials: 'SR', agent: 'Scout Radar', type: 'Alerte', desc: 'Concurrent Acme Corp a levé €2M — cible à contacter', time: 'il y a 45 min' },
  { initials: 'EN', agent: 'Enrichisseur', type: 'Enrichissement', desc: 'LinkedIn Sales Nav sync : 28 nouveaux contacts', time: 'il y a 52 min' },
  { initials: 'VC', agent: 'Victor', type: 'Handover', desc: 'Prospect Nexus SAS transféré au SDR — demo demandée', time: 'il y a 58 min' },
  { initials: 'PS', agent: 'Perso Seq', type: 'Email', desc: 'A/B test objet email — variante B +14% open rate', time: 'il y a 1h 10' },
  { initials: 'SC', agent: 'Score Lead', type: 'Scoring', desc: '8 leads dégradés Cold — retirés du pipeline actif', time: 'il y a 1h 22' },
  { initials: 'IC', agent: 'ICP Analyzer', type: 'ICP', desc: 'Rapport ICP mensuel généré — 3 nouveaux segments', time: 'il y a 1h 35' },
  { initials: 'NL', agent: 'Nurture Loop', type: 'Pipeline', desc: 'Séquence "Re-engagement 90j" lancée — 34 contacts', time: 'il y a 1h 48' },
  { initials: 'RV', agent: 'Revenue Opt', type: 'Analyse', desc: 'MRR projeté +18.4% — recommandation pricing validée', time: 'il y a 2h 05' },
  { initials: 'VC', agent: 'Victor', type: 'Analyse', desc: 'Synthèse hebdo générée — 16 actions prioritaires', time: 'il y a 2h 20' },
  { initials: 'SR', agent: 'Scout Radar', type: 'Enrichissement', desc: 'Scraping Crunchbase — 67 startups Series A identifiées', time: 'il y a 2h 45' },
  { initials: 'EN', agent: 'Enrichisseur', type: 'Scoring', desc: 'Intégration Clearbit : données mises à jour 120 leads', time: 'il y a 3h 12' },
  { initials: 'PS', agent: 'Perso Seq', type: 'Email', desc: 'Template "Enterprise" personnalisé — 94% deliverability', time: 'il y a 3h 40' },
]

export function ActivityTimeline() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg flex flex-col">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Timeline des Actions</h3>
        <span className="text-xs text-slate-500">20 dernières actions</span>
      </div>
      <div className="overflow-y-auto max-h-[480px] divide-y divide-slate-800/60">
        {timeline.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-800/30 transition-colors"
          >
            <div
              className={cn(
                'w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5',
                avatarColors[i % avatarColors.length]
              )}
            >
              {item.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-xs font-medium text-slate-300">{item.agent}</span>
                <span
                  className={cn(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded border',
                    typeBadges[item.type] ?? 'bg-slate-700 text-slate-400 border-slate-600'
                  )}
                >
                  {item.type}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-snug">{item.desc}</p>
            </div>
            <span className="text-[10px] text-slate-600 shrink-0 mt-0.5 whitespace-nowrap">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
