"use client"

import { useState } from "react"
import {
  Radio, BookOpen, Target, Send, ExternalLink, Check, X, ChevronDown,
  ArrowRight, TrendingUp, TrendingDown, Minus, AlertTriangle, Globe,
  Twitter, Linkedin, Youtube, MessageSquare, Rss, Search, Filter,
  BarChart2, RefreshCw, Mail, Users, MousePointerClick, Calendar,
  ThumbsUp, ThumbsDown, Eye, Zap,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type SignalStatus = "pending" | "approved" | "rejected" | "dispatched"
type Impact = "HIGH" | "MEDIUM" | "LOW"
type SourceType = "Twitter" | "Reddit" | "YouTube" | "LinkedIn" | "RSS"

interface KnowledgeSignal {
  id: number
  source: SourceType
  handle: string
  impact: Impact
  title: string
  content: string
  url: string
  company?: string
  sector?: string
  status: SignalStatus
  timestamp: string
}

type ThreatLevel = "HIGH" | "MEDIUM" | "LOW"

interface StrategySignal {
  id: number
  title: string
  description: string
  source: string
  date: string
  threat: ThreatLevel
  impactArea: string
  approved: boolean | null
}

interface Campaign {
  id: number
  name: string
  agent: string
  sent: number
  opened: number
  replies: number
  meetings: number
  status: "active" | "paused" | "completed"
}

interface InboundSource {
  source: string
  leads: number
  qualified: number
  avgScore: number
  sentiment: "positive" | "neutral" | "negative"
  trend: "up" | "down" | "flat"
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const KNOWLEDGE_SIGNALS: KnowledgeSignal[] = [
  {
    id: 1, source: "Twitter", handle: "@levie", impact: "HIGH",
    title: "Box CEO: L'IA multi-agents va révolutionner les workflows d'entreprise d'ici Q3 2025",
    content: "Just talked to 50+ enterprise CIOs this month. The shift to agentic AI is happening faster than anyone predicted. Companies deploying multi-agent systems are seeing 3-5x productivity gains. This isn't hype—the numbers are real.",
    url: "https://twitter.com", timestamp: "Il y a 2h", status: "pending",
    company: "Box Inc", sector: "Enterprise SaaS",
  },
  {
    id: 2, source: "Reddit", handle: "r/SaaS", impact: "MEDIUM",
    title: "Thread viral : \"Nous avons remplacé notre SDR team par des agents IA — voici les résultats après 90 jours\"",
    content: "We went from 3 SDRs to 0, replaced entirely by an AI agent stack. Month 1 was rough (lots of tuning), month 2 we hit parity, month 3 we're at 140% of previous output with 60% lower cost. AMA.",
    url: "https://reddit.com", timestamp: "Il y a 4h", status: "approved",
    company: undefined, sector: undefined,
  },
  {
    id: 3, source: "LinkedIn", handle: "Sarah Chen • VP Sales, Rippling", impact: "HIGH",
    title: "Intent data + AI scoring = la combinaison gagnante pour le pipeline outbound en 2025",
    content: "After testing 6 different intent data providers combined with AI scoring models over 6 months, here's what actually moves the needle. Spoiler: it's not about more data, it's about better signal quality and speed to contact.",
    url: "https://linkedin.com", timestamp: "Il y a 6h", status: "pending",
    company: "Rippling", sector: "HR Tech / Payroll",
  },
  {
    id: 4, source: "YouTube", handle: "SaaStr Annual 2025",  impact: "LOW",
    title: "Jason Lemkin : \"Les meilleurs SaaS B2B vont atteindre $1M ARR avec moins de 5 employés grâce à l'IA\"",
    content: "In his keynote at SaaStr Annual, Jason Lemkin predicts a fundamental shift in how SaaS companies are built. The combination of AI agents for sales, support, and operations means leaner teams, faster growth.",
    url: "https://youtube.com", timestamp: "Il y a 8h", status: "rejected",
  },
  {
    id: 5, source: "RSS", handle: "TechCrunch — Enterprise", impact: "MEDIUM",
    title: "Outreach.io lance Outreach AI Agent : concurrent direct à notre stack multi-agents",
    content: "Outreach today announced its AI Agent platform, which promises to autonomously handle prospecting, sequencing, and meeting booking. The system uses GPT-4 under the hood and integrates directly with Salesforce.",
    url: "https://techcrunch.com", timestamp: "Il y a 12h", status: "dispatched",
    company: "Outreach.io", sector: "Sales Engagement",
  },
  {
    id: 6, source: "Twitter", handle: "@jasonlk", impact: "HIGH",
    title: "Les levées de fonds SaaS B2B en Europe atteignent un record : €4.2B au Q1 2025",
    content: "European B2B SaaS is on fire. €4.2B raised in Q1 alone, led by AI-native companies. The top 10 deals all have 'AI' or 'agent' in their pitch deck. VCs are doubling down on anything that shows path to $1M ARR with minimal headcount.",
    url: "https://twitter.com", timestamp: "Il y a 1j", status: "pending",
  },
  {
    id: 7, source: "Reddit", handle: "r/entrepreneur", impact: "LOW",
    title: "Mon retour d'expérience sur 18 mois d'outreach automatisé — ce qui marche vraiment",
    content: "I've sent over 200,000 automated B2B outreach emails over the past 18 months. Here's my brutally honest breakdown of what works, what doesn't, and why most people are doing it completely wrong.",
    url: "https://reddit.com", timestamp: "Il y a 1j", status: "pending",
  },
  {
    id: 8, source: "LinkedIn", handle: "Guillaume Cabane • Growth Advisor", impact: "MEDIUM",
    title: "Pourquoi le ICP scoring basé sur l'intention est 4x plus efficace que le firmographic scoring",
    content: "Most companies are scoring leads wrong. They rely on firmographic data (company size, industry, location) when they should be using behavioral signals and intent data. Here's the framework I've used to 4x pipeline quality at 3 unicorns.",
    url: "https://linkedin.com", timestamp: "Il y a 2j", status: "pending",
    company: undefined, sector: undefined,
  },
  {
    id: 9, source: "RSS", handle: "Product Hunt — Daily Digest", impact: "LOW",
    title: "#1 Product of the Day : Clay 3.0 — Waterfall enrichment avec 50+ sources de données",
    content: "Clay just launched v3.0 with waterfall enrichment across 50+ data providers, AI-powered personalization at scale, and native CRM sync. 847 upvotes in the first 6 hours.",
    url: "https://producthunt.com", timestamp: "Il y a 2j", status: "dispatched",
    company: "Clay", sector: "Data Enrichment",
  },
  {
    id: 10, source: "Twitter", handle: "@dharmesh", impact: "MEDIUM",
    title: "HubSpot intègre des agents IA autonomes dans son CRM — lancement Q2 2025",
    content: "Big news: we're launching HubSpot AI Agents in Q2. These aren't just copilots—they're fully autonomous agents that can research prospects, write personalized outreach, book meetings, and update your CRM. This changes everything.",
    url: "https://twitter.com", timestamp: "Il y a 3j", status: "pending",
    company: "HubSpot", sector: "CRM / Marketing",
  },
  {
    id: 11, source: "LinkedIn", handle: "Benoît Lecerf • DG, Scale AI France", impact: "HIGH",
    title: "Rapport INSEE : la digitalisation des PME françaises accélère — 68% adoptent des outils IA en 2025",
    content: "Le dernier rapport INSEE confirme que 68% des PME françaises (50-500 salariés) ont adopté ou prévoient d'adopter des outils d'IA d'ici fin 2025. Le segment B2B est particulièrement actif avec des budgets moyens en hausse de 34%.",
    url: "https://linkedin.com", timestamp: "Il y a 3j", status: "pending",
    company: undefined, sector: undefined,
  },
  {
    id: 12, source: "Reddit", handle: "r/sales", impact: "LOW",
    title: "Discussion : Les meilleures pratiques pour personnaliser l'outreach IA sans paraître robotique",
    content: "We've all received those obviously AI-written cold emails. But some companies are doing it really well—the messages feel genuinely personal even at scale. What separates good AI outreach from bad? Let's discuss.",
    url: "https://reddit.com", timestamp: "Il y a 4j", status: "approved",
  },
]

const STRATEGY_SIGNALS: StrategySignal[] = [
  {
    id: 1,
    title: "Salesforce lance Einstein GPT pour le scoring automatique des leads",
    description: "Salesforce intègre Einstein GPT directement dans Sales Cloud pour le scoring de leads en temps réel. Fonctionnalités similaires à notre agent Diane. Budget de déploiement estimé : $2B. Accès dès le Q2 2025 pour les clients Enterprise.",
    source: "TechCrunch", date: "Il y a 3h", threat: "HIGH", impactArea: "Scoring", approved: null,
  },
  {
    id: 2,
    title: "HubSpot + Clay : nouvelle intégration native pour l'enrichissement",
    description: "HubSpot annonce une intégration native avec Clay pour l'enrichissement de données. Les utilisateurs CRM HubSpot pourront enrichir automatiquement leurs contacts via 50+ sources de données sans code. Impact direct sur notre proposition de valeur enrichissement.",
    source: "Product Hunt", date: "Il y a 6h", threat: "MEDIUM", impactArea: "Enrichissement", approved: null,
  },
  {
    id: 3,
    title: "Nouvelle directive CNIL : restrictions sur le cold outreach automatisé B2B",
    description: "La CNIL publie un avis consultatif sur l'utilisation d'agents IA pour le prospecting B2B. Les systèmes entièrement automatisés doivent désormais inclure un mécanisme de supervision humaine et un log d'audit. Délai de conformité : 6 mois.",
    source: "CNIL", date: "Il y a 1j", threat: "HIGH", impactArea: "Conformité", approved: null,
  },
  {
    id: 4,
    title: "Apollo.io lève $100M Série D pour accélérer son moteur IA commercial",
    description: "Apollo.io confirme une levée de $100M pour développer son IA de prospecting. Objectif annoncé : passer de 500K à 1M de clients d'ici fin 2025. Nouvelles features : intent scoring, autonomous sequencing, and meeting booking agent.",
    source: "Crunchbase", date: "Il y a 2j", threat: "MEDIUM", impactArea: "Prospection", approved: null,
  },
  {
    id: 5,
    title: "Gartner Magic Quadrant Sales Tech 2025 — les agents autonomes dominent",
    description: "Gartner positionne les plateformes d'agents IA autonomes en 'Leaders' du nouveau quadrant Sales Tech 2025. Les outils multi-agents capables de couvrir l'intégralité du funnel AARRR sont identifiés comme la tendance prioritaire.",
    source: "Gartner", date: "Il y a 3j", threat: "LOW", impactArea: "Marché", approved: true,
  },
  {
    id: 6,
    title: "ZoomInfo acquiert DemandScience — consolidation du marché data B2B",
    description: "ZoomInfo finalise l'acquisition de DemandScience pour $450M, créant le plus grand agrégateur de data B2B au monde. La base combinée couvre 150M de contacts. Impact potentiel sur nos sources de données BODACC et les alternatives européennes.",
    source: "Reuters", date: "Il y a 4j", threat: "HIGH", impactArea: "Données", approved: null,
  },
]

const CAMPAIGNS: Campaign[] = [
  { id: 1, name: "Séquence SaaS PME Q1", agent: "Simon", sent: 342, opened: 156, replies: 47, meetings: 8, status: "active" },
  { id: 2, name: "ABM Enterprise Tech", agent: "Simon", sent: 87, opened: 54, replies: 23, meetings: 6, status: "active" },
  { id: 3, name: "Relance Inactifs 30j", agent: "Hugo", sent: 198, opened: 67, replies: 18, meetings: 2, status: "active" },
  { id: 4, name: "Event Follow-up Vivatech", agent: "Simon", sent: 123, opened: 89, replies: 34, meetings: 11, status: "completed" },
  { id: 5, name: "LinkedIn Cold PME Fintech", agent: "Diane", sent: 215, opened: 98, replies: 31, meetings: 5, status: "active" },
  { id: 6, name: "Nurturing BODACC Créations", agent: "Hugo", sent: 167, opened: 72, replies: 19, meetings: 3, status: "paused" },
  { id: 7, name: "Warm Intro via Referral", agent: "Yann", sent: 56, opened: 48, replies: 22, meetings: 9, status: "active" },
  { id: 8, name: "Réactivation Perdus H2 2024", agent: "Thomas", sent: 59, opened: 23, replies: 7, meetings: 1, status: "paused" },
]

const INBOUND_SOURCES: InboundSource[] = [
  { source: "Site web (formulaire)", leads: 89, qualified: 34, avgScore: 72, sentiment: "positive", trend: "up" },
  { source: "LinkedIn Organic", leads: 67, qualified: 41, avgScore: 81, sentiment: "positive", trend: "up" },
  { source: "Referral / Bouche-à-oreille", leads: 23, qualified: 19, avgScore: 87, sentiment: "positive", trend: "flat" },
  { source: "Content / SEO", leads: 112, qualified: 28, avgScore: 61, sentiment: "neutral", trend: "up" },
  { source: "Événements & webinaires", leads: 45, qualified: 31, avgScore: 78, sentiment: "positive", trend: "down" },
]

// ─── Small helpers ────────────────────────────────────────────────────────────

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ")
}

function SourceIcon({ source }: { source: SourceType }) {
  const map: Record<SourceType, React.ReactNode> = {
    Twitter:  <Twitter  className="w-3.5 h-3.5" />,
    Reddit:   <MessageSquare className="w-3.5 h-3.5" />,
    YouTube:  <Youtube  className="w-3.5 h-3.5" />,
    LinkedIn: <Linkedin className="w-3.5 h-3.5" />,
    RSS:      <Rss      className="w-3.5 h-3.5" />,
  }
  const colors: Record<SourceType, string> = {
    Twitter:  "bg-sky-500/20 text-sky-400",
    Reddit:   "bg-orange-500/20 text-orange-400",
    YouTube:  "bg-red-500/20 text-red-400",
    LinkedIn: "bg-blue-500/20 text-blue-400",
    RSS:      "bg-amber-500/20 text-amber-400",
  }
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium", colors[source])}>
      {map[source]} {source}
    </span>
  )
}

