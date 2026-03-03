"use client"

import { Target, TrendingUp } from "lucide-react"
import type { SignalTab } from "@/lib/signal-data"

const CONFIG: Record<Exclude<SignalTab, "knowledge">, { icon: React.ElementType; title: string; description: string; color: string }> = {
  strategy: {
    icon: Target,
    title: "Veille Stratégique",
    description: "Surveillance des concurrents, mouvements de marché et opportunités stratégiques.",
    color: "text-purple-400",
  },
  outbound: {
    icon: TrendingUp,
    title: "Outbound / Inbound",
    description: "Détection d'opportunités business, signaux d'achat et intent data.",
    color: "text-green-400",
  },
}

export function SignalPlaceholderTab({ tab }: { tab: Exclude<SignalTab, "knowledge"> }) {
  const cfg = CONFIG[tab]
  const Icon = cfg.icon
  return (
    <div className="flex flex-col items-center justify-center h-80 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
        <Icon size={28} className={cfg.color} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-1">{cfg.title}</h3>
        <p className="text-sm text-slate-500 max-w-xs">{cfg.description}</p>
      </div>
      <p className="text-xs text-slate-600 border border-slate-800 rounded-full px-3 py-1">
        Page 7 & 8 — À venir
      </p>
    </div>
  )
}
