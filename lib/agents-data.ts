// Legacy types (kept for backward compat with unmigrated pages)
export type Pole = "ACQ" | "SYS" | "GRO" | "SUP" | "OPS" | "GOV"
export type AarrrPhase = "Acquisition" | "Activation" | "Retention" | "Referral" | "Revenue"

export type AgentStatus = "idle" | "working" | "error" | "disabled" | "provisioning" | "deleting"

export interface Persona {
  topic: string
  persona: string
}

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
  status: AgentStatus
  enabled: boolean
  description: string
  // New PRD v3 fields
  model?: string
  workspacePath?: string
  personas?: Persona[]
  tags?: string[]
  memorySizeTokens?: number
  dailyNotesCount?: number
  // Legacy fields (nullable for transition)
  pole?: Pole | null
  phase?: AarrrPhase | null
  capabilities?: string[]
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

// ============================================================
// Gateway Commands (PRD v3)
// ============================================================

export type GatewayCommandStatus = "pending" | "processing" | "done" | "error"

export interface GatewayCommand {
  id: string
  command: string
  agentId: string | null
  payload: Record<string, unknown>
  status: GatewayCommandStatus
  result: Record<string, unknown> | null
  createdAt: string
  processedAt: string | null
  errorMessage: string | null
}

// ============================================================
// Alert Rules (PRD v3)
// ============================================================

export type AlertSeverity = "info" | "warning" | "critical"

export interface AlertRule {
  id: string
  name: string
  metric: string
  threshold: number
  severity: AlertSeverity
  enabled: boolean
  agentId: string | null
  createdAt: string
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

// Tag-based colors for PRD v3 agents
export const TAG_COLORS: Record<string, { bg: string; text: string; border: string; avatar: string }> = {
  principal: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30", avatar: "from-purple-500 to-purple-700" },
  eagle: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", avatar: "from-blue-500 to-blue-700" },
  technique: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30", avatar: "from-cyan-500 to-cyan-700" },
  veille: { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30", avatar: "from-green-500 to-green-700" },
  prospection: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", avatar: "from-orange-500 to-orange-700" },
  ops: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", avatar: "from-red-500 to-red-700" },
  "relation-client": { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30", avatar: "from-yellow-500 to-yellow-700" },
  "multi-persona": { bg: "bg-indigo-500/15", text: "text-indigo-400", border: "border-indigo-500/30", avatar: "from-indigo-500 to-indigo-700" },
}

export function getTagColor(tag: string) {
  return TAG_COLORS[tag] || { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/30", avatar: "from-slate-500 to-slate-700" }
}

// Legacy mock data — kept for pages not yet migrated to DB
export const AGENTS: Agent[] = [
  { id: "main", name: "Morpheus", role: "Agent principal multi-persona", status: "idle", enabled: true, description: "Agent principal avec 7 personas par canal Telegram", model: "anthropic/claude-sonnet-4-20250514", workspacePath: "/root/clawd", personas: [{topic:"#seo",persona:"Morpheus/SEO"},{topic:"#dev",persona:"Morpheus/Dev"},{topic:"#veille",persona:"Morpheus/Analyst"},{topic:"#newsletter",persona:"Morpheus/Editor"},{topic:"#linkedin",persona:"Morpheus/Creative"},{topic:"#ideas",persona:"Morpheus/Collector"},{topic:"#general",persona:"Morpheus"}], tags: ["principal","multi-persona"], createdAt: "2025-01-10", tasksActive: 0, tasksTotal: 0, failureRate: 0, tokensDay: 0, costDay: 0, level: 1, xp: 0, xpNext: 100, streak: 0, actions: [], memory: [], badges: [], tokenWeek: [] },
  { id: "architect", name: "Architect", role: "Architecture et design systeme", status: "idle", enabled: true, description: "Architecture et design systeme", model: "anthropic/claude-sonnet-4-20250514", workspacePath: "/root/clawd-eagle/architect", tags: ["eagle","technique"], createdAt: "2025-01-10", tasksActive: 0, tasksTotal: 0, failureRate: 0, tokensDay: 0, costDay: 0, level: 1, xp: 0, xpNext: 100, streak: 0, actions: [], memory: [], badges: [], tokenWeek: [] },
  { id: "tam", name: "TAM", role: "Technical Account Manager", status: "idle", enabled: true, description: "Technical Account Manager", model: "anthropic/claude-sonnet-4-20250514", workspacePath: "/root/clawd-eagle/tam", tags: ["eagle","relation-client"], createdAt: "2025-01-10", tasksActive: 0, tasksTotal: 0, failureRate: 0, tokensDay: 0, costDay: 0, level: 1, xp: 0, xpNext: 100, streak: 0, actions: [], memory: [], badges: [], tokenWeek: [] },
  { id: "research", name: "Research", role: "Recherche et veille", status: "idle", enabled: true, description: "Recherche, veille et analyse", model: "anthropic/claude-sonnet-4-20250514", workspacePath: "/root/clawd-eagle/research", tags: ["eagle","veille"], createdAt: "2025-01-10", tasksActive: 0, tasksTotal: 0, failureRate: 0, tokensDay: 0, costDay: 0, level: 1, xp: 0, xpNext: 100, streak: 0, actions: [], memory: [], badges: [], tokenWeek: [] },
  { id: "outbound", name: "Outbound", role: "Prospection sortante", status: "idle", enabled: true, description: "Prospection outbound et lead sourcing", model: "anthropic/claude-sonnet-4-20250514", workspacePath: "/root/clawd-eagle/outbound", tags: ["eagle","prospection"], createdAt: "2025-01-10", tasksActive: 0, tasksTotal: 0, failureRate: 0, tokensDay: 0, costDay: 0, level: 1, xp: 0, xpNext: 100, streak: 0, actions: [], memory: [], badges: [], tokenWeek: [] },
  { id: "monitor", name: "Monitor", role: "Surveillance et alertes", status: "idle", enabled: true, description: "Surveillance systeme et alertes", model: "anthropic/claude-sonnet-4-20250514", workspacePath: "/root/clawd-eagle/monitor", tags: ["eagle","ops"], createdAt: "2025-01-10", tasksActive: 0, tasksTotal: 0, failureRate: 0, tokensDay: 0, costDay: 0, level: 1, xp: 0, xpNext: 100, streak: 0, actions: [], memory: [], badges: [], tokenWeek: [] },
]

export function getRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  if (mins < 60) return `il y a ${mins}min`
  if (hours < 24) return `il y a ${hours}h`
  return `il y a ${Math.floor(hours / 24)}j`
}
