"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  ArrowRight, Copy, MessageSquare, CheckCheck, Clock,
  AlertTriangle, ChevronDown, ChevronUp, ExternalLink,
  Loader2, RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface HandoverMessage {
  id: string
  from_agent: string
  to_agent: string
  content: string
  priority: string
  status: string
  related_signal_id: string | null
  data: Record<string, unknown> | null
  read_at: string | null
  acted_at: string | null
  created_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  monitor:   "bg-purple-600",
  research:  "bg-blue-600",
  architect: "bg-indigo-600",
  outbound:  "bg-green-600",
  tam:       "bg-orange-600",
  main:      "bg-slate-600",
}

const PRIORITY_STYLES: Record<string, { label: string; cls: string }> = {
  high:   { label: "HIGH",   cls: "bg-orange-600/20 text-orange-400 border-orange-700/40" },
  normal: { label: "NORMAL", cls: "bg-blue-600/20 text-blue-400 border-blue-700/40" },
  low:    { label: "LOW",    cls: "bg-slate-700/40 text-slate-400 border-slate-700/40" },
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; Icon: typeof CheckCheck }> = {
  sent:      { label: "En attente", cls: "text-orange-400",  Icon: Clock },
  read:      { label: "Lu",         cls: "text-blue-400",    Icon: CheckCheck },
  completed: { label: "Terminé",    cls: "text-emerald-400", Icon: CheckCheck },
  failed:    { label: "Échoué",     cls: "text-red-400",     Icon: AlertTriangle },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === yesterday.toDateString()) return "Hier"
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function AgentAvatar({ name }: { name: string }) {
  return (
    <span className={cn(
      "inline-flex items-center justify-center rounded-full text-white font-bold shrink-0 w-8 h-8 text-xs",
      AGENT_COLORS[name] ?? "bg-slate-600",
    )}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}

// ─── Message card ─────────────────────────────────────────────────────────────

function HandoverCard({ msg }: { msg: HandoverMessage }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const priorityStyle = PRIORITY_STYLES[msg.priority] || PRIORITY_STYLES.normal
  const statusCfg = STATUS_CONFIG[msg.status] || STATUS_CONFIG.sent
  const StIcon = statusCfg.Icon

  const signal = (msg.data as Record<string, unknown>)?.signal as Record<string, unknown> | undefined
  const result = (msg.data as Record<string, unknown>)?.result as string | undefined
  const sourceUrl = signal?.source_url as string | undefined

  const truncated = msg.content.length > 250

  function copy() {
    navigator.clipboard.writeText(msg.content).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 hover:border-slate-700 transition-colors">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <AgentAvatar name={msg.from_agent} />
        <span className="text-sm font-semibold text-slate-200">{msg.from_agent}</span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
        <AgentAvatar name={msg.to_agent} />
        <span className="text-sm font-semibold text-slate-200">{msg.to_agent}</span>
        <span className="ml-auto text-xs text-slate-600">{relTime(msg.created_at)}</span>
      </div>

      {/* Content */}
      <div className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
        {!expanded && truncated ? msg.content.slice(0, 250) + "…" : msg.content}
      </div>
      {truncated && (
        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
          {expanded ? <><ChevronUp className="w-3 h-3" /> Réduire</> : <><ChevronDown className="w-3 h-3" /> Voir plus</>}
        </button>
      )}

      {/* Source URL */}
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors truncate"
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          {sourceUrl.length > 80 ? sourceUrl.slice(0, 80) + "…" : sourceUrl}
        </a>
      )}

      {/* Result (if completed) */}
      {result && (
        <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-md p-3">
          <p className="text-xs font-semibold text-emerald-400 mb-1">Résultat de l&apos;agent</p>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{result}</p>
        </div>
      )}

      {/* Badges */}
      <div className="flex items-center flex-wrap gap-1.5">
        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border", priorityStyle.cls)}>
          {priorityStyle.label}
        </span>
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium", statusCfg.cls)}>
          <StIcon className="w-3 h-3" />{statusCfg.label}
        </span>
        {signal?.subcategory && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400">
            {signal.subcategory as string}
          </span>
        )}
        {signal?.source_platform && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400">
            {signal.source_platform as string}
          </span>
        )}
        {msg.acted_at && (
          <span className="text-[10px] text-slate-600 ml-1">
            Traité {relTime(msg.acted_at)}
          </span>
        )}
        <button onClick={copy} className="ml-auto text-slate-600 hover:text-slate-400 transition-colors">
          <Copy className="w-3.5 h-3.5" />
        </button>
        {copied && <span className="text-[10px] text-emerald-400">Copié</span>}
      </div>
    </div>
  )
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ messages }: { messages: HandoverMessage[] }) {
  const sent = messages.filter(m => m.status === "sent").length
  const completed = messages.filter(m => m.status === "completed").length
  const total = messages.length

  // Top routes
  const routes = new Map<string, number>()
  messages.forEach(m => {
    const key = `${m.from_agent} → ${m.to_agent}`
    routes.set(key, (routes.get(key) || 0) + 1)
  })
  const topRoutes = Array.from(routes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <aside className="hidden xl:flex flex-col gap-4 w-72 shrink-0">
      {/* Counters */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Résumé</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xl font-bold text-slate-100">{total}</p>
            <p className="text-[10px] text-slate-500">Total</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-orange-400">{sent}</p>
            <p className="text-[10px] text-slate-500">En attente</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-emerald-400">{completed}</p>
            <p className="text-[10px] text-slate-500">Terminés</p>
          </div>
        </div>
      </div>

      {/* Top routes */}
      {topRoutes.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Top routes</p>
          {topRoutes.map(([pair, count]) => (
            <div key={pair} className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400 truncate">{pair}</span>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(count / (topRoutes[0]?.[1] || 1)) * 100}%` }} />
                </div>
                <span className="text-xs text-slate-500 w-3 text-right">{count}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Priority breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Par priorité</p>
        {["high", "normal", "low"].map(p => {
          const count = messages.filter(m => m.priority === p).length
          if (count === 0) return null
          const style = PRIORITY_STYLES[p] || PRIORITY_STYLES.normal
          return (
            <div key={p} className="flex items-center justify-between">
              <span className={cn("text-xs px-1.5 py-0.5 rounded border", style.cls)}>{style.label}</span>
              <span className="text-xs text-slate-500">{count}</span>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HandoverPage() {
  const [messages, setMessages] = useState<HandoverMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAgent, setFilterAgent] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")

  const fetchMessages = useCallback(async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data, error } = await supabase
        .from("handover_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) {
        console.error("Failed to fetch handovers:", error)
        return
      }
      setMessages(data || [])
    } catch (err) {
      console.error("Failed to fetch handovers:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch + Realtime
  useEffect(() => {
    fetchMessages()

    let channel: ReturnType<Awaited<ReturnType<typeof import("@/lib/supabase/client")>["createClient"]>["channel"]> | null = null

    async function setupRealtime() {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      channel = supabase
        .channel("handover-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "handover_messages" }, () => {
          fetchMessages()
        })
        .subscribe()
    }
    setupRealtime()

    return () => { channel?.unsubscribe() }
  }, [fetchMessages])

  const agents = useMemo(() => {
    const names = new Set<string>()
    messages.forEach(m => { names.add(m.from_agent); names.add(m.to_agent) })
    return Array.from(names).sort()
  }, [messages])

  const filtered = useMemo(() => messages.filter(m => {
    if (filterAgent !== "all" && m.from_agent !== filterAgent && m.to_agent !== filterAgent) return false
    if (filterStatus !== "all" && m.status !== filterStatus) return false
    if (filterPriority !== "all" && m.priority !== filterPriority) return false
    return true
  }), [messages, filterAgent, filterStatus, filterPriority])

  // Group by day
  const grouped = useMemo(() => {
    const map = new Map<string, HandoverMessage[]>()
    for (const m of filtered) {
      const label = dayLabel(m.created_at)
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(m)
    }
    return map
  }, [filtered])

  const pending = messages.filter(m => m.status === "sent").length

  const selCls = "bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Handover</h1>
            <p className="text-sm text-slate-400 mt-0.5">Communications inter-agents — signaux dispatchés</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2">
            <span className="text-slate-200 font-medium">{messages.length} handovers</span>
            <span className="w-px h-4 bg-slate-700" />
            {pending > 0 && (
              <span className="flex items-center gap-1 text-orange-400 font-medium">
                <Clock className="w-3.5 h-3.5" />{pending} en attente
              </span>
            )}
            {pending === 0 && (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCheck className="w-3.5 h-3.5" />Tous traités
              </span>
            )}
            <button onClick={fetchMessages} className="text-slate-500 hover:text-slate-300 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-2">
          <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)} className={selCls}>
            <option value="all">Agent : tous</option>
            {agents.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className={selCls}>
            <option value="all">Priorité : toutes</option>
            {["high", "normal", "low"].map(p => <option key={p} value={p}>{(PRIORITY_STYLES[p] || { label: p }).label}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selCls}>
            <option value="all">Status : tous</option>
            {["sent", "completed"].map(s => <option key={s} value={s}>{(STATUS_CONFIG[s] || { label: s }).label}</option>)}
          </select>
          {(filterAgent !== "all" || filterPriority !== "all" || filterStatus !== "all") && (
            <button onClick={() => { setFilterAgent("all"); setFilterPriority("all"); setFilterStatus("all") }}
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
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <MessageSquare className="w-10 h-10 mb-3" />
              <p className="text-sm">Aucun handover</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {Array.from(grouped.entries()).map(([day, msgs]) => (
                <div key={day} className="flex flex-col gap-3">
                  {/* Day separator */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-xs font-semibold text-slate-500 bg-slate-950 px-3 py-1 rounded-full border border-slate-800 whitespace-nowrap">
                      {day}
                    </span>
                    <div className="flex-1 h-px bg-slate-800" />
                  </div>

                  {msgs.map(msg => (
                    <HandoverCard key={msg.id} msg={msg} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <StatsBar messages={messages} />
      </div>
    </div>
  )
}
