"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SignalSource, SignalImpact, SignalStatus } from "@/lib/signal-data"

const SOURCES: SignalSource[] = ["Twitter", "Reddit", "YouTube", "LinkedIn", "RSS"]
const IMPACTS: SignalImpact[] = ["HIGH", "MEDIUM", "LOW"]
const STATUSES: { value: SignalStatus | "all"; label: string }[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "pending", label: "En attente" },
  { value: "approved", label: "Approuvé" },
  { value: "rejected", label: "Rejeté" },
  { value: "dispatched", label: "Dispatché" },
]
const DATE_RANGES = [
  { value: "24h", label: "24h" },
  { value: "7j", label: "7j" },
  { value: "30j", label: "30j" },
]

const IMPACT_CHIP = {
  HIGH: "bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25",
  MEDIUM: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/25",
  LOW: "bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25",
}
const IMPACT_ACTIVE = {
  HIGH: "bg-red-500/30 text-red-300 border-red-500/60",
  MEDIUM: "bg-yellow-500/30 text-yellow-300 border-yellow-500/60",
  LOW: "bg-green-500/30 text-green-300 border-green-500/60",
}

export interface FilterState {
  sources: SignalSource[]
  impacts: SignalImpact[]
  status: SignalStatus | "all"
  dateRange: string
}

interface SignalFiltersProps {
  filters: FilterState
  onChange: (f: FilterState) => void
}

export function SignalFilters({ filters, onChange }: SignalFiltersProps) {
  const toggleSource = (src: SignalSource) => {
    const next = filters.sources.includes(src)
      ? filters.sources.filter((s) => s !== src)
      : [...filters.sources, src]
    onChange({ ...filters, sources: next })
  }

  const toggleImpact = (imp: SignalImpact) => {
    const next = filters.impacts.includes(imp)
      ? filters.impacts.filter((i) => i !== imp)
      : [...filters.impacts, imp]
    onChange({ ...filters, impacts: next })
  }

  const hasActiveFilters =
    filters.sources.length > 0 ||
    filters.impacts.length > 0 ||
    filters.status !== "all" ||
    filters.dateRange !== "24h"

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Source chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {SOURCES.map((src) => {
          const active = filters.sources.includes(src)
          return (
            <button
              key={src}
              onClick={() => toggleSource(src)}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                active
                  ? "bg-blue-600/30 text-blue-300 border-blue-500/60"
                  : "bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {src}
            </button>
          )
        })}
      </div>

      <div className="w-px h-4 bg-slate-700" />

      {/* Impact toggles */}
      <div className="flex items-center gap-1.5">
        {IMPACTS.map((imp) => {
          const active = filters.impacts.includes(imp)
          return (
            <button
              key={imp}
              onClick={() => toggleImpact(imp)}
              className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-colors ${
                active ? IMPACT_ACTIVE[imp] : IMPACT_CHIP[imp]
              }`}
            >
              {imp}
            </button>
          )
        })}
      </div>

      <div className="w-px h-4 bg-slate-700" />

      {/* Status select */}
      <Select
        value={filters.status}
        onValueChange={(val) => onChange({ ...filters, status: val as SignalStatus | "all" })}
      >
        <SelectTrigger className="h-7 text-xs w-36 bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value} className="text-xs hover:bg-slate-800">
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date range */}
      <div className="flex items-center bg-slate-800/60 border border-slate-700 rounded-md overflow-hidden">
        {DATE_RANGES.map((dr) => (
          <button
            key={dr.value}
            onClick={() => onChange({ ...filters, dateRange: dr.value })}
            className={`text-xs px-3 py-1 transition-colors ${
              filters.dateRange === dr.value
                ? "bg-blue-600 text-white font-medium"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
            }`}
          >
            {dr.label}
          </button>
        ))}
      </div>

      {/* Reset */}
      {hasActiveFilters && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            onChange({ sources: [], impacts: [], status: "all", dateRange: "24h" })
          }
          className="h-7 px-2 text-xs text-slate-500 hover:text-slate-300"
        >
          <X size={12} className="mr-1" />
          Réinitialiser
        </Button>
      )}
    </div>
  )
}
