"use client"

import { useState } from "react"
import { ExternalLink, Check, X, Send, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SignalSourceIcon } from "./signal-source-icon"
import type { SignalItem } from "@/lib/signal-data"
import { AGENTS_FOR_DISPATCH, getRelativeTime } from "@/lib/signal-data"

const IMPACT_CONFIG = {
  HIGH: {
    label: "HIGH",
    className: "bg-red-500/20 text-red-400 border border-red-500/30",
  },
  MEDIUM: {
    label: "MEDIUM",
    className: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  },
  LOW: {
    label: "LOW",
    className: "bg-green-500/20 text-green-400 border border-green-500/30",
  },
}

const STATUS_CONFIG = {
  pending: {
    dot: "bg-amber-400",
    label: "En attente",
    icon: null,
  },
  approved: {
    dot: "bg-green-400",
    label: "Approuvé",
    icon: Check,
  },
  rejected: {
    dot: "bg-red-400",
    label: "Rejeté",
    icon: X,
  },
  dispatched: {
    dot: "bg-blue-400",
    label: "Dispatché",
    icon: Send,
  },
}

interface SignalCardProps {
  signal: SignalItem
  onStatusChange: (id: string, status: string, dispatchedTo?: string) => void
}

export function SignalCard({ signal, onStatusChange }: SignalCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const impact = IMPACT_CONFIG[signal.impact]
  const statusCfg = STATUS_CONFIG[signal.status]

  const handleAction = async (newStatus: string, dispatchedTo?: string) => {
    setIsUpdating(true)
    try {
      await onStatusChange(signal.id, newStatus, dispatchedTo)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col gap-3 hover:border-slate-700 transition-colors">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <SignalSourceIcon source={signal.source} size={18} />
          <span className="text-xs text-slate-400 truncate font-medium">{signal.sourceHandle}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${impact.className}`}>
            {impact.label}
          </span>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {getRelativeTime(signal.createdAt)}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-slate-50 leading-snug line-clamp-2">
        {signal.title}
      </h3>

      {/* Content preview */}
      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{signal.content}</p>

      {/* Company data */}
      {signal.company && (
        <div className="flex items-center gap-1.5 bg-slate-800/60 rounded-md px-2.5 py-1.5">
          <Building2 size={12} className="text-slate-500 shrink-0" />
          <span className="text-xs text-slate-300 font-medium">{signal.company.name}</span>
          <span className="text-xs text-slate-500">·</span>
          <span className="text-xs text-slate-500">{signal.company.sector}</span>
        </div>
      )}

      {/* URL */}
      {signal.url && signal.url !== '#' && (
        <a
          href={signal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors w-fit"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={11} />
          <span className="truncate max-w-[220px]">Voir la source</span>
        </a>
      )}

      {/* Divider */}
      <div className="border-t border-slate-800" />

      {/* Status + Actions */}
      <div className="flex items-center justify-between gap-2">
        {/* Status indicator */}
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${statusCfg.dot} ${signal.status === "pending" ? "animate-pulse" : ""}`} />
          <span className="text-xs text-slate-400">{statusCfg.label}</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {signal.status === "pending" && (
            <>
              <Button
                size="sm"
                variant="ghost"
                disabled={isUpdating}
                onClick={() => handleAction("approved")}
                className="h-7 px-2.5 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10 border border-green-500/20 hover:border-green-500/40"
              >
                <Check size={12} className="mr-1" />
                Approuver
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isUpdating}
                onClick={() => handleAction("rejected")}
                className="h-7 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40"
              >
                <X size={12} className="mr-1" />
                Rejeter
              </Button>
            </>
          )}

          {signal.status === "approved" && (
            <>
              <Button
                size="sm"
                variant="ghost"
                disabled={isUpdating}
                onClick={() => handleAction("rejected")}
                className="h-7 px-2.5 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-700"
              >
                <X size={12} className="mr-1" />
                Rejeter
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    disabled={isUpdating}
                    className="h-7 px-2.5 text-xs bg-blue-600 hover:bg-blue-500 text-white border-0"
                  >
                    <Send size={12} className="mr-1" />
                    Dispatcher
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="bg-slate-900 border-slate-700 text-slate-50 w-48"
                  align="end"
                >
                  <DropdownMenuLabel className="text-slate-400 text-xs">
                    Dispatcher vers
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  {AGENTS_FOR_DISPATCH.map((agent) => (
                    <DropdownMenuItem
                      key={agent.id}
                      className="text-xs hover:bg-slate-800 cursor-pointer gap-2"
                      onClick={() => handleAction("dispatched", agent.id)}
                    >
                      <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {agent.name[0]}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium">{agent.name}</span>
                        <span className="text-slate-500 text-[10px]">{agent.role}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {(signal.status === "rejected" || signal.status === "dispatched") && (
            <Button
              size="sm"
              variant="ghost"
              disabled={isUpdating}
              onClick={() => handleAction("tagged")}
              className="h-7 px-2.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700"
            >
              Remettre en attente
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
