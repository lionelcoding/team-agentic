import { createClient } from './client'
import type { Agent, Pole, AgentStatus, AarrrPhase, AgentMemoryEntry, Persona } from '@/lib/agents-data'
import type { SignalItem, SignalSource, SignalImpact, SignalStatus, SignalTab } from '@/lib/signal-data'

// ============================================================
// Supabase client singleton
// ============================================================
const supabase = createClient()

// ============================================================
// Mapping helpers: DB snake_case → Frontend camelCase
// ============================================================

const POLE_MAP: Record<string, Pole> = {
  acquisition: 'ACQ',
  signal: 'SYS',
  growth: 'GRO',
  management: 'SUP',
  ops: 'OPS',
  infra: 'GOV',
}

const PHASE_MAP: Record<string, AarrrPhase> = {
  acquisition: 'Acquisition',
  activation: 'Activation',
  retention: 'Retention',
  referral: 'Referral',
  revenue: 'Revenue',
}

const STATUS_MAP: Record<string, AgentStatus> = {
  active: 'working',
  idle: 'idle',
  error: 'error',
  maintenance: 'idle',
}

const IMPACT_MAP: Record<string, SignalImpact> = {
  fort: 'HIGH',
  moyen: 'MEDIUM',
  faible: 'LOW',
  opportunite: 'HIGH',
}

const SIGNAL_STATUS_MAP: Record<string, SignalStatus> = {
  raw: 'pending',
  tagged: 'pending',
  indispensable: 'pending',
  borderline: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  dispatched: 'dispatched',
  applied: 'dispatched',
  archived: 'rejected',
}

const PLATFORM_SOURCE_MAP: Record<string, SignalSource> = {
  twitter: 'Twitter',
  reddit: 'Reddit',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  rss: 'RSS',
  blog: 'RSS',
  google_news: 'RSS',
  github: 'RSS',
  other: 'RSS',
  legifrance: 'RSS',
  insee: 'RSS',
  arxiv: 'RSS',
  bodacc: 'RSS',
  pappers: 'RSS',
  pages_jaunes: 'RSS',
  competitor: 'RSS',
  job_board: 'LinkedIn',
  producthunt: 'RSS',
}

const SUBCATEGORY_TAB_MAP: Record<string, SignalTab> = {
  knowledge: 'knowledge',
  strategy: 'strategy',
  outbound_inbound: 'outbound',
}

// ============================================================
// AGENTS
// ============================================================

export async function getAgents(): Promise<Agent[]> {
  const { data, error } = await supabase
    .from('agents')
    .select(`
      *,
      gamification_profiles (*),
      agent_memory (*)
    `)
    .order('name')

  if (error) {
    console.error('Error fetching agents:', error)
    return []
  }

  return (data || []).map(mapDbAgentToFrontend)
}

