export type ConnectionStatus = 'connected' | 'disconnected' | 'checking'

export interface GatewayLog {
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
  message: string
}

export interface ModelConfig {
  id: string
  name: string
  provider: string
  usage: string
  costInput: string
  costOutput: string
  status: 'active' | 'inactive'
  requestsToday: number
}

export interface RoutingRule {
  taskType: string
  model: string
  description: string
}

export interface NotificationRule {
  id: string
  label: string
  description: string
  enabled: boolean
}

export interface AgentAutonomy {
  id: string
  name: string
  pole: string
  poleColor: string
  initials: string
  level: 'supervised' | 'assisted' | 'autonomous'
  conditions: string
  actionsThisWeek: number
  autonomousActionsToday: number
}

export interface AutonomyLog {
  id: string
  agentName: string
  agentInitials: string
  poleColor: string
  action: string
  decision: string
  timestamp: string
  cost: number
}

export const GATEWAY_LOGS: GatewayLog[] = [
  { timestamp: '14:32:01', level: 'INFO',  message: 'Gateway started on port 18789' },
  { timestamp: '14:32:02', level: 'INFO',  message: 'Tailscale tunnel established — leadgen-b2b.tail1234.ts.net' },
  { timestamp: '14:32:03', level: 'INFO',  message: 'Agent Victor (orchestrator) connected via WebSocket' },
  { timestamp: '14:32:05', level: 'INFO',  message: 'Agent Iris connected — ACQ pole' },
  { timestamp: '14:32:05', level: 'INFO',  message: 'Agent Hugo connected — ACQ pole' },
  { timestamp: '14:32:06', level: 'INFO',  message: 'Agent Simon connected — ACQ pole' },
  { timestamp: '14:32:06', level: 'INFO',  message: 'Agent Diane connected — ACQ pole' },
  { timestamp: '14:33:12', level: 'DEBUG', message: 'Heartbeat received from Victor — latency 12ms' },
  { timestamp: '14:33:14', level: 'INFO',  message: 'Dispatch: Victor → Iris [signal_task_0234]' },
  { timestamp: '14:33:45', level: 'INFO',  message: 'Task signal_task_0234 completed — status: success' },
  { timestamp: '14:35:00', level: 'WARN',  message: 'Agent Nathan — no heartbeat for 47s, retrying...' },
  { timestamp: '14:35:10', level: 'INFO',  message: 'Agent Nathan reconnected successfully' },
  { timestamp: '14:36:22', level: 'INFO',  message: 'Routing rule applied: heartbeat → claude-haiku-4-5' },
  { timestamp: '14:37:01', level: 'DEBUG', message: 'Token count: input=1204 output=387 model=claude-sonnet-4-5' },
  { timestamp: '14:38:15', level: 'INFO',  message: 'Cost checkpoint: €12.34 today (budget: €40.00)' },
  { timestamp: '14:39:02', level: 'ERROR', message: 'Rate limit hit on Anthropic API — backing off 5s' },
  { timestamp: '14:39:08', level: 'INFO',  message: 'Retry successful after backoff' },
  { timestamp: '14:41:33', level: 'INFO',  message: 'Daily standup report sent to Telegram (@leadgen_b2b_bot)' },
  { timestamp: '14:42:00', level: 'INFO',  message: 'Dispatch: Victor → Alice [email_campaign_0567]' },
  { timestamp: '14:42:01', level: 'DEBUG', message: 'Gateway uptime: 1h 10m — 234 tasks processed' },
]

export const MODELS: ModelConfig[] = [
  {
    id: 'opus',
    name: 'claude-opus-4-6',
    provider: 'Anthropic',
    usage: 'Orchestration & décisions complexes',
    costInput: '$15.00',
    costOutput: '$75.00',
    status: 'active',
    requestsToday: 47,
  },
  {
    id: 'sonnet',
    name: 'claude-sonnet-4-5',
    provider: 'Anthropic',
    usage: 'Tâches standard & enrichissement',
    costInput: '$3.00',
    costOutput: '$15.00',
    status: 'active',
    requestsToday: 312,
  },
  {
    id: 'haiku',
    name: 'claude-haiku-4-5',
    provider: 'Anthropic',
    usage: 'Heartbeats & tâches légères',
    costInput: '$1.00',
    costOutput: '$5.00',
    status: 'active',
    requestsToday: 1024,
  },
  {
    id: 'gpt4o',
    name: 'gpt-4o',
    provider: 'OpenAI',
    usage: 'Fallback & validation croisée',
    costInput: '$2.50',
    costOutput: '$10.00',
    status: 'inactive',
    requestsToday: 0,
  },
]

