"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Settings2, Radio, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignalTabNav } from "./signal-tab-nav"
import { SignalFilters, type FilterState } from "./signal-filters"
import { SignalCard } from "./signal-card"
import { SignalStatsSidebar } from "./signal-stats-sidebar"
import { SignalPlaceholderTab } from "./signal-placeholder-tab"
import type { SignalItem, SignalSource, SignalImpact, SignalStatus, SignalTab } from "@/lib/signal-data"
import { createClient } from "@/lib/supabase/client"
import { SignalSourcesDialog } from "./signal-sources-dialog"

// DB → Frontend mapping (duplicated from queries.ts to avoid module-level createClient)
const IMPACT_MAP: Record<string, SignalImpact> = {
  fort: "HIGH", moyen: "MEDIUM", faible: "LOW", opportunite: "HIGH",
}
const SIGNAL_STATUS_MAP: Record<string, SignalStatus> = {
  raw: "pending", tagged: "pending", indispensable: "pending", borderline: "pending",
  approved: "approved", rejected: "rejected",
  dispatched: "dispatched", applied: "dispatched", archived: "rejected",
}
const PLATFORM_SOURCE_MAP: Record<string, SignalSource> = {
  twitter: "Twitter", reddit: "Reddit", youtube: "YouTube", linkedin: "LinkedIn",
  rss: "RSS", blog: "RSS", google_news: "RSS", github: "RSS", other: "RSS",
  legifrance: "RSS", insee: "RSS", arxiv: "RSS", bodacc: "RSS",
  pappers: "RSS", pages_jaunes: "RSS", competitor: "RSS",
  job_board: "LinkedIn", producthunt: "RSS",
}
const SUBCATEGORY_TAB_MAP: Record<string, SignalTab> = {
  knowledge: "knowledge", strategy: "strategy", outbound_inbound: "outbound",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbSignalToFrontend(row: any): SignalItem {
  return {
    id: row.id,
    tab: SUBCATEGORY_TAB_MAP[row.subcategory] || "knowledge",
    source: PLATFORM_SOURCE_MAP[row.source_platform] || "RSS",
    sourceHandle: row.source_platform || "unknown",
    impact: IMPACT_MAP[row.impact_level] || "MEDIUM",
    status: SIGNAL_STATUS_MAP[row.status] || "pending",
    title: row.title,
    content: row.summary,
    url: row.source_url || "#",
    company: row.company_data && Object.keys(row.company_data).length > 0
      ? { name: row.company_data.name || "", sector: row.company_data.sector || "" }
      : undefined,
    createdAt: new Date(row.created_at),
  }
}

export function SignalPage() {
  const [activeTab, setActiveTab] = useState<SignalTab>("knowledge")
  const [signals, setSignals] = useState<SignalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    sources: [],
    impacts: [],
    status: "all",
    dateRange: "24h",
  })

  const fetchSignals = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("signal_items")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching signals:", error)
        return
      }
      setSignals((data || []).map(mapDbSignalToFrontend))
    } catch (err) {
      console.error("Failed to fetch signals:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSignals()
  }, [fetchSignals])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("signals-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "signal_items" },
        () => { fetchSignals() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchSignals])

  const tabCounts = useMemo(() => {
    return {
      knowledge: signals.filter((s) => s.tab === "knowledge").length,
      strategy: signals.filter((s) => s.tab === "strategy").length,
      outbound: signals.filter((s) => s.tab === "outbound").length,
    }
  }, [signals])

  const tabSignals = useMemo(
    () => signals.filter((s) => s.tab === activeTab),
    [signals, activeTab],
  )

  const filteredSignals = useMemo(() => {
    return tabSignals.filter((s) => {
      if (filters.sources.length > 0 && !filters.sources.includes(s.source)) return false
      if (filters.impacts.length > 0 && !filters.impacts.includes(s.impact)) return false
      if (filters.status !== "all" && s.status !== filters.status) return false
      return true
    })
  }, [tabSignals, filters])

  const handleStatusChange = async (id: string, status: string, dispatchedTo?: string) => {
    try {
      const body: Record<string, unknown> = { status }
      if (dispatchedTo) body.dispatched_to = dispatchedTo

      const res = await fetch(`/api/signals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        console.error("Failed to update signal:", err)
      }
      // Realtime will handle the UI update
    } catch (err) {
      console.error("Failed to update signal:", err)
    }
  }

  const handleSubcategoryChange = async (id: string, subcategory: string) => {
    try {
      const signal = signals.find(s => s.id === id)
      const currentStatus = signal?.status === "pending" ? "tagged" : signal?.status || "tagged"
      const res = await fetch(`/api/signals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: currentStatus, subcategory }),
      })

      if (!res.ok) {
        const err = await res.json()
        console.error("Failed to update subcategory:", err)
      }
    } catch (err) {
      console.error("Failed to update subcategory:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 size={32} className="text-purple-400 animate-spin" />
        <p className="text-sm text-slate-500">Chargement des signaux...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0 min-h-screen">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-600/20 flex items-center justify-center">
            <Radio size={18} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-50 leading-tight">Signal</h1>
            <p className="text-xs text-slate-500">
              Module de veille marché · {signals.length} signaux
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-slate-100 text-xs gap-2"
          onClick={() => setSourcesOpen(true)}
        >
          <Settings2 size={13} />
          Configurer les sources
        </Button>
      </div>

      {/* Tab navigation */}
      <div className="px-6">
        <SignalTabNav activeTab={activeTab} onChange={setActiveTab} counts={tabCounts} />
      </div>

      {/* Tab content */}
      {activeTab !== "knowledge" && tabSignals.length === 0 ? (
        <div className="px-6 py-6">
          <SignalPlaceholderTab tab={activeTab} />
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-6 py-5 flex-1">
          {/* Tab header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                {activeTab === "knowledge" && "Veille Marché & Technologique"}
                {activeTab === "strategy" && "Signaux Stratégiques"}
                {activeTab === "outbound" && "Outbound / Inbound"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredSignals.length} signal{filteredSignals.length !== 1 ? "s" : ""} affiché{filteredSignals.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Filters */}
          <SignalFilters filters={filters} onChange={setFilters} />

          {/* Main layout: grid + sidebar */}
          <div className="flex gap-5 items-start">
            {/* Signal cards grid */}
            <div className="flex-1 min-w-0">
              {filteredSignals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                    <Radio size={22} className="text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-400">Aucun signal ne correspond aux filtres.</p>
                  <button
                    onClick={() =>
                      setFilters({ sources: [], impacts: [], status: "all", dateRange: "24h" })
                    }
                    className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {filteredSignals.map((signal) => (
                    <SignalCard
                      key={signal.id}
                      signal={signal}
                      onStatusChange={handleStatusChange}
                      onSubcategoryChange={handleSubcategoryChange}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Stats sidebar */}
            <SignalStatsSidebar signals={tabSignals} />
          </div>
        </div>
      )}

      <SignalSourcesDialog open={sourcesOpen} onOpenChange={setSourcesOpen} />
    </div>
  )
}
