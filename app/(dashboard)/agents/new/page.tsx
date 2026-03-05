"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bot, Loader2, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { TAG_COLORS, getTagColor } from "@/lib/agents-data"

const MODELS = [
  { value: "anthropic/claude-sonnet-4-20250514", label: "Sonnet 4" },
  { value: "anthropic/claude-opus-4-20250514", label: "Opus 4" },
  { value: "anthropic/claude-haiku-4-5-20251001", label: "Haiku 4.5" },
]

const AVAILABLE_TAGS = Object.keys(TAG_COLORS)

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 31)
}

export default function NewAgentPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [id, setId] = useState("")
  const [idManuallyEdited, setIdManuallyEdited] = useState(false)
  const [role, setRole] = useState("")
  const [description, setDescription] = useState("")
  const [model, setModel] = useState(MODELS[0].value)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [enabled, setEnabled] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleNameChange(value: string) {
    setName(value)
    if (!idManuallyEdited) {
      setId(slugify(value))
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, role, description, model, tags: selectedTags, enabled }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Erreur lors de la creation")
        setSubmitting(false)
        return
      }

      router.push(`/agents/${data.id}`)
    } catch {
      setError("Erreur reseau")
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/agents")}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux agents
        </button>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bot className="w-7 h-7 text-blue-400" />
          Creer un agent
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          L&apos;agent sera provisionne sur le VPS avec son workspace.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Nom <span className="text-red-400">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ex: Content Writer"
            required
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* ID */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Identifiant <span className="text-red-400">*</span>
          </label>
          <input
            value={id}
            onChange={(e) => {
              setId(e.target.value)
              setIdManuallyEdited(true)
            }}
            placeholder="content-writer"
            required
            pattern="^[a-z][a-z0-9-]{1,30}$"
            title="Lettres minuscules, chiffres et tirets (2-31 chars, commence par une lettre)"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            Workspace: /root/clawd-eagle/{id || "..."}
          </p>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Role <span className="text-red-400">*</span>
          </label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Ex: Redaction de contenu et articles"
            required
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description optionnelle de l'agent..."
            rows={3}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Modele
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TAGS.map((tag) => {
              const colors = getTagColor(tag)
              const selected = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "text-xs font-medium px-3 py-1.5 rounded-full border transition-all",
                    selected
                      ? cn(colors.bg, colors.text, colors.border, "ring-1 ring-offset-1 ring-offset-slate-950", colors.border.replace("border-", "ring-"))
                      : "bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600"
                  )}
                >
                  <Tag className="w-3 h-3 inline mr-1" />
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

        {/* Enabled toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-300">Actif</p>
            <p className="text-xs text-slate-500">L&apos;agent sera actif apres provisioning</p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={cn(
              "relative w-11 h-6 rounded-full transition-colors",
              enabled ? "bg-blue-500" : "bg-slate-700"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                enabled && "translate-x-5"
              )}
            />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !id || !name || !role}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Provisioning...
              </>
            ) : (
              <>
                <Bot className="w-4 h-4" />
                Creer l&apos;agent
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.push("/agents")}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
