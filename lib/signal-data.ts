export type SignalSource = "Twitter" | "Reddit" | "YouTube" | "LinkedIn" | "RSS"
export type SignalImpact = "HIGH" | "MEDIUM" | "LOW"
export type SignalStatus = "pending" | "approved" | "rejected" | "dispatched"
export type SignalTab = "knowledge" | "strategy" | "outbound"

export interface SignalItem {
  id: string
  tab: SignalTab
  source: SignalSource
  sourceHandle: string
  impact: SignalImpact
  status: SignalStatus
  title: string
  content: string
  url: string
  company?: {
    name: string
    sector: string
  }
  createdAt: Date
}

export const AGENTS_FOR_DISPATCH = [
  { id: "research", name: "Research", role: "Veille" },
  { id: "outbound", name: "Outbound", role: "Prospection" },
  { id: "tam", name: "TAM", role: "Account Management" },
  { id: "architect", name: "Architect", role: "Architecture" },
  { id: "monitor", name: "Monitor", role: "Monitoring" },
  { id: "main", name: "Morpheus", role: "Orchestrateur" },
]

export function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 60) return `Il y a ${diffMins}min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  return `Il y a ${diffDays}j`
}

