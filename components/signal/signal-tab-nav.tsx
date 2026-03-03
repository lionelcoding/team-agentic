"use client"

import { BookOpen, Target, TrendingUp } from "lucide-react"
import type { SignalTab } from "@/lib/signal-data"
import { TAB_COUNTS } from "@/lib/signal-data"

const TABS: { id: SignalTab; label: string; icon: React.ElementType }[] = [
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "strategy", label: "Strategy", icon: Target },
  { id: "outbound", label: "Outbound / Inbound", icon: TrendingUp },
]

interface SignalTabNavProps {
  activeTab: SignalTab
  onChange: (tab: SignalTab) => void
}

export function SignalTabNav({ activeTab, onChange }: SignalTabNavProps) {
  return (
    <div className="flex items-center gap-0 border-b border-slate-800">
      {TABS.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors relative ${
              isActive
                ? "text-blue-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon size={15} />
            {tab.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                isActive
                  ? "bg-blue-600/20 text-blue-400"
                  : "bg-slate-800 text-slate-500"
              }`}
            >
              {TAB_COUNTS[tab.id]}
            </span>
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />
            )}
          </button>
        )
      })}
    </div>
  )
}