export const ROUTING_RULES: RoutingRule[] = [
  { taskType: 'orchestration',    model: 'claude-opus-4-6',   description: 'Décisions stratégiques, planning agents' },
  { taskType: 'enrichissement',   model: 'claude-sonnet-4-5', description: 'Scraping, enrichissement lead data' },
  { taskType: 'scoring_icp',      model: 'claude-sonnet-4-5', description: 'Calcul ICP score, qualification' },
  { taskType: 'heartbeat',        model: 'claude-haiku-4-5',  description: 'Ping de vie, status checks' },
  { taskType: 'email_generation', model: 'claude-sonnet-4-5', description: 'Rédaction séquences email outbound' },
  { taskType: 'analyse_signal',   model: 'claude-opus-4-6',   description: 'PESTEL, analyse stratégique approfondie' },
  { taskType: 'dispatch',         model: 'claude-haiku-4-5',  description: 'Routage simple entre agents' },
]

export const NOTIFICATION_RULES: NotificationRule[] = [
  { id: 'critical_alerts',   label: 'Alertes critiques',          description: 'Agent en erreur, budget dépassé', enabled: true },
  { id: 'daily_standup',     label: 'Daily standup',              description: 'Rapport quotidien 08h00', enabled: true },
  { id: 'dispatch_reports',  label: 'Rapports de dispatch',       description: 'Résumé des dispatches toutes les 4h', enabled: false },
  { id: 'new_lead',          label: 'Nouveau lead qualifié',      description: 'ICP score ≥ 75 détecté', enabled: true },
  { id: 'handover',          label: 'Handover en attente',        description: 'Message inter-agent nécessite action', enabled: true },
  { id: 'budget_warning',    label: 'Alerte budget 80%',          description: 'Consommation budget > 80%', enabled: true },
  { id: 'weekly_report',     label: 'Rapport hebdomadaire',       description: 'Récapitulatif AARRR chaque lundi', enabled: false },
  { id: 'agent_offline',     label: 'Agent hors ligne',           description: 'Absence heartbeat > 2 minutes', enabled: true },
]