function ImpactBadge({ level }: { level: Impact }) {
  const styles: Record<Impact, string> = {
    HIGH:   "bg-red-500/20 text-red-400 border border-red-500/30",
    MEDIUM: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    LOW:    "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  }
  return <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide", styles[level])}>{level}</span>
}

function ThreatBadge({ level }: { level: ThreatLevel }) {
  const styles: Record<ThreatLevel, string> = {
    HIGH:   "bg-red-500/20 text-red-400 border border-red-500/30",
    MEDIUM: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    LOW:    "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  }
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide", styles[level])}>
      <AlertTriangle className="w-2.5 h-2.5" /> {level}
    </span>
  )
}

function StatusDot({ status }: { status: SignalStatus }) {
  const map: Record<SignalStatus, { color: string; label: string }> = {
    pending:    { color: "bg-amber-400",   label: "En attente" },
    approved:   { color: "bg-emerald-400", label: "Approuvé"   },
    rejected:   { color: "bg-red-400",     label: "Rejeté"     },
    dispatched: { color: "bg-blue-400",    label: "Dispatché"  },
  }
  const { color, label } = map[status]
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
      <span className={cn("w-1.5 h-1.5 rounded-full", color)} /> {label}
    </span>
  )
}

// ─── Tab 1: Knowledge ─────────────────────────────────────────────────────────

