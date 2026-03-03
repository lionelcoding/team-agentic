"use client"

import { useState, useMemo, useEffect } from "react"
import { Settings2, Radio, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignalTabNav } from "./signal-tab-nav"
import { SignalFilters, type FilterState } from "./signal-filters"
import { SignalCard } from "./signal-card"
import { SignalStatsSidebar } from "./signal-stats-sidebar"
import { SignalPlaceholderTab } from "./signal-placeholder-tab"
import type { SignalItem, SignalTab } from "@/lib/signal-data"
import { getSignalItems } from "@/lib/supabase/queries"

export function SignalPage() {
  const [activeTab, setActiveTab] = useState<SignalTab>("knowledge")
  const [signals, setSignals] = useState<SignalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>({
    sources: [],
    impacts: [],
    status: "all",
    dateRange: "24h",
  })

  useEffect(() => {
    async function fetchSignals() {
      try {
        const items = await getSignalItems()
        setSignals(items)
      } catch (err) {
        console.error("Failed to fetch signals:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchSignals()
  }, [])

  const knowledgeSignals = useMemo(
    () => signals.filter((s) => s.tab === "knowledge"),
    [signals],
  )

  const filteredSignals = useMemo(() => {
    return knowledgeSignals.filter((s) => {
      if (filters.sources.length > 0 && !filters.sources.includes(s.source)) return false
      if (filters.impacts.length > 0 && !filters.impacts.includes(s.impact)) return false
      if (filters.status !== "all" && s.status !== filters.status) return false
      return true
    })
  }, [knowledgeSignals, filters])

  const handleStatusChange = (id: string, status: SignalItem["status"]) => {
    setSignals((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)))
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
              Module de veille marché · {knowledgeSignals.length} signaux Knowledge
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-slate-100 text-xs gap-2"
        >
          <Settings2 size={13} />
          Configurer les sources
        </Button>
      </div>

      {/* Tab navigation */}
      <div className="px-6">
        <SignalTabNav activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab content */}
      {activeTab !== "knowledge" ? (
        <div className="px-6 py-6">
          <SignalPlaceholderTab tab={activeTab} />
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-6 py-5 flex-1">
          {/* Knowledge header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Veille Marché {"&"} Technologique
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredSignals.length} signal{filteredSignals.length !== 1 ? "s" : ""} affichés
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
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Stats sidebar */}
            <SignalStatsSidebar signals={knowledgeSignals} />
          </div>
        </div>
      )}
    </div>
  )
}