export const AGENTS_AUTONOMY: AgentAutonomy[] = [
  { id: '1',  name: 'Victor',  pole: 'SYS', poleColor: 'bg-purple-600',  initials: 'VC', level: 'autonomous',  conditions: 'Toujours autonome — orchestrateur système', actionsThisWeek: 342, autonomousActionsToday: 18 },
  { id: '2',  name: 'Iris',    pole: 'ACQ', poleColor: 'bg-blue-600',    initials: 'IR', level: 'autonomous',  conditions: 'Veille PESTEL sans approbation requise', actionsThisWeek: 234, autonomousActionsToday: 12 },
  { id: '3',  name: 'Hugo',    pole: 'ACQ', poleColor: 'bg-blue-600',    initials: 'HG', level: 'assisted',    conditions: 'Scraping approuvé par Victor avant dispatch', actionsThisWeek: 187, autonomousActionsToday: 8 },
  { id: '4',  name: 'Simon',   pole: 'ACQ', poleColor: 'bg-blue-600',    initials: 'SM', level: 'supervised',  conditions: 'Chaque enrichissement validé manuellement', actionsThisWeek: 156, autonomousActionsToday: 3 },
  { id: '5',  name: 'Diane',   pole: 'ACQ', poleColor: 'bg-blue-600',    initials: 'DI', level: 'autonomous',  conditions: 'ICP scoring < 70 déclenche alerte', actionsThisWeek: 298, autonomousActionsToday: 15 },
  { id: '6',  name: 'Nathan',  pole: 'SYS', poleColor: 'bg-purple-600',  initials: 'NT', level: 'supervised',  conditions: 'Toute opération DevOps requiert approbation', actionsThisWeek: 89,  autonomousActionsToday: 2 },
  { id: '7',  name: 'Sophie',  pole: 'SYS', poleColor: 'bg-purple-600',  initials: 'SP', level: 'autonomous',  conditions: 'Rapports analytics sans restriction', actionsThisWeek: 203, autonomousActionsToday: 9 },
  { id: '8',  name: 'Alice',   pole: 'GRO', poleColor: 'bg-green-600',   initials: 'AL', level: 'assisted',    conditions: 'Campagnes email validées par Margaux', actionsThisWeek: 145, autonomousActionsToday: 7 },
  { id: '9',  name: 'Thomas',  pole: 'GRO', poleColor: 'bg-green-600',   initials: 'TH', level: 'supervised',  conditions: 'Nurturing approuvé lead par lead', actionsThisWeek: 112, autonomousActionsToday: 4 },
  { id: '10', name: 'Margaux', pole: 'GRO', poleColor: 'bg-green-600',   initials: 'MX', level: 'autonomous',  conditions: 'Account management full autonome', actionsThisWeek: 267, autonomousActionsToday: 11 },
  { id: '11', name: 'Yann',    pole: 'GRO', poleColor: 'bg-green-600',   initials: 'YN', level: 'assisted',    conditions: 'Referral links générés avec validation', actionsThisWeek: 78,  autonomousActionsToday: 3 },
  { id: '12', name: 'Léa',     pole: 'SUP', poleColor: 'bg-red-600',     initials: 'LA', level: 'supervised',  conditions: 'Opérations sensibles toujours supervisées', actionsThisWeek: 134, autonomousActionsToday: 5 },
  { id: '13', name: 'Paul',    pole: 'SUP', poleColor: 'bg-red-600',     initials: 'PL', level: 'supervised',  conditions: 'Accès comptabilité — supervision stricte', actionsThisWeek: 67,  autonomousActionsToday: 2 },
  { id: '14', name: 'Camille', pole: 'OPS', poleColor: 'bg-orange-600',  initials: 'CM', level: 'assisted',    conditions: 'RH autonome sauf pour décisions de recrutement', actionsThisWeek: 45,  autonomousActionsToday: 1 },
  { id: '15', name: 'Jules',   pole: 'OPS', poleColor: 'bg-orange-600',  initials: 'JL', level: 'supervised',  conditions: 'Formation requiert validation pédagogique', actionsThisWeek: 34,  autonomousActionsToday: 1 },
  { id: '16', name: 'Clara',   pole: 'GOV', poleColor: 'bg-slate-600',   initials: 'CL', level: 'supervised',  conditions: 'RGPD — toute action requiert audit trail complet', actionsThisWeek: 56,  autonomousActionsToday: 0 },
]

export const AUTONOMY_LOGS: AutonomyLog[] = [
  { id: '1', agentName: 'Victor',  agentInitials: 'VC', poleColor: 'bg-purple-600', action: 'Dispatch multi-agents', decision: 'Lancé campagne enrichissement 23 leads sans approbation (seuil: 20)', timestamp: 'Il y a 12 min', cost: 0.45 },
  { id: '2', agentName: 'Iris',    agentInitials: 'IR', poleColor: 'bg-blue-600',   action: 'Analyse PESTEL',        decision: 'Approuvé 8 signaux stratégiques HIGH impact automatiquement',      timestamp: 'Il y a 34 min', cost: 1.23 },
  { id: '3', agentName: 'Diane',   agentInitials: 'DI', poleColor: 'bg-blue-600',   action: 'ICP Scoring batch',     decision: 'Scoré 47 leads, 12 classifiés Tier-1 (score > 85)',                timestamp: 'Il y a 1h',     cost: 0.87 },
  { id: '4', agentName: 'Sophie',  agentInitials: 'SP', poleColor: 'bg-purple-600', action: 'Rapport hebdo',         decision: 'Rapport Analytics généré et envoyé Telegram sans trigger manuel', timestamp: 'Il y a 2h',     cost: 0.32 },
  { id: '5', agentName: 'Margaux', agentInitials: 'MX', poleColor: 'bg-green-600',  action: 'Follow-up client',      decision: 'Email de relance envoyé à DataStream SAS (inactif 14j)',           timestamp: 'Il y a 3h',     cost: 0.19 },
  { id: '6', agentName: 'Victor',  agentInitials: 'VC', poleColor: 'bg-purple-600', action: 'Escalade budget',       decision: 'Alerte budget 80% envoyée — suspendu 2 agents non-critiques',      timestamp: 'Il y a 5h',     cost: 0.04 },
]
