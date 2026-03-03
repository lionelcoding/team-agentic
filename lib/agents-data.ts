export type Pole = "ACQ" | "SYS" | "GRO" | "SUP" | "OPS" | "GOV"
export type AgentStatus = "idle" | "working" | "error"
export type AarrrPhase = "Acquisition" | "Activation" | "Retention" | "Referral" | "Revenue"

export interface AgentAction {
  id: string
  type: string
  status: "success" | "error" | "running"
  description: string
  timestamp: Date
  cost: number
}

export interface AgentMemoryEntry {
  category: "context" | "facts" | "beliefs" | "patterns"
  key: string
  value: string
}

export interface Badge {
  id: string
  label: string
  icon: string
  earned: boolean
  description: string
}

export interface Agent {
  id: string
  name: string
  role: string
  pole: Pole
  phase: AarrrPhase
  status: AgentStatus
  enabled: boolean
  description: string
  capabilities: string[]
  createdAt: string
  tasksActive: number
  tasksTotal: number
  failureRate: number
  tokensDay: number
  costDay: number
  level: number
  xp: number
  xpNext: number
  streak: number
  actions: AgentAction[]
  memory: AgentMemoryEntry[]
  badges: Badge[]
  tokenWeek: { day: string; tokens: number }[]
}

export const POLE_COLORS: Record<Pole, { bg: string; text: string; border: string; avatar: string }> = {
  ACQ: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", avatar: "from-blue-500 to-blue-700" },
  SYS: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30", avatar: "from-purple-500 to-purple-700" },
  GRO: { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30", avatar: "from-green-500 to-green-700" },
  SUP: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", avatar: "from-red-500 to-red-700" },
  OPS: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", avatar: "from-orange-500 to-orange-700" },
  GOV: { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/30", avatar: "from-slate-500 to-slate-700" },
}

export const PHASE_COLORS: Record<AarrrPhase, string> = {
  Acquisition: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Activation: "bg-green-500/15 text-green-400 border-green-500/30",
  Retention: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Referral: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Revenue: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
}

function makeActions(agentName: string): AgentAction[] {
  return [
    { id: "a1", type: "Analyse", status: "success", description: `${agentName} a terminé l'analyse du segment ICP`, timestamp: new Date(Date.now() - 5 * 60000), cost: 0.08 },
    { id: "a2", type: "Enrichissement", status: "success", description: "34 leads enrichis avec données firmographiques", timestamp: new Date(Date.now() - 22 * 60000), cost: 0.12 },
    { id: "a3", type: "Email", status: "success", description: "Séquence de nurturing envoyée à 18 prospects", timestamp: new Date(Date.now() - 45 * 60000), cost: 0.05 },
    { id: "a4", type: "Scoring", status: "error", description: "Erreur API Clearbit — retry programmé dans 5 min", timestamp: new Date(Date.now() - 90 * 60000), cost: 0.0 },
    { id: "a5", type: "Pipeline", status: "success", description: "5 leads déplacés de Qualified vers Negotiation", timestamp: new Date(Date.now() - 2 * 3600000), cost: 0.03 },
    { id: "a6", type: "Analyse", status: "success", description: "Rapport hebdomadaire généré — 12 KPIs", timestamp: new Date(Date.now() - 4 * 3600000), cost: 0.22 },
    { id: "a7", type: "Enrichissement", status: "success", description: "LinkedIn Sales Nav sync — 28 nouveaux contacts", timestamp: new Date(Date.now() - 6 * 3600000), cost: 0.09 },
    { id: "a8", type: "Email", status: "success", description: "A/B test objet — variante B +14% open rate", timestamp: new Date(Date.now() - 8 * 3600000), cost: 0.06 },
  ]
}

function makeMemory(): AgentMemoryEntry[] {
  return [
    { category: "context", key: "Marché cible", value: "SaaS B2B France, 50-500 salariés, Series A+" },
    { category: "context", key: "ICP principal", value: "CTO / VP Engineering dans fintech et healthtech" },
    { category: "facts", key: "Taux conversion moyen", value: "3.2% MQL→SQL sur les 30 derniers jours" },
    { category: "facts", key: "Meilleure source", value: "LinkedIn organique — 42% des leads qualifiés" },
    { category: "beliefs", key: "Stratégie optimale", value: "Outreach multi-canal espacé 4-7 jours entre touchpoints" },
    { category: "beliefs", key: "Signal prioritaire", value: "Levée de fonds + recrutement commercial = signal fort" },
    { category: "patterns", key: "Pic d'ouverture emails", value: "Mardi 9h-11h et jeudi 14h-16h" },
    { category: "patterns", key: "Profil churner", value: "SMB <10 salariés avec budget <500€/mois" },
  ]
}

function makeTokenWeek(): { day: string; tokens: number }[] {
  return [
    { day: "Lun", tokens: 48000 },
    { day: "Mar", tokens: 62000 },
    { day: "Mer", tokens: 55000 },
    { day: "Jeu", tokens: 71000 },
    { day: "Ven", tokens: 83000 },
    { day: "Sam", tokens: 29000 },
    { day: "Dim", tokens: 12000 },
  ]
}

function makeBadges(earned: number): Badge[] {
  const all: Badge[] = [
    { id: "b1", label: "Premier Contact", icon: "Zap", earned: earned >= 1, description: "Premier message envoyé" },
    { id: "b2", label: "Chasseur", icon: "Target", earned: earned >= 2, description: "100 leads qualifiés" },
    { id: "b3", label: "Centième Lead", icon: "Award", earned: earned >= 3, description: "100e lead traité" },
    { id: "b4", label: "Sans Erreur", icon: "Shield", earned: earned >= 4, description: "7 jours sans erreur" },
    { id: "b5", label: "Efficace", icon: "Cpu", earned: earned >= 5, description: "Taux réussite >95%" },
    { id: "b6", label: "Polyvalent", icon: "Layers", earned: earned >= 6, description: "5 types de tâches maîtrisés" },
    { id: "b7", label: "Streak 30j", icon: "Flame", earned: earned >= 7, description: "30 jours consécutifs actif" },
    { id: "b8", label: "Expert IA", icon: "Brain", earned: earned >= 8, description: "Niveau 10 atteint" },
    { id: "b9", label: "Revenue Maker", icon: "DollarSign", earned: false, description: "Contribué à €10k MRR" },
  ]
  return all
}

export const AGENTS: Agent[] = [
  // ACQ
  { id: "iris", name: "Iris", role: "Veille PESTEL", pole: "ACQ", phase: "Acquisition", status: "working", enabled: true, description: "Iris surveille en permanence l'environnement macro-économique (PESTEL) et détecte les signaux faibles pertinents pour la stratégie d'acquisition.", capabilities: ["Veille médias", "Analyse PESTEL", "Détection signaux", "Rapport automatisé"], createdAt: "12 Jan 2025", tasksActive: 3, tasksTotal: 147, failureRate: 1.4, tokensDay: 42000, costDay: 2.10, level: 7, xp: 3240, xpNext: 4000, streak: 12, actions: makeActions("Iris"), memory: makeMemory(), badges: makeBadges(5), tokenWeek: makeTokenWeek() },
  { id: "hugo", name: "Hugo", role: "Scraper", pole: "ACQ", phase: "Acquisition", status: "working", enabled: true, description: "Hugo extrait et structure des données depuis LinkedIn, BODACC, Twitter et d'autres sources pour alimenter le pipeline de leads.", capabilities: ["Web scraping", "Extraction données", "Déduplication", "Normalisation"], createdAt: "12 Jan 2025", tasksActive: 8, tasksTotal: 892, failureRate: 3.2, tokensDay: 18000, costDay: 0.90, level: 9, xp: 7820, xpNext: 9000, streak: 28, actions: makeActions("Hugo"), memory: makeMemory(), badges: makeBadges(7), tokenWeek: makeTokenWeek() },
  { id: "simon", name: "Simon", role: "Enrichissement", pole: "ACQ", phase: "Acquisition", status: "idle", enabled: true, description: "Simon enrichit les profils de leads avec des données firmographiques, technographiques et comportementales via APIs tierces.", capabilities: ["Clearbit API", "LinkedIn enrichment", "Technographics", "Email validation"], createdAt: "15 Jan 2025", tasksActive: 0, tasksTotal: 2341, failureRate: 2.8, tokensDay: 24000, costDay: 1.20, level: 10, xp: 9100, xpNext: 11000, streak: 45, actions: makeActions("Simon"), memory: makeMemory(), badges: makeBadges(8), tokenWeek: makeTokenWeek() },
  { id: "diane", name: "Diane", role: "ICP Scoring", pole: "ACQ", phase: "Acquisition", status: "working", enabled: true, description: "Diane évalue et score chaque lead selon les critères ICP définis, en attribuant un score de 0 à 100.", capabilities: ["Scoring ICP", "Analyse firmographique", "Segmentation", "Priorisation"], createdAt: "18 Jan 2025", tasksActive: 12, tasksTotal: 3210, failureRate: 0.8, tokensDay: 38000, costDay: 1.90, level: 11, xp: 11240, xpNext: 13000, streak: 62, actions: makeActions("Diane"), memory: makeMemory(), badges: makeBadges(8), tokenWeek: makeTokenWeek() },
  // SYS
  { id: "victor", name: "Victor", role: "Orchestrateur", pole: "SYS", phase: "Acquisition", status: "working", enabled: true, description: "Victor est l'orchestrateur principal du système multi-agents. Il coordonne les 15 autres agents, priorise les tâches et gère les escalades.", capabilities: ["Orchestration multi-agents", "Planification tâches", "Gestion erreurs", "Reporting"], createdAt: "10 Jan 2025", tasksActive: 5, tasksTotal: 8420, failureRate: 0.3, tokensDay: 182000, costDay: 9.10, level: 15, xp: 24500, xpNext: 27000, streak: 88, actions: makeActions("Victor"), memory: makeMemory(), badges: makeBadges(9), tokenWeek: makeTokenWeek() },
  { id: "nathan", name: "Nathan", role: "DevOps", pole: "SYS", phase: "Retention", status: "idle", enabled: true, description: "Nathan surveille l'infrastructure, gère les déploiements et assure la disponibilité de l'ensemble du système.", capabilities: ["Monitoring infra", "Alerting", "Auto-scaling", "Log analysis"], createdAt: "10 Jan 2025", tasksActive: 0, tasksTotal: 420, failureRate: 0.5, tokensDay: 8000, costDay: 0.40, level: 6, xp: 2800, xpNext: 3500, streak: 30, actions: makeActions("Nathan"), memory: makeMemory(), badges: makeBadges(4), tokenWeek: makeTokenWeek() },
  { id: "sophie", name: "Sophie", role: "Analytics", pole: "SYS", phase: "Revenue", status: "working", enabled: true, description: "Sophie analyse les performances du pipeline, génère des rapports AARRR et identifie les opportunités d'optimisation.", capabilities: ["Data analysis", "Reporting AARRR", "A/B testing", "Prédiction churn"], createdAt: "14 Jan 2025", tasksActive: 2, tasksTotal: 1840, failureRate: 1.1, tokensDay: 56000, costDay: 2.80, level: 8, xp: 5120, xpNext: 6000, streak: 20, actions: makeActions("Sophie"), memory: makeMemory(), badges: makeBadges(6), tokenWeek: makeTokenWeek() },
  // GRO
  { id: "alice", name: "Alice", role: "Emailing", pole: "GRO", phase: "Activation", status: "working", enabled: true, description: "Alice gère et personnalise les séquences d'emails outbound, optimise les objets et suit les métriques de délivrabilité.", capabilities: ["Personnalisation email", "A/B testing", "Deliverability", "Séquences multi-touch"], createdAt: "16 Jan 2025", tasksActive: 6, tasksTotal: 4210, failureRate: 4.2, tokensDay: 210000, costDay: 5.60, level: 9, xp: 6400, xpNext: 8000, streak: 25, actions: makeActions("Alice"), memory: makeMemory(), badges: makeBadges(6), tokenWeek: makeTokenWeek() },
  { id: "thomas", name: "Thomas", role: "Nurturing", pole: "GRO", phase: "Retention", status: "idle", enabled: true, description: "Thomas gère les parcours de nurturing des leads froids et tièdes, en adaptant le contenu selon le profil et le comportement.", capabilities: ["Lead nurturing", "Scoring comportemental", "Content routing", "Relances automatiques"], createdAt: "18 Jan 2025", tasksActive: 0, tasksTotal: 1820, failureRate: 2.1, tokensDay: 76000, costDay: 1.52, level: 7, xp: 3640, xpNext: 4500, streak: 15, actions: makeActions("Thomas"), memory: makeMemory(), badges: makeBadges(5), tokenWeek: makeTokenWeek() },
  { id: "margaux", name: "Margaux", role: "Success Manager", pole: "GRO", phase: "Retention", status: "working", enabled: true, description: "Margaux surveille la santé des comptes clients, détecte les risques de churn et identifie les opportunités d'expansion.", capabilities: ["Health scoring", "Churn prediction", "Upsell detection", "NPS analysis"], createdAt: "20 Jan 2025", tasksActive: 4, tasksTotal: 980, failureRate: 1.5, tokensDay: 44000, costDay: 2.20, level: 8, xp: 4800, xpNext: 6000, streak: 18, actions: makeActions("Margaux"), memory: makeMemory(), badges: makeBadges(5), tokenWeek: makeTokenWeek() },
  { id: "yann", name: "Yann", role: "Referral", pole: "GRO", phase: "Referral", status: "error", enabled: true, description: "Yann identifie et active les opportunités de parrainage, gère le programme de referral et mesure le NPS.", capabilities: ["Referral tracking", "NPS surveys", "Ambassadeur program", "Viral loops"], createdAt: "22 Jan 2025", tasksActive: 1, tasksTotal: 640, failureRate: 6.8, tokensDay: 28000, costDay: 0.84, level: 5, xp: 2100, xpNext: 3000, streak: 3, actions: makeActions("Yann"), memory: makeMemory(), badges: makeBadges(3), tokenWeek: makeTokenWeek() },
  // SUP
  { id: "lea", name: "Léa", role: "Opérations", pole: "SUP", phase: "Retention", status: "idle", enabled: true, description: "Léa coordonne les opérations internes, gère les processus de support et s'assure de la qualité des livrables.", capabilities: ["Process automation", "Quality control", "Support tickets", "SLA monitoring"], createdAt: "15 Jan 2025", tasksActive: 0, tasksTotal: 1240, failureRate: 0.9, tokensDay: 32000, costDay: 0.64, level: 6, xp: 2960, xpNext: 3500, streak: 8, actions: makeActions("Léa"), memory: makeMemory(), badges: makeBadges(4), tokenWeek: makeTokenWeek() },
  { id: "paul", name: "Paul", role: "Compta Tokens", pole: "SUP", phase: "Revenue", status: "working", enabled: true, description: "Paul surveille la consommation de tokens, optimise les coûts LLM et génère des rapports de facturation détaillés.", capabilities: ["Token monitoring", "Cost optimization", "Budget alerts", "Billing reports"], createdAt: "15 Jan 2025", tasksActive: 1, tasksTotal: 3840, failureRate: 0.2, tokensDay: 12000, costDay: 0.24, level: 7, xp: 4200, xpNext: 5000, streak: 55, actions: makeActions("Paul"), memory: makeMemory(), badges: makeBadges(5), tokenWeek: makeTokenWeek() },
  // OPS
  { id: "camille", name: "Camille", role: "RH", pole: "OPS", phase: "Retention", status: "idle", enabled: false, description: "Camille gère l'onboarding des nouveaux agents, les processus RH internes et la documentation des procédures.", capabilities: ["Agent onboarding", "Documentation", "Process design", "KPI tracking"], createdAt: "25 Jan 2025", tasksActive: 0, tasksTotal: 210, failureRate: 1.8, tokensDay: 0, costDay: 0.0, level: 3, xp: 820, xpNext: 1500, streak: 0, actions: makeActions("Camille"), memory: makeMemory(), badges: makeBadges(2), tokenWeek: [{ day: "Lun", tokens: 0 }, { day: "Mar", tokens: 0 }, { day: "Mer", tokens: 0 }, { day: "Jeu", tokens: 0 }, { day: "Ven", tokens: 0 }, { day: "Sam", tokens: 0 }, { day: "Dim", tokens: 0 }] },
  { id: "jules", name: "Jules", role: "Formation", pole: "OPS", phase: "Activation", status: "idle", enabled: true, description: "Jules développe et met à jour les prompts, les bases de connaissances et les matériaux de formation pour les autres agents.", capabilities: ["Prompt engineering", "Knowledge base", "Training data", "Fine-tuning"], createdAt: "25 Jan 2025", tasksActive: 0, tasksTotal: 480, failureRate: 2.4, tokensDay: 20000, costDay: 1.00, level: 5, xp: 1840, xpNext: 2500, streak: 5, actions: makeActions("Jules"), memory: makeMemory(), badges: makeBadges(3), tokenWeek: makeTokenWeek() },
  // GOV
  { id: "clara", name: "Clara", role: "Conformité RGPD", pole: "GOV", phase: "Retention", status: "idle", enabled: true, description: "Clara veille à la conformité RGPD de l'ensemble des traitements de données, gère les demandes d'effacement et audite les flux.", capabilities: ["RGPD audit", "Data mapping", "Droit à l'oubli", "DPO reporting"], createdAt: "12 Jan 2025", tasksActive: 0, tasksTotal: 720, failureRate: 0.1, tokensDay: 16000, costDay: 0.32, level: 6, xp: 3120, xpNext: 3500, streak: 14, actions: makeActions("Clara"), memory: makeMemory(), badges: makeBadges(4), tokenWeek: makeTokenWeek() },
]

export function getRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  if (mins < 60) return `il y a ${mins}min`
  if (hours < 24) return `il y a ${hours}h`
  return `il y a ${Math.floor(hours / 24)}j`
}
