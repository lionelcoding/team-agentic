"use client"

import { useState, useEffect } from "react"
import {
  LayoutGrid, Table2, Plus, X, TrendingUp, Users,
  Calendar, DollarSign, ChevronRight, Search, Loader2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

// ─── Types ────────────────────────────────────────────────────────────────────

type ColumnId = "new_lead" | "enriched" | "contacted" | "responded" | "meeting" | "converted"

interface Lead {
  id:        string
  company:   string
  contact:   string
  role:      string
  score:     number
  agent:     string
  agentInitials: string
  lastAction: string
  timestamp:  string
  deal?:      string
  tags:       string[]
}

interface Column {
  id:     ColumnId
  label:  string
  color:  string
  dotColor: string
  leads:  Lead[]
}

// ─── DB → Pipeline mapping ─────────────────────────────────────────────────────

const STATUS_TO_COLUMN: Record<string, ColumnId> = {
  sourced:      "new_lead",
  enriched:     "enriched",
  scored:       "contacted",
  activated:    "responded",
  active_client:"meeting",
  ambassador:   "converted",
  churning:     "meeting",
  churned:      "new_lead",
  archived:     "new_lead",
  non_eligible: "new_lead",
}

const EMPTY_COLUMNS: Column[] = [
  { id: "new_lead",  label: "Nouveau Lead",  color: "text-slate-400",   dotColor: "bg-slate-500",   leads: [] },
  { id: "enriched",  label: "Enrichi",       color: "text-blue-400",    dotColor: "bg-blue-500",    leads: [] },
  { id: "contacted", label: "Contacté",      color: "text-yellow-400",  dotColor: "bg-yellow-500",  leads: [] },
  { id: "responded", label: "Réponse reçue", color: "text-orange-400",  dotColor: "bg-orange-500",  leads: [] },
  { id: "meeting",   label: "RDV Programmé", color: "text-emerald-400", dotColor: "bg-emerald-500", leads: [] },
  { id: "converted", label: "Converti",      color: "text-green-400",   dotColor: "bg-green-500",   leads: [] },
]

function timeAgo(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now.getTime() - d.getTime()
  const hours = Math.floor(diffMs / 3600000)
  if (hours < 1) return "à l'instant"
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return "il y a 1j"
  if (days < 30) return `il y a ${days}j`
  return `il y a ${Math.floor(days / 30)} mois`
}

function getInitials(name: string): string {
  return name.split("_").map(w => w[0]?.toUpperCase() ?? "").join("").slice(0, 2)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 80) return "text-emerald-400 bg-emerald-600/20 border-emerald-700/40"
  if (s >= 60) return "text-yellow-400 bg-yellow-600/20 border-yellow-700/40"
  return                "text-red-400    bg-red-600/20    border-red-700/40"
}

// ─── Add Lead Modal ────────────────────────────────────────────────────────────