export async function getAgentById(id: string): Promise<Agent | null> {
  const { data, error } = await supabase
    .from('agents')
    .select(`
      *,
      gamification_profiles (*),
      agent_memory (*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching agent:', error)
    return null
  }

  return mapDbAgentToFrontend(data)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbAgentToFrontend(row: any): Agent {
  const gp = row.gamification_profiles?.[0] || row.gamification_profiles || {}
  const memories: AgentMemoryEntry[] = (row.agent_memory || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any) => ({
      category: m.category || 'context',
      key: m.key || '',
      value: m.value || '',
    })
  )

  return {
    id: row.id,
    name: row.name,
    role: row.role || '',
    pole: row.pole ? (POLE_MAP[row.pole] || null) : null,
    phase: row.aarrr_phase ? (PHASE_MAP[row.aarrr_phase] || null) : null,
    status: (STATUS_MAP[row.status] || row.status || 'idle') as AgentStatus,
    enabled: row.enabled ?? true,
    description: row.description || '',
    // PRD v3 fields
    model: row.model || undefined,
    workspacePath: row.workspace_path || undefined,
    personas: (row.personas as Persona[]) || [],
    tags: row.tags || [],
    memorySizeTokens: row.memory_size_tokens || 0,
    dailyNotesCount: row.daily_notes_count || 0,
    // Legacy fields
    capabilities: row.capabilities || [],
    createdAt: row.created_at,
    tasksActive: row.tasks_active || row.tasks_count || 0,
    tasksTotal: row.tasks_total || row.tasks_count || 0,
    failureRate: row.failure_rate || 0,
    tokensDay: row.tokens_day || 0,
    costDay: row.cost_day || 0,
    level: gp.level || 1,
    xp: gp.xp || gp.xp_total || 0,
    xpNext: gp.xp_next || 100,
    streak: gp.streak || gp.streak_days || 0,
    actions: [],
    memory: memories,
    badges: [],
    tokenWeek: row.token_week || [],
  }
}

// ============================================================
// AGENT ACTIONS
// ============================================================

export interface DbAgentAction {
  id: string
  agent_id: string
  action_type: string
  description: string | null
  result: string | null
  data: Record<string, unknown> | null
  tokens_used: number
  cost: number
  duration_ms: number | null
  model_used: string | null
  session_id: string | null
  related_lead_id: string | null
  related_signal_id: string | null
  created_at: string
}

export async function getAgentActions(agentId?: string): Promise<DbAgentAction[]> {
  let query = supabase
    .from('agent_actions')
    .select('*')
    .order('created_at', { ascending: false })

  if (agentId) {
    query = query.eq('agent_id', agentId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching agent actions:', error)
    return []
  }

  return data || []
}

// ============================================================
// LEADS
// ============================================================

export interface DbLead {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  job_title: string | null
  company_name: string
  company_size: string | null
  company_sector: string | null
  company_location: string | null
  company_website: string | null
  score_icp: number
  tier: number | null
  status: string
  source_type: string | null
  source_agent: string | null
  engagement_score: number
  interactions_count: number
  tags: string[]
  notes: string | null
  mrr: number
  plan: string | null
  created_at: string
  updated_at: string
}

export async function getLeads(): Promise<DbLead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching leads:', error)
    return []
  }

  return data || []
}

export async function getLeadsByStatus(status: string): Promise<DbLead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('status', status)
    .order('score_icp', { ascending: false })

  if (error) {
    console.error('Error fetching leads by status:', error)
    return []
  }

  return data || []
}

export async function getLeadsGroupedByStatus(): Promise<Record<string, DbLead[]>> {
  const leads = await getLeads()
  const grouped: Record<string, DbLead[]> = {}
  for (const lead of leads) {
    if (!grouped[lead.status]) grouped[lead.status] = []
    grouped[lead.status].push(lead)
  }
  return grouped
}

// ============================================================
// SIGNAL ITEMS
// ============================================================

export async function getSignalItems(): Promise<SignalItem[]> {
  const { data, error } = await supabase
    .from('signal_items')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching signals:', error)
    return []
  }

  return (data || []).map(mapDbSignalToFrontend)
}

export async function getSignalsBySubcategory(subcategory: string): Promise<SignalItem[]> {
  const { data, error } = await supabase
    .from('signal_items')
    .select('*')
    .eq('subcategory', subcategory)
    .order('relevance_score', { ascending: false })

  if (error) {
    console.error('Error fetching signals by subcategory:', error)
    return []
  }

  return (data || []).map(mapDbSignalToFrontend)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbSignalToFrontend(row: any): SignalItem {
  return {
    id: row.id,
    tab: SUBCATEGORY_TAB_MAP[row.subcategory] || 'knowledge',
    source: PLATFORM_SOURCE_MAP[row.source_platform] || 'RSS',
    sourceHandle: row.source_platform || 'unknown',
    impact: IMPACT_MAP[row.impact_level] || 'MEDIUM',
    status: SIGNAL_STATUS_MAP[row.status] || 'pending',
    title: row.title,
    content: row.summary,
    url: row.source_url || '#',
    company: row.company_data && Object.keys(row.company_data).length > 0
      ? { name: row.company_data.name || '', sector: row.company_data.sector || '' }
      : undefined,
    createdAt: new Date(row.created_at),
  }
}

// ============================================================
// HANDOVER MESSAGES
// ============================================================

export interface DbHandoverMessage {
  id: string
  from_agent: string
  to_agent: string
  content: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'sent' | 'read' | 'acted'
  related_lead_id: string | null
  related_signal_id: string | null
  data: Record<string, unknown>
  read_at: string | null
  acted_at: string | null
  created_at: string
}

export async function getHandoverMessages(): Promise<DbHandoverMessage[]> {
  const { data, error } = await supabase
    .from('handover_messages')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching handover messages:', error)
    return []
  }

  return data || []
}

// ============================================================
// COST ENTRIES
// ============================================================

export interface DbCostEntry {
  id: string
  agent_id: string | null
  cost_type: 'fixed' | 'variable'
  category: string
  amount: number
  currency: string
  description: string | null
  tokens_used: number
  model_used: string | null
  date: string
  created_at: string
}

export async function getCostEntries(): Promise<DbCostEntry[]> {
  const { data, error } = await supabase
    .from('cost_entries')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching cost entries:', error)
    return []
  }

  return data || []
}

// ============================================================
// ALERTS
// ============================================================

export interface DbAlert {
  id: string
  severity: 'info' | 'warning' | 'critical'
  agent_id: string | null
  category: string
  message: string
  data: Record<string, unknown>
  acknowledged: boolean
  acknowledged_at: string | null
  acknowledged_by: string | null
  created_at: string
}

export async function getAlerts(): Promise<DbAlert[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching alerts:', error)
    return []
  }

  return data || []
}

export async function getUnacknowledgedAlerts(): Promise<DbAlert[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('acknowledged', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching unacknowledged alerts:', error)
    return []
  }

  return data || []
}

// ============================================================
// GAMIFICATION
// ============================================================

export async function getGamificationProfiles() {
  const { data, error } = await supabase
    .from('gamification_profiles')
    .select('*')
    .order('xp', { ascending: false })

  if (error) {
    console.error('Error fetching gamification profiles:', error)
    return []
  }

  return data || []
}

// ============================================================
// DASHBOARD STATS (aggregated)
// ============================================================

export interface DashboardStats {
  totalLeads: number
  leadsByStatus: Record<string, number>
  totalSignals: number
  signalsBySubcategory: Record<string, number>
  totalAgents: number
  activeAgents: number
  totalCostWeek: number
  unacknowledgedAlerts: number
  handoverPending: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    { count: totalLeads },
    { data: leadsData },
    { count: totalSignals },
    { data: signalsData },
    { count: totalAgents },
    { count: activeAgents },
    { data: costsData },
    { count: unacknowledgedAlerts },
    { count: handoverPending },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('status'),
    supabase.from('signal_items').select('*', { count: 'exact', head: true }),
    supabase.from('signal_items').select('subcategory'),
    supabase.from('agents').select('*', { count: 'exact', head: true }),
    supabase.from('agents').select('*', { count: 'exact', head: true }).eq('status', 'working'),
    supabase.from('cost_entries').select('amount').gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
    supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('acknowledged', false),
    supabase.from('handover_messages').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
  ])

  const leadsByStatus: Record<string, number> = {}
  for (const lead of leadsData || []) {
    leadsByStatus[lead.status] = (leadsByStatus[lead.status] || 0) + 1
  }

  const signalsBySubcategory: Record<string, number> = {}
  for (const signal of signalsData || []) {
    signalsBySubcategory[signal.subcategory] = (signalsBySubcategory[signal.subcategory] || 0) + 1
  }

  const totalCostWeek = (costsData || []).reduce((sum, c) => sum + Number(c.amount), 0)

  return {
    totalLeads: totalLeads || 0,
    leadsByStatus,
    totalSignals: totalSignals || 0,
    signalsBySubcategory,
    totalAgents: totalAgents || 0,
    activeAgents: activeAgents || 0,
    totalCostWeek: Math.round(totalCostWeek * 100) / 100,
    unacknowledgedAlerts: unacknowledgedAlerts || 0,
    handoverPending: handoverPending || 0,
  }
}
