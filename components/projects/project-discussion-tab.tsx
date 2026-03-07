"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Bot, User, Info, FileText, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface ProjectMessage {
  id: string
  project_id: string
  role: 'agent' | 'human' | 'system'
  content: string
  message_type: string
  metadata: Record<string, unknown>
  created_at: string
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const TYPE_ICONS: Record<string, typeof Bot> = {
  plan_proposal: FileText,
  metric_update: BarChart3,
  status_update: Info,
  deliverable: FileText,
  feedback: User,
}

function PlanProposalCard({ content }: { content: string }) {
  try {
    const plan = JSON.parse(content)
    return (
      <div className="bg-slate-700/40 rounded-md p-2.5 text-xs space-y-1.5">
        {plan.objective && <p><span className="text-slate-500">Objectif:</span> <span className="text-slate-200">{plan.objective}</span></p>}
        {plan.complexity && <p><span className="text-slate-500">Complexité:</span> <span className="text-slate-200">{plan.complexity}</span></p>}
        {plan.steps && (
          <div>
            <span className="text-slate-500">Étapes:</span>
            <ul className="ml-3 mt-0.5">
              {plan.steps.map((s: { label: string }, i: number) => (
                <li key={i} className="text-slate-300">• {s.label || s}</li>
              ))}
            </ul>
          </div>
        )}
        {plan.success_metrics && (
          <div>
            <span className="text-slate-500">Métriques:</span>
            <ul className="ml-3 mt-0.5">
              {plan.success_metrics.map((m: { name: string; target: string | number }, i: number) => (
                <li key={i} className="text-slate-300">• {m.name}: cible {String(m.target)}</li>
              ))}
            </ul>
          </div>
        )}
        {plan.risks && plan.risks.length > 0 && (
          <div>
            <span className="text-slate-500">Risques:</span>
            <ul className="ml-3 mt-0.5">
              {plan.risks.map((r: string | { description: string }, i: number) => (
                <li key={i} className="text-red-400/80">• {typeof r === 'string' ? r : r.description}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  } catch {
    return <p className="text-sm text-slate-300 whitespace-pre-wrap">{content}</p>
  }
}

function MessageBubble({ message }: { message: ProjectMessage }) {
  const isAgent = message.role === 'agent'
  const isSystem = message.role === 'system'
  const Icon = TYPE_ICONS[message.message_type] || (isAgent ? Bot : User)

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-amber-900/20 border border-amber-800/30 rounded-full px-3 py-1 flex items-center gap-1.5">
          <Info className="w-3 h-3 text-amber-400" />
          <span className="text-xs text-amber-400">{message.content}</span>
          <span className="text-[10px] text-amber-600 ml-2">{formatTime(message.created_at)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex gap-2 my-1.5", isAgent ? "justify-start" : "justify-end")}>
      {isAgent && (
        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center shrink-0 mt-1">
          <Icon className="w-3.5 h-3.5 text-slate-400" />
        </div>
      )}
      <div className={cn(
        "max-w-[80%] rounded-lg px-3 py-2",
        isAgent ? "bg-slate-800 border border-slate-700" : "bg-blue-600"
      )}>
        {message.message_type === 'plan_proposal' && isAgent ? (
          <PlanProposalCard content={message.content} />
        ) : message.message_type === 'metric_update' ? (
          <div className="text-xs">
            <p className="text-slate-400 mb-1 flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Mise à jour des métriques</p>
            <pre className="text-slate-300 whitespace-pre-wrap">{message.content}</pre>
          </div>
        ) : (
          <p className="text-sm text-slate-100 whitespace-pre-wrap">{message.content}</p>
        )}
        <p className={cn("text-[10px] mt-1", isAgent ? "text-slate-600" : "text-blue-300")}>
          {formatTime(message.created_at)}
        </p>
      </div>
      {!isAgent && (
        <div className="w-6 h-6 rounded-full bg-blue-700 flex items-center justify-center shrink-0 mt-1">
          <User className="w-3.5 h-3.5 text-blue-200" />
        </div>
      )}
    </div>
  )
}

export default function ProjectDiscussionTab({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<ProjectMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMessages() }, [projectId])

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`project-messages-${projectId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "project_messages",
        filter: `project_id=eq.${projectId}`,
      }, () => fetchMessages())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      })
      if (res.ok) {
        setInput("")
        fetchMessages()
      }
    } catch (err) {
      console.error("Failed to send message:", err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-slate-500 text-sm">Chargement...</div>
  }

  return (
    <div className="flex flex-col h-[400px]">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 py-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <Bot className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">Aucun message pour le moment.</p>
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} message={msg} />)
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-slate-800 pt-2 flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrire un message..."
          rows={1}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className={cn(
            "px-3 rounded-lg transition-colors flex items-center justify-center",
            input.trim() && !sending
              ? "bg-blue-600 hover:bg-blue-500 text-white"
              : "bg-slate-800 text-slate-600 cursor-not-allowed"
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function useMessageCount(projectId: string): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/messages`)
        if (res.ok) {
          const data = await res.json()
          setCount(data.length)
        }
      } catch { /* ignore */ }
    }
    fetchCount()

    const supabase = createClient()
    const channel = supabase
      .channel(`pm-count-${projectId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "project_messages",
        filter: `project_id=eq.${projectId}`,
      }, () => fetchCount())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId])

  return count
}