function AddLeadModal({ onClose, onAdd }: { onClose: () => void; onAdd: (lead: Lead) => void }) {
  const [company, setCompany]   = useState("")
  const [contact, setContact]   = useState("")
  const [role,    setRole]      = useState("")
  const [error,   setError]     = useState("")

  function submit() {
    if (!company.trim()) { setError("Nom d'entreprise requis"); return }
    onAdd({
      id:           `l${Date.now()}`,
      company:      company.trim(),
      contact:      contact || "—",
      role:         role    || "—",
      score:        Math.floor(Math.random() * 30) + 60,
      agent:        "Iris",
      agentInitials:"IR",
      lastAction:   "Lead ajouté manuellement",
      timestamp:    "à l'instant",
      tags:         [],
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-100">Ajouter un lead</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Entreprise *</label>
            <input
              value={company} onChange={e => { setCompany(e.target.value); setError("") }}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
              placeholder="ex: Acme Corp"
            />
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Nom du contact</label>
            <input value={contact} onChange={e => setContact(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600" placeholder="ex: Jean Dupont" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Fonction</label>
            <input value={role} onChange={e => setRole(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600" placeholder="ex: CTO" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg transition-colors">Annuler</button>
          <button onClick={submit}  className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">Créer le lead</button>
        </div>
      </div>
    </div>
  )
}

// ─── Lead Detail Modal ────────────────────────────────────────────────────────

function LeadDetailModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100">{lead.company}</h2>
            <p className="text-sm text-slate-400">{lead.contact} · {lead.role}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 mt-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label:"Score ICP", value:`${lead.score}/100` },
            { label:"Agent",     value:lead.agent         },
            { label:"Dernière action", value:lead.lastAction },
            { label:"Créé",      value:lead.timestamp     },
          ].map(item => (
            <div key={item.label} className="bg-slate-800/60 rounded-lg p-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{item.label}</p>
              <p className="text-sm font-medium text-slate-200 mt-0.5 truncate">{item.value}</p>
            </div>
          ))}
        </div>
        {lead.deal && (
          <div className="bg-green-600/10 border border-green-700/30 rounded-lg p-3 mb-4">
            <p className="text-xs text-slate-500">Valeur du deal</p>
            <p className="text-xl font-bold text-green-400">{lead.deal}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {lead.tags.map(t => (
            <span key={t} className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

function LeadCard({ lead, onDragStart, onClick }: { lead: Lead; onDragStart: (id: string) => void; onClick: () => void }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(lead.id)}
      onClick={onClick}
      className="bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md hover:shadow-black/20 active:opacity-70 group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-slate-100 leading-tight">{lead.company}</p>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${scoreColor(lead.score)}`}>{lead.score}</span>
      </div>
      <p className="text-xs text-slate-500 mb-2">{lead.contact} · {lead.role}</p>
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {lead.deal && (
          <span className="text-[10px] font-medium text-green-400 bg-green-600/15 border border-green-700/30 px-1.5 py-0.5 rounded-full">{lead.deal}</span>
        )}
        {lead.tags.slice(0,2).map(t => (
          <span key={t} className="text-[10px] text-slate-600 bg-slate-800 border border-slate-700/60 px-1.5 py-0.5 rounded-full">{t}</span>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold">{lead.agentInitials}</span>
          <span className="text-[10px] text-slate-600">{lead.agent}</span>
        </div>
        <span className="text-[10px] text-slate-600">{lead.timestamp}</span>
      </div>
      <p className="text-[10px] text-slate-600 mt-1.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">{lead.lastAction}</p>
    </div>
  )
}

// ─── Table View ───────────────────────────────────────────────────────────────

function TableView({ columns, onLeadClick }: { columns: Column[]; onLeadClick: (lead: Lead) => void }) {
  const allLeads = columns.flatMap(c => c.leads.map(l => ({ ...l, status: c.label, statusColor: c.color })))
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              {["Entreprise","Contact","Fonction","Score","Statut","Agent","Action","Date"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {allLeads.map(lead => (
              <tr
                key={lead.id}
                onClick={() => onLeadClick(lead)}
                className="hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-semibold text-slate-100 whitespace-nowrap">{lead.company}</td>
                <td className="px-4 py-3 text-slate-400">{lead.contact}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{lead.role}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${scoreColor(lead.score)}`}>{lead.score}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${(lead as Lead & { statusColor?: string }).statusColor}`}>{(lead as Lead & { status?: string }).status}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{lead.agent}</td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">{lead.lastAction}</td>
                <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{lead.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [columns,    setColumns]    = useState<Column[]>(EMPTY_COLUMNS)
  const [loading,    setLoading]    = useState(true)
  const [view,       setView]       = useState<"kanban" | "table">("kanban")
  const [search,     setSearch]     = useState("")
  const [dragId,     setDragId]     = useState<string | null>(null)
  const [dragOver,   setDragOver]   = useState<ColumnId | null>(null)
  const [showAdd,    setShowAdd]    = useState(false)
  const [detailLead, setDetailLead] = useState<Lead | null>(null)

  useEffect(() => {
    async function fetchLeads() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("leads")
          .select("*, agents!leads_assigned_agent_id_fkey(name)")
          .order("created_at", { ascending: false })

        if (error) throw error

        const cols: Column[] = EMPTY_COLUMNS.map(c => ({ ...c, leads: [] }))

        for (const row of data ?? []) {
          const colId = STATUS_TO_COLUMN[row.status] ?? "new_lead"
          const col = cols.find(c => c.id === colId)
          if (!col) continue

          const agentName = (row.agents as { name?: string } | null)?.name ?? "—"
          const dealValue = row.deal_value ? `€${Math.round(row.deal_value / 1000)}K` : undefined

          col.leads.push({
            id:           row.id,
            company:      row.company_name ?? "—",
            contact:      row.contact_name ?? "—",
            role:         row.contact_role ?? "—",
            score:        row.icp_score ?? 0,
            agent:        agentName.charAt(0).toUpperCase() + agentName.slice(1),
            agentInitials: getInitials(agentName),
            lastAction:   row.last_action ?? "—",
            timestamp:    row.created_at ? timeAgo(row.created_at) : "—",
            deal:         dealValue,
            tags:         Array.isArray(row.tags) ? row.tags : [],
          })
        }

        setColumns(cols)
      } catch (err) {
        console.error("Failed to fetch leads:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchLeads()
  }, [])

  const totalLeads     = columns.reduce((s, c) => s + c.leads.length, 0)
  const converted      = columns.find(c => c.id === "converted")?.leads ?? []
  const convertedCount = converted.length
  const convRate       = totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0
  const pipelineValue  = converted.reduce((s, l) => s + (l.deal ? parseInt(l.deal.replace(/[^\d]/g,"")) * 1000 : 0), 0)

  function handleDrop(targetColId: ColumnId) {
    if (!dragId) return
    let draggedLead: Lead | null = null
    const updated = columns.map(col => {
      const idx = col.leads.findIndex(l => l.id === dragId)
      if (idx !== -1) { draggedLead = col.leads[idx]; return { ...col, leads: col.leads.filter(l => l.id !== dragId) } }
      return col
    })
    if (!draggedLead) return
    setColumns(updated.map(col => col.id === targetColId ? { ...col, leads: [...col.leads, draggedLead!] } : col))
    setDragId(null); setDragOver(null)
  }

  function handleAddLead(lead: Lead) {
    setColumns(prev => prev.map(c => c.id === "new_lead" ? { ...c, leads: [lead, ...c.leads] } : c))
  }

  const searchLower = search.toLowerCase()
  const filteredColumns = columns.map(c => ({
    ...c,
    leads: search ? c.leads.filter(l => l.company.toLowerCase().includes(searchLower) || l.contact.toLowerCase().includes(searchLower)) : c.leads,
  }))

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 size={32} className="text-blue-400 animate-spin" />
        <p className="text-sm text-slate-500">Chargement du pipeline...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Pipeline</h1>
          <p className="text-sm text-slate-400 mt-1">{totalLeads} leads · 6 étapes</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "kanban" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
            <button
              onClick={() => setView("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "table" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              <Table2 className="w-3.5 h-3.5" /> Tableau
            </button>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Users,      label:"Total leads",       value: String(totalLeads),        color:"text-slate-300"  },
          { icon: TrendingUp, label:"Taux conversion",   value:`${convRate}%`,             color:"text-emerald-400"},
          { icon: Calendar,   label:"Temps moyen",       value:"12.4 jours",               color:"text-blue-400"   },
          { icon: DollarSign, label:"Pipeline converti", value:`€${pipelineValue.toLocaleString("fr-FR")}`, color:"text-green-400" },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 flex items-center gap-3">
              <Icon className={`w-4 h-4 ${s.color} shrink-0`} />
              <div>
                <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-slate-600">{s.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un lead…"
          className="w-full bg-slate-900 border border-slate-800 text-slate-300 placeholder-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-600"
        />
      </div>

      {/* Views */}
      {view === "table" ? (
        <TableView columns={filteredColumns} onLeadClick={setDetailLead} />
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {filteredColumns.map(col => (
              <div
                key={col.id}
                className={`w-72 flex flex-col rounded-xl border transition-colors ${dragOver === col.id ? "border-blue-600/60 bg-blue-600/5" : "border-slate-800 bg-slate-900/50"}`}
                onDragOver={e => { e.preventDefault(); setDragOver(col.id) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(col.id)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                    <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{col.leads.length}</span>
                </div>
                {/* Cards */}
                <div className="flex flex-col gap-2 p-3 min-h-[200px]">
                  {col.leads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} onDragStart={setDragId} onClick={() => setDetailLead(lead)} />
                  ))}
                  {col.leads.length === 0 && (
                    <div className="flex flex-col items-center justify-center flex-1 py-8 text-slate-700 border-2 border-dashed border-slate-800 rounded-lg">
                      <ChevronRight className="w-5 h-5 mb-1 opacity-40" />
                      <p className="text-xs">Déposer ici</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd    && <AddLeadModal   onClose={() => setShowAdd(false)} onAdd={handleAddLead} />}
      {detailLead && <LeadDetailModal lead={detailLead} onClose={() => setDetailLead(null)} />}
    </div>
  )
}
