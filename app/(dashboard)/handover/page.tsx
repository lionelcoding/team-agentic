"use client"

import { useState, useMemo } from "react"
import { ArrowRight, Copy, MessageSquare, CheckCheck, Clock, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageType = "dispatch" | "question" | "approval" | "escalation" | "handoff"
type Priority    = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
type MsgStatus   = "sent" | "read" | "pending" | "failed"

interface HMessage {
  id: string
  from: string; fromPole: string
  to:   string; toPole:   string
  subject: string
  content: string
  type: MessageType
  priority: Priority
  status: MsgStatus
  lead?: string
  ts: string // ISO
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const POLE_BG: Record<string, string> = {
  ACQ: "bg-blue-600",   SYS: "bg-purple-600", GRO: "bg-green-600",
  SUP: "bg-red-600",    OPS: "bg-orange-600",  GOV: "bg-slate-600",
}

const MESSAGES: HMessage[] = [
  {
    id: "m1", from: "Victor", fromPole: "SYS", to: "Diane", toPole: "ACQ",
    subject: "Batch ICP scoring — 47 leads en attente",
    content: "Bonjour Diane, j'ai identifié 47 nouveaux leads issus du scan BODACC de cette semaine. Merci de lancer le processus de scoring ICP en priorité sur les secteurs SaaS B2B et FinTech. Budget alloué : 2 000 tokens. Renvoie les résultats au format JSON standardisé.",
    type: "dispatch", priority: "HIGH", status: "read",
    lead: "TechVision SAS", ts: "2025-03-02T08:45:00Z",
  },
  {
    id: "m2", from: "Hugo", fromPole: "ACQ", to: "Simon", toPole: "ACQ",
    subject: "Enrichissement requis — 12 entreprises BODACC",
    content: "Simon, j'ai terminé le scraping BODACC. 12 nouvelles créations d'entreprises détectées dans notre ICP cible. J'ai besoin des données LinkedIn et financières pour calculer le score final. Voir fichier attaché.",
    type: "handoff", priority: "MEDIUM", status: "read",
    lead: "FlowCRM", ts: "2025-03-02T09:12:00Z",
  },
  {
    id: "m3", from: "Victor", fromPole: "SYS", to: "Alice", toPole: "GRO",
    subject: "Lancement séquence outbound — Segment FinTech",
    content: "Alice, le segment FinTech (23 leads qualifiés, ICP ≥75) est prêt pour la séquence outbound. Utilise le template #7 personnalisé. Limite : 5 emails/jour/lead. Tracking UTM obligatoire. Rapport attendu vendredi.",
    type: "dispatch", priority: "HIGH", status: "read",
    ts: "2025-03-02T09:30:00Z",
  },
  {
    id: "m4", from: "Diane", fromPole: "ACQ", to: "Victor", toPole: "SYS",
    subject: "Question : seuil ICP pour segment PME",
    content: "Victor, pour le segment PME (<50 salariés), le seuil ICP actuel de 70 élimine 60% des prospects pourtant intéressants. Recommandation : abaisser à 60 pour ce segment. Peux-tu valider avant que je mette à jour les règles ?",
    type: "question", priority: "MEDIUM", status: "read",
    ts: "2025-03-02T10:05:00Z",
  },
  {
    id: "m5", from: "Nathan", fromPole: "SYS", to: "Victor", toPole: "SYS",
    subject: "ALERTE — Quota Anthropic API à 85%",
    content: "Victor, le quota journalier Anthropic est à 85% à 10h. Si la tendance continue nous serons en rate-limit à 14h. Recommandation : basculer les tâches heartbeat sur Haiku et réserver Opus aux décisions critiques uniquement.",
    type: "escalation", priority: "CRITICAL", status: "pending",
    ts: "2025-03-02T10:15:00Z",
  },
  {
    id: "m6", from: "Alice", fromPole: "GRO", to: "Thomas", toPole: "GRO",
    subject: "Handover nurturing — 8 leads non-répondants",
    content: "Thomas, voici les 8 leads qui n'ont pas répondu à la séquence cold email après 3 touchpoints. Passe-les en nurturing long terme (cycle 30j). Priorité aux leads avec ICP > 80.",
    type: "handoff", priority: "LOW", status: "sent",
    lead: "Scaleway Pro", ts: "2025-03-02T11:00:00Z",
  },
  {
    id: "m7", from: "Clara", fromPole: "GOV", to: "Victor", toPole: "SYS",
    subject: "Validation RGPD — Nouveau dataset BODACC",
    content: "Victor, j'ai audité le nouveau dataset BODACC (1 240 entrées). Conformité OK sur données publiques. Point d'attention : 3 contacts LinkedIn scrappés sans consentement explicite. Recommande suppression avant enrichissement.",
    type: "approval", priority: "HIGH", status: "read",
    ts: "2025-03-02T11:30:00Z",
  },
  {
    id: "m8", from: "Victor", fromPole: "SYS", to: "Paul", toPole: "SUP",
    subject: "Rapport coûts tokens — Fin de semaine",
    content: "Paul, merci de générer le rapport hebdomadaire de consommation tokens pour les 16 agents. Format souhaité : CSV + résumé exécutif. Inclure projection mensuelle et comparaison vs budget alloué.",
    type: "dispatch", priority: "LOW", status: "read",
    ts: "2025-03-02T12:00:00Z",
  },
  {
    id: "m9", from: "Iris", fromPole: "ACQ", to: "Victor", toPole: "SYS",
    subject: "Signal PESTEL détecté — Loi IA européenne",
    content: "Victor, j'ai détecté un signal HIGH sur la loi IA européenne (entrée en vigueur Q3 2025). Impact potentiel sur nos processus de scoring automatisé. Recommande review immédiate avec Clara (conformité). Voir rapport détaillé.",
    type: "escalation", priority: "HIGH", status: "pending",
    ts: "2025-03-01T16:45:00Z",
  },
  {
    id: "m10", from: "Margaux", fromPole: "GRO", to: "Alice", toPole: "GRO",
    subject: "Client converti — Demande onboarding",
    content: "Alice, FlowCRM vient de signer (€2 500/mois, T2). Peux-tu arrêter toutes les séquences outbound pour ce compte et me passer la main pour l'onboarding ? Deadline intégration : 5 jours ouvrés.",
    type: "handoff", priority: "HIGH", status: "sent",
    lead: "FlowCRM", ts: "2025-03-01T15:20:00Z",
  },
  {
    id: "m11", from: "Sophie", fromPole: "SYS", to: "Victor", toPole: "SYS",
    subject: "Anomalie détectée — Taux conversion chute -15%",
    content: "Victor, analyse des métriques de la semaine : taux de conversion Activation → Qualified en baisse de 15% vs semaine précédente. Corrélation probable avec changement des critères ICP le 24 fév. Nécessite investigation.",
    type: "escalation", priority: "HIGH", status: "read",
    ts: "2025-03-01T14:10:00Z",
  },
  {
    id: "m12", from: "Yann", fromPole: "GRO", to: "Margaux", toPole: "GRO",
    subject: "Programme referral — 3 nouvelles demandes",
    content: "Margaux, 3 de nos clients T1 ont exprimé un intérêt pour le programme referral. DataNova SAS, CloudStack et Innov360. Peux-tu les contacter pour les conditions du programme ? Commission proposée : 15% sur 3 mois.",
    type: "dispatch", priority: "MEDIUM", status: "sent",
    ts: "2025-03-01T13:00:00Z",
  },
  {
    id: "m13", from: "Léa", fromPole: "SUP", to: "Victor", toPole: "SYS",
    subject: "Maintenance planifiée — Agent Hugo offline 2h",
    content: "Victor, maintenance préventive de l'agent Hugo planifiée demain de 03h00 à 05h00 (fenêtre à faible activité). Hugo ne sera pas disponible pour les tâches de scraping pendant cette période. Recommande de ne pas planifier de batches.",
    type: "approval", priority: "LOW", status: "read",
    ts: "2025-03-01T11:30:00Z",
  },
  {
    id: "m14", from: "Victor", fromPole: "SYS", to: "Camille", toPole: "OPS",
    subject: "Formation Jules — Module scoring ICP",
    content: "Camille, merci de planifier une session de formation pour Jules sur le module scoring ICP. Objectif : Jules doit être capable d'assister Diane sur les batches de scoring d'ici 2 semaines. Support de formation disponible dans /agent-files/jules/training.",
    type: "dispatch", priority: "LOW", status: "sent",
    ts: "2025-02-28T17:00:00Z",
  },
  {
    id: "m15", from: "Simon", fromPole: "ACQ", to: "Diane", toPole: "ACQ",
    subject: "Enrichissement terminé — 34 leads prêts",
    content: "Diane, j'ai terminé l'enrichissement des 34 leads de la queue. Données LinkedIn vérifiées pour 28/34 (82%), chiffres d'affaires estimés pour 31/34. Les 3 manquants ont des profils trop peu renseignés. Voir queue de scoring.",
    type: "handoff", priority: "MEDIUM", status: "read",
    lead: "TechVision SAS", ts: "2025-02-28T14:20:00Z",
  },
]

const BAR_DATA = [
  { day: "Lun", count: 8 },
  { day: "Mar", count: 12 },
  { day: "Mer", count: 7 },
  { day: "Jeu", count: 15 },
  { day: "Ven", count: 10 },
  { day: "Sam", count: 3 },
  { day: "Dim", count: 1 },
]

const PRIORITY_PIE = [
  { name: "CRITICAL", value: 2,  color: "#ef4444" },
  { name: "HIGH",     value: 7,  color: "#f97316" },
  { name: "MEDIUM",   value: 4,  color: "#eab308" },
  { name: "LOW",      value: 2,  color: "#64748b" },
]

const TOP_PAIRS = [
  { pair: "Victor → équipe", count: 5 },
  { pair: "Alice ↔ Thomas",  count: 3 },
  { pair: "Hugo → Simon",    count: 3 },
  { pair: "Diane → Victor",  count: 2 },
  { pair: "Iris → Victor",   count: 2 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString())     return "Aujourd'hui"
  if (d.toDateString() === yesterday.toDateString()) return "Hier"
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
}

const TYPE_STYLES: Record<MessageType, { label: string; cls: string }> = {
  dispatch:   { label: "Dispatch",   cls: "bg-blue-600/20 text-blue-400 border-blue-700/40"     },
  question:   { label: "Question",   cls: "bg-amber-600/20 text-amber-400 border-amber-700/40"  },
  approval:   { label: "Approbation",cls: "bg-purple-600/20 text-purple-400 border-purple-700/40"},
  escalation: { label: "Escalation", cls: "bg-red-600/20 text-red-400 border-red-700/40"        },
  handoff:    { label: "Handoff",    cls: "bg-green-600/20 text-green-400 border-green-700/40"  },
}

const PRIORITY_STYLES: Record<Priority, string> = {
  CRITICAL: "bg-red-600/20 text-red-400 border-red-700/40",
  HIGH:     "bg-orange-600/20 text-orange-400 border-orange-700/40",
  MEDIUM:   "bg-yellow-600/20 text-yellow-400 border-yellow-700/40",
  LOW:      "bg-slate-700/40 text-slate-400 border-slate-700/40",
}

const STATUS_STYLES: Record<MsgStatus, { label: string; cls: string; Icon: typeof CheckCheck }> = {
  sent:    { label: "Envoyé",  cls: "text-blue-400",   Icon: ArrowRight    },
  read:    { label: "Lu",      cls: "text-emerald-400", Icon: CheckCheck    },
  pending: { label: "Pending", cls: "text-orange-400",  Icon: Clock         },
  failed:  { label: "Échoué", cls: "text-red-400",     Icon: AlertTriangle },
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Av({ name, pole, size = 10 }: { name: string; pole: string; size?: number }) {
  const cls = `w-${size} h-${size}`
  return (
    <span className={cn(
      "inline-flex items-center justify-center rounded-full text-white font-bold shrink-0",
      cls,
      POLE_BG[pole] ?? "bg-slate-600",
      size === 10 ? "text-sm" : "text-xs",
    )}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}

// ─── Message card ─────────────────────────────────────────────────────────────

function MessageCard({ msg, side }: { msg: HMessage; side: "left" | "right" }) {
  const [expanded, setExpanded] = useState(false)
  const [copied,   setCopied]   = useState(false)
  const { Icon: StIcon, cls: stCls, label: stLabel } = STATUS_STYLES[msg.status]
  const typeStyle = TYPE_STYLES[msg.type]
  const truncated = msg.content.length > 200

  function copy() {
    navigator.clipboard.writeText(msg.content).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={cn(
      "flex items-start gap-3 w-full",
      side === "right" && "flex-row-reverse",
    )}>
      {/* Spacer */}
      <div className="flex-1 hidden lg:block" />

      {/* Card */}
      <div className="w-full lg:max-w-lg bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 hover:border-slate-700 transition-colors">
        {/* Header: from → to */}
        <div className="flex items-center gap-2 flex-wrap">
          <Av name={msg.from} pole={msg.fromPole} />
          <span className="text-sm font-semibold text-slate-200">{msg.from}</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <Av name={msg.to} pole={msg.toPole} />
          <span className="text-sm font-semibold text-slate-200">{msg.to}</span>
          <span className="ml-auto text-xs text-slate-600">{relTime(msg.ts)}</span>
        </div>

        {/* Subject */}
        <p className="text-sm font-semibold text-slate-100 leading-snug">{msg.subject}</p>

        {/* Content */}
        <p className="text-sm text-slate-400 leading-relaxed">
          {!expanded && truncated ? msg.content.slice(0, 200) + "…" : msg.content}
        </p>
        {truncated && (
          <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
            {expanded ? <><ChevronUp className="w-3 h-3" /> Réduire</> : <><ChevronDown className="w-3 h-3" /> Voir plus</>}
          </button>
        )}

        {/* Badges */}
        <div className="flex items-center flex-wrap gap-1.5">
          <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border", typeStyle.cls)}>
            {typeStyle.label}
          </span>
          <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border", PRIORITY_STYLES[msg.priority])}>
            {msg.priority}
          </span>
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium", stCls)}>
            <StIcon className="w-3 h-3" />{stLabel}
          </span>
          {msg.lead && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400">
              <MessageSquare className="w-2.5 h-2.5" /> {msg.lead}
            </span>
          )}
          <button onClick={copy} className="ml-auto text-slate-600 hover:text-slate-400 transition-colors">
            <Copy className="w-3.5 h-3.5" />
          </button>
          {copied && <span className="text-[10px] text-emerald-400">Copié</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Stats sidebar ────────────────────────────────────────────────────────────

function StatsSidebar() {
  return (
    <aside className="hidden xl:flex flex-col gap-4 w-72 shrink-0">
      {/* Bar chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Messages / jour</p>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={BAR_DATA} barSize={14}>
            <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, fontSize: 11 }} />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {BAR_DATA.map((_, i) => (
                <Cell key={i} fill={i === 3 ? "#3b82f6" : "#1e3a5f"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top pairs */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Top paires</p>
        {TOP_PAIRS.map(p => (
          <div key={p.pair} className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400 truncate">{p.pair}</span>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(p.count / 5) * 100}%` }} />
              </div>
              <span className="text-xs text-slate-500 w-3 text-right">{p.count}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Donut priority */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Distribution priorité</p>
        <div className="flex items-center gap-3">
          <ResponsiveContainer width={80} height={80}>
            <PieChart>
              <Pie data={PRIORITY_PIE} cx={35} cy={35} innerRadius={22} outerRadius={36} dataKey="value" paddingAngle={2}>
                {PRIORITY_PIE.map((p, i) => <Cell key={i} fill={p.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5">
            {PRIORITY_PIE.map(p => (
              <div key={p.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                <span className="text-[10px] text-slate-400">{p.name}</span>
                <span className="text-[10px] text-slate-600 ml-auto">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Avg response */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Temps de réponse moyen</p>
        {[
          { pair: "Victor ↔ Diane",  time: "2.1 min" },
          { pair: "Hugo ↔ Simon",    time: "4.3 min" },
          { pair: "Alice ↔ Thomas",  time: "8.7 min" },
          { pair: "Iris ↔ Victor",   time: "3.2 min" },
        ].map(r => (
          <div key={r.pair} className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{r.pair}</span>
            <span className="text-xs font-mono text-slate-300">{r.time}</span>
          </div>
        ))}
      </div>
    </aside>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HandoverPage() {
  const [filterFrom,     setFilterFrom]     = useState("all")
  const [filterTo,       setFilterTo]       = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")
  const [filterStatus,   setFilterStatus]   = useState("all")

  const agents = useMemo(() => {
    const names = new Set<string>()
    MESSAGES.forEach(m => { names.add(m.from); names.add(m.to) })
    return Array.from(names).sort()
  }, [])

  const filtered = useMemo(() => MESSAGES.filter(m => {
    if (filterFrom     !== "all" && m.from     !== filterFrom)     return false
    if (filterTo       !== "all" && m.to       !== filterTo)       return false
    if (filterPriority !== "all" && m.priority !== filterPriority) return false
    if (filterStatus   !== "all" && m.status   !== filterStatus)   return false
    return true
  }), [filterFrom, filterTo, filterPriority, filterStatus])

  // Group by day
  const grouped = useMemo(() => {
    const map = new Map<string, HMessage[]>()
    for (const m of filtered) {
      const label = dayLabel(m.ts)
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(m)
    }
    return map
  }, [filtered])

  const pending = MESSAGES.filter(m => m.status === "pending").length

  const selCls = "bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Handover</h1>
            <p className="text-sm text-slate-400 mt-0.5">Communications inter-agents</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2">
            <span className="text-slate-200 font-medium">47 messages aujourd'hui</span>
            <span className="w-px h-4 bg-slate-700" />
            <span>Temps réponse moyen: <span className="text-slate-200">3.2min</span></span>
            <span className="w-px h-4 bg-slate-700" />
            {pending > 0 && (
              <span className="flex items-center gap-1 text-orange-400 font-medium">
                <Clock className="w-3.5 h-3.5" />{pending} pending
              </span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-2">
          <select value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className={selCls}>
            <option value="all">Émetteur : tous</option>
            {agents.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterTo} onChange={e => setFilterTo(e.target.value)} className={selCls}>
            <option value="all">Destinataire : tous</option>
            {agents.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className={selCls}>
            <option value="all">Priorité : toutes</option>
            {["CRITICAL","HIGH","MEDIUM","LOW"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selCls}>
            <option value="all">Status : tous</option>
            {["sent","read","pending","failed"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(filterFrom !== "all" || filterTo !== "all" || filterPriority !== "all" || filterStatus !== "all") && (
            <button onClick={() => { setFilterFrom("all"); setFilterTo("all"); setFilterPriority("all"); setFilterStatus("all") }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2">
              Réinitialiser
            </button>
          )}
          <span className="ml-auto text-xs text-slate-600">{filtered.length} message{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex gap-6 items-start">
        {/* Timeline */}
        <div className="flex-1 min-w-0 relative">
          {/* Vertical spine */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-800 -translate-x-1/2 hidden lg:block" />

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <MessageSquare className="w-10 h-10 mb-3" />
              <p className="text-sm">Aucun message correspond aux filtres</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {Array.from(grouped.entries()).map(([day, msgs]) => (
                <div key={day} className="flex flex-col gap-4">
                  {/* Day separator */}
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="flex-1 h-px bg-slate-800 hidden lg:block" />
                    <span className="text-xs font-semibold text-slate-500 bg-slate-950 px-3 py-1 rounded-full border border-slate-800 whitespace-nowrap">
                      {day}
                    </span>
                    <div className="flex-1 h-px bg-slate-800 hidden lg:block" />
                  </div>

                  {msgs.map((msg, idx) => (
                    <div key={msg.id} className="relative z-10">
                      {/* Center dot on spine */}
                      <div className="absolute left-1/2 top-5 w-2.5 h-2.5 rounded-full bg-slate-700 border-2 border-slate-600 -translate-x-1/2 hidden lg:block" />
                      <MessageCard msg={msg} side={idx % 2 === 0 ? "left" : "right"} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <StatsSidebar />
      </div>
    </div>
  )
}