const SOURCE_FILTERS: (SourceType | "ALL")[] = ["ALL", "Twitter", "LinkedIn", "Reddit", "YouTube", "RSS"]
const IMPACT_FILTERS: (Impact | "ALL")[] = ["ALL", "HIGH", "MEDIUM", "LOW"]
const DATE_FILTERS = ["24h", "7j", "30j"] as const
type DateFilter = typeof DATE_FILTERS[number]

function KnowledgeTab() {
  const [signals, setSignals] = useState<KnowledgeSignal[]>(KNOWLEDGE_SIGNALS)
  const [sourceFilter, setSourceFilter] = useState<SourceType | "ALL">("ALL")
  const [impactFilter, setImpactFilter] = useState<Impact | "ALL">("ALL")
  const [dateFilter, setDateFilter] = useState<DateFilter>("7j")
  const [dispatchOpen, setDispatchOpen] = useState<number | null>(null)

  const AGENTS = ["Victor", "Hugo", "Simon", "Diane", "Alice"]

  const filtered = signals.filter(s => {
    if (sourceFilter !== "ALL" && s.source !== sourceFilter) return false
    if (impactFilter !== "ALL" && s.impact !== impactFilter) return false
    return true
  })

  const approve  = (id: number) => setSignals(prev => prev.map(s => s.id === id ? { ...s, status: "approved"   } : s))
  const reject   = (id: number) => setSignals(prev => prev.map(s => s.id === id ? { ...s, status: "rejected"   } : s))
  const dispatch = (id: number) => { setSignals(prev => prev.map(s => s.id === id ? { ...s, status: "dispatched" } : s)); setDispatchOpen(null) }

  const approved   = signals.filter(s => s.status === "approved").length
  const pending    = signals.filter(s => s.status === "pending").length
  const dispatched = signals.filter(s => s.status === "dispatched").length

  const sourceStats = (["Twitter","LinkedIn","Reddit","YouTube","RSS"] as SourceType[]).map(src => ({
    src, count: signals.filter(s => s.source === src).length,
  }))
  const maxSrc = Math.max(...sourceStats.map(x => x.count), 1)

  const impactStats: { label: Impact; color: string }[] = [
    { label: "HIGH",   color: "bg-red-500"    },
    { label: "MEDIUM", color: "bg-amber-500"  },
    { label: "LOW",    color: "bg-emerald-500" },
  ]

  return (
    <div className="flex gap-4">
      {/* Main grid */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Veille Marche & Technologique</h2>
            <p className="text-xs text-slate-500 mt-0.5">{filtered.length} signaux · {pending} en attente de validation</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Configurer sources
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1">
            {SOURCE_FILTERS.map(f => (
              <button key={f} onClick={() => setSourceFilter(f)}
                className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  sourceFilter === f ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700")}>
                {f === "ALL" ? "Toutes" : f}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {IMPACT_FILTERS.map(f => (
              <button key={f} onClick={() => setImpactFilter(f)}
                className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  impactFilter === f ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700")}>
                {f === "ALL" ? "Tout impact" : f}
              </button>
            ))}
          </div>
          <div className="flex gap-0.5 bg-slate-800 rounded-md p-0.5">
            {DATE_FILTERS.map(f => (
              <button key={f} onClick={() => setDateFilter(f)}
                className={cn("px-2.5 py-1 rounded text-xs font-medium transition-colors",
                  dateFilter === f ? "bg-slate-700 text-slate-100" : "text-slate-500 hover:text-slate-300")}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {filtered.map(signal => (
            <div key={signal.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors">
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SourceIcon source={signal.source} />
                  <span className="text-[11px] text-slate-500">{signal.handle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ImpactBadge level={signal.impact} />
                  <span className="text-[11px] text-slate-600">{signal.timestamp}</span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-slate-100 mb-1.5 leading-snug line-clamp-2">
                {signal.title}
              </h3>

              {/* Content */}
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-2">
                {signal.content}
              </p>

              {/* URL */}
              <a href={signal.url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 mb-2">
                <ExternalLink className="w-3 h-3" /> Voir la source
              </a>

              {/* Company chip */}
              {signal.company && (
                <div className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-md px-2 py-1 mb-2 ml-3">
                  <Globe className="w-3 h-3 text-slate-500" />
                  <span className="text-[11px] text-slate-300">{signal.company}</span>
                  {signal.sector && <span className="text-[11px] text-slate-500">· {signal.sector}</span>}
                </div>
              )}

              {/* Status + actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-1">
                <StatusDot status={signal.status} />
                <div className="flex items-center gap-1.5">
                  {signal.status !== "rejected" && signal.status !== "approved" && (
                    <>
                      <button onClick={() => approve(signal.id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600/15 hover:bg-emerald-600/30 border border-emerald-700/30 rounded text-[11px] text-emerald-400 transition-colors">
                        <Check className="w-3 h-3" /> Approuver
                      </button>
                      <button onClick={() => reject(signal.id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-red-600/15 hover:bg-red-600/30 border border-red-700/30 rounded text-[11px] text-red-400 transition-colors">
                        <X className="w-3 h-3" /> Rejeter
                      </button>
                    </>
                  )}
                  {signal.status === "approved" && (
                    <div className="relative">
                      <button onClick={() => setDispatchOpen(dispatchOpen === signal.id ? null : signal.id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/15 hover:bg-blue-600/30 border border-blue-700/30 rounded text-[11px] text-blue-400 transition-colors">
                        <ArrowRight className="w-3 h-3" /> Dispatcher <ChevronDown className="w-3 h-3" />
                      </button>
                      {dispatchOpen === signal.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 py-1">
                          {AGENTS.map(a => (
                            <button key={a} onClick={() => dispatch(signal.id)}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                              {a}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats sidebar */}
      <aside className="w-64 shrink-0 space-y-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Aujourd'hui</h4>
          <div className="space-y-2">
            {[
              { label: "Total signaux", value: signals.length, color: "text-slate-100" },
              { label: "En attente",    value: pending,        color: "text-amber-400" },
              { label: "Approuves",     value: approved,       color: "text-emerald-400" },
              { label: "Dispatches",    value: dispatched,     color: "text-blue-400" },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center">
                <span className="text-xs text-slate-500">{row.label}</span>
                <span className={cn("text-sm font-bold", row.color)}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Top sources</h4>
          <div className="space-y-2">
            {sourceStats.sort((a, b) => b.count - a.count).map(({ src, count }) => (
              <div key={src}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-400">{src}</span>
                  <span className="text-slate-500">{count}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(count / maxSrc) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Par impact</h4>
          <div className="flex items-center justify-center gap-3">
            {impactStats.map(({ label, color }) => {
              const count = signals.filter(s => s.impact === label).length
              const pct = Math.round((count / signals.length) * 100)
              return (
                <div key={label} className="text-center">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1 text-white text-xs font-bold", color)}>
                    {pct}%
                  </div>
                  <span className="text-[10px] text-slate-500">{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </aside>
    </div>
  )
}

// ─── Tab 2: Strategy ──────────────────────────────────────────────────────────

function StrategyTab() {
  const [signals, setSignals] = useState<StrategySignal[]>(STRATEGY_SIGNALS)

  const approve = (id: number) => setSignals(prev => prev.map(s => s.id === id ? { ...s, approved: true  } : s))
  const dismiss = (id: number) => setSignals(prev => prev.map(s => s.id === id ? { ...s, approved: false } : s))

  const high   = signals.filter(s => s.threat === "HIGH").length
  const medium = signals.filter(s => s.threat === "MEDIUM").length
  const low    = signals.filter(s => s.threat === "LOW").length

  const marketShare = [
    { label: "Us",          pct: 12, color: "bg-blue-500"    },
    { label: "Salesforce",  pct: 35, color: "bg-cyan-500"    },
    { label: "HubSpot",     pct: 28, color: "bg-orange-500"  },
    { label: "Apollo",      pct: 15, color: "bg-purple-500"  },
    { label: "Others",      pct: 10, color: "bg-slate-600"   },
  ]

  return (
    <div className="flex gap-4">
      <div className="flex-1 min-w-0 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Veille Strategique — Intelligence Concurrentielle</h2>
          <p className="text-xs text-slate-500 mt-0.5">{signals.length} signaux · {high} menaces critiques detectees</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {signals.map(signal => (
            <div key={signal.id} className={cn(
              "bg-slate-900 border rounded-lg p-4 hover:border-slate-600 transition-colors",
              signal.threat === "HIGH" ? "border-red-900/60" : signal.threat === "MEDIUM" ? "border-amber-900/40" : "border-slate-800"
            )}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <ThreatBadge level={signal.threat} />
                  <span className="text-[11px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded">{signal.impactArea}</span>
                </div>
                <span className="text-[11px] text-slate-600 whitespace-nowrap ml-2">{signal.date}</span>
              </div>

              <h3 className="text-sm font-semibold text-slate-100 mb-2 leading-snug">{signal.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3 line-clamp-3">{signal.description}</p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Globe className="w-3 h-3" /> {signal.source}
                </div>
                <div className="flex items-center gap-1.5">
                  {signal.approved === null ? (
                    <>
                      <button onClick={() => approve(signal.id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/15 hover:bg-blue-600/30 border border-blue-700/30 rounded text-[11px] text-blue-400 transition-colors">
                        <Zap className="w-3 h-3" /> Analyser
                      </button>
                      <button onClick={() => dismiss(signal.id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-700/50 hover:bg-slate-700 rounded text-[11px] text-slate-400 transition-colors">
                        <X className="w-3 h-3" /> Ignorer
                      </button>
                    </>
                  ) : signal.approved ? (
                    <span className="flex items-center gap-1 text-[11px] text-blue-400"><Check className="w-3 h-3" /> En analyse</span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500"><X className="w-3 h-3" /> Ignore</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy sidebar */}
      <aside className="w-64 shrink-0 space-y-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Niveau de menace</h4>
          <div className="space-y-2.5">
            {[
              { label: "Menaces critiques", count: high,   color: "text-red-400",     bar: "bg-red-500"    },
              { label: "Menaces moderees",  count: medium, color: "text-amber-400",   bar: "bg-amber-500"  },
              { label: "A surveiller",      count: low,    color: "text-emerald-400", bar: "bg-emerald-500" },
            ].map(row => (
              <div key={row.label}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className={row.color}>{row.label}</span>
                  <span className="text-slate-500 font-medium">{row.count}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", row.bar)} style={{ width: `${(row.count / signals.length) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Parts de marche</h4>
          <div className="space-y-2">
            {marketShare.map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="text-slate-500">{item.pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", item.color)} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Opportunites</h4>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Ce mois</span>
            <span className="text-emerald-400 font-bold">8 opp.</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Menaces actives</span>
            <span className="text-red-400 font-bold">3</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">En analyse</span>
            <span className="text-blue-400 font-bold">{signals.filter(s => s.approved === true).length}</span>
          </div>
        </div>
      </aside>
    </div>
  )
}

// ─── Tab 3: Outbound / Inbound ────────────────────────────────────────────────

function OutboundInboundTab() {
  const [subTab, setSubTab] = useState<"outbound" | "inbound">("outbound")

  const CAMPAIGN_STATS = [
    { label: "Emails envoyes",   value: "1,247", icon: Mail,             color: "text-blue-400" },
    { label: "Taux d'ouverture", value: "34.2%", icon: Eye,              color: "text-amber-400" },
    { label: "Taux de reponse",  value: "12.8%", icon: MessageSquare,    color: "text-emerald-400" },
    { label: "Taux conversion",  value: "3.2%",  icon: MousePointerClick, color: "text-purple-400" },
  ]

  const campaignTotal = CAMPAIGNS.reduce((acc, c) => ({
    sent: acc.sent + c.sent, opened: acc.opened + c.opened,
    replies: acc.replies + c.replies, meetings: acc.meetings + c.meetings,
  }), { sent: 0, opened: 0, replies: 0, meetings: 0 })

  const statusStyle: Record<Campaign["status"], string> = {
    active:    "bg-emerald-500/20 text-emerald-400",
    paused:    "bg-amber-500/20 text-amber-400",
    completed: "bg-slate-600/30 text-slate-400",
  }
  const statusLabel: Record<Campaign["status"], string> = {
    active: "Active", paused: "En pause", completed: "Terminee",
  }

  const sentimentStyle: Record<InboundSource["sentiment"], string> = {
    positive: "text-emerald-400", neutral: "text-slate-400", negative: "text-red-400",
  }
  const sentimentLabel: Record<InboundSource["sentiment"], string> = {
    positive: "Positif", neutral: "Neutre", negative: "Negatif",
  }
  const TrendIcon = ({ trend }: { trend: InboundSource["trend"] }) => {
    if (trend === "up")   return <TrendingUp   className="w-3.5 h-3.5 text-emerald-400" />
    if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />
    return <Minus className="w-3.5 h-3.5 text-slate-500" />
  }

  const weeklyTrend = [28.1, 30.4, 27.8, 33.6, 31.2, 35.8, 34.2]

  return (
    <div className="flex gap-4">
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header stats bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {CAMPAIGN_STATS.map(stat => (
            <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                <stat.icon className={cn("w-4 h-4", stat.color)} />
              </div>
              <div>
                <p className={cn("text-xl font-bold leading-none", stat.color)}>{stat.value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 bg-slate-800/40 p-0.5 rounded-lg w-fit">
          {(["outbound", "inbound"] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize",
                subTab === t ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200")}>
              {t === "outbound" ? "Outbound" : "Inbound"}
            </button>
          ))}
        </div>

        {/* Outbound table */}
        {subTab === "outbound" && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200">Campagnes outbound</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-500 uppercase tracking-wider">
                  {["Campagne", "Agent", "Envoyes", "Ouverts", "Reponses", "Meetings", "Statut"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAMPAIGNS.map(c => (
                  <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors text-sm">
                    <td className="px-4 py-2.5 text-slate-200 font-medium">{c.name}</td>
                    <td className="px-4 py-2.5 text-slate-400">{c.agent}</td>
                    <td className="px-4 py-2.5 text-slate-300">{c.sent}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-amber-400">{c.opened}</span>
                      <span className="text-slate-600 text-xs ml-1">({Math.round(c.opened/c.sent*100)}%)</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-blue-400">{c.replies}</span>
                      <span className="text-slate-600 text-xs ml-1">({Math.round(c.replies/c.sent*100)}%)</span>
                    </td>
                    <td className="px-4 py-2.5 text-emerald-400 font-medium">{c.meetings}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", statusStyle[c.status])}>
                        {statusLabel[c.status]}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-800/30 text-sm font-semibold">
                  <td className="px-4 py-2.5 text-slate-300">Total</td>
                  <td className="px-4 py-2.5 text-slate-500">—</td>
                  <td className="px-4 py-2.5 text-slate-200">{campaignTotal.sent}</td>
                  <td className="px-4 py-2.5 text-amber-400">{campaignTotal.opened}</td>
                  <td className="px-4 py-2.5 text-blue-400">{campaignTotal.replies}</td>
                  <td className="px-4 py-2.5 text-emerald-400">{campaignTotal.meetings}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Inbound table */}
        {subTab === "inbound" && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200">Sources inbound</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-500 uppercase tracking-wider">
                  {["Source", "Leads", "Qualifies", "Score moyen", "Sentiment", "Tendance"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INBOUND_SOURCES.map((row, i) => (
                  <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors text-sm">
                    <td className="px-4 py-3 text-slate-200 font-medium">{row.source}</td>
                    <td className="px-4 py-3 text-slate-300">{row.leads}</td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-400">{row.qualified}</span>
                      <span className="text-slate-600 text-xs ml-1">({Math.round(row.qualified/row.leads*100)}%)</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full max-w-[60px]">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${row.avgScore}%` }} />
                        </div>
                        <span className="text-slate-300 text-xs">{row.avgScore}</span>
                      </div>
                    </td>
                    <td className={cn("px-4 py-3 text-sm", sentimentStyle[row.sentiment])}>{sentimentLabel[row.sentiment]}</td>
                    <td className="px-4 py-3"><TrendIcon trend={row.trend} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Outbound/Inbound sidebar */}
      <aside className="w-64 shrink-0 space-y-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tendance reponses — 7j</h4>
          <div className="flex items-end gap-1 h-16">
            {weeklyTrend.map((val, i) => {
              const max = Math.max(...weeklyTrend)
              const height = Math.round((val / max) * 100)
              const isLast = i === weeklyTrend.length - 1
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className={cn("w-full rounded-sm", isLast ? "bg-blue-500" : "bg-slate-700")}
                    style={{ height: `${height}%` }} />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Top campagnes</h4>
          <div className="space-y-2">
            {CAMPAIGNS.filter(c => c.status === "active")
              .sort((a, b) => b.meetings - a.meetings)
              .slice(0, 4)
              .map(c => (
                <div key={c.id} className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 truncate flex-1 mr-2">{c.name}</span>
                  <span className="text-xs text-emerald-400 font-medium shrink-0">{c.meetings} mtg</span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sequences actives</h4>
          {[
            { label: "Campagnes actives",  value: CAMPAIGNS.filter(c => c.status === "active").length, color: "text-blue-400" },
            { label: "En pause",           value: CAMPAIGNS.filter(c => c.status === "paused").length,  color: "text-amber-400" },
            { label: "Terminees",          value: CAMPAIGNS.filter(c => c.status === "completed").length, color: "text-slate-500" },
            { label: "Meetings totaux",    value: campaignTotal.meetings, color: "text-emerald-400" },
          ].map(row => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="text-slate-500">{row.label}</span>
              <span className={cn("font-bold", row.color)}>{row.value}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type TabId = "knowledge" | "strategy" | "outbound"

const TABS: { id: TabId; label: string; badge?: number }[] = [
  { id: "knowledge", label: "Knowledge",       badge: KNOWLEDGE_SIGNALS.filter(s => s.status === "pending").length },
  { id: "strategy",  label: "Strategy",        badge: STRATEGY_SIGNALS.filter(s => s.threat === "HIGH").length    },
  { id: "outbound",  label: "Outbound/Inbound" },
]

export default function SignalPage() {
  const [activeTab, setActiveTab] = useState<TabId>("knowledge")

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30">
            <Radio className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-50">Signal</h1>
            <p className="text-xs text-slate-500">Intelligence marche, veille strategique et outreach</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center border-b border-slate-800">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.id
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
            )}>
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={cn(
                "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold",
                activeTab === tab.id ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300"
              )}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "knowledge" && <KnowledgeTab />}
      {activeTab === "strategy"  && <StrategyTab />}
      {activeTab === "outbound"  && <OutboundInboundTab />}
    </div>
  )
}
