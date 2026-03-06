"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Twitter, MessageSquare, Youtube, Rss, Landmark, Linkedin, BarChart3, Globe,
  Plus, ArrowLeft, Pencil, Trash2, Loader2,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

// Types
interface SignalSource {
  id: string
  name: string
  source_type: string
  source_identifier: string
  subcategory: string
  enabled: boolean
  settings: Record<string, unknown> | null
  created_at: string
}

type SourceType =
  | "twitter_handle" | "reddit_subreddit" | "youtube_channel" | "rss_feed"
  | "bodacc_filter" | "linkedin_company" | "crunchbase_company" | "custom_api"

const SOURCE_TYPE_CONFIG: Record<SourceType, { label: string; icon: typeof Twitter; placeholder: string }> = {
  twitter_handle:    { label: "Twitter / X",          icon: Twitter,        placeholder: "@handle" },
  reddit_subreddit:  { label: "Reddit",               icon: MessageSquare,  placeholder: "r/subreddit" },
  youtube_channel:   { label: "YouTube",              icon: Youtube,        placeholder: "UC..." },
  rss_feed:          { label: "Flux RSS",             icon: Rss,            placeholder: "https://blog.example.com/feed" },
  bodacc_filter:     { label: "BODACC",               icon: Landmark,       placeholder: "paris+creation" },
  linkedin_company:  { label: "LinkedIn Company",     icon: Linkedin,       placeholder: "company-slug" },
  crunchbase_company:{ label: "Crunchbase",           icon: BarChart3,      placeholder: "company-name" },
  custom_api:        { label: "API personnalisée",    icon: Globe,          placeholder: "https://api.example.com/..." },
}

const SUBCATEGORY_OPTIONS = [
  { value: "knowledge", label: "Knowledge" },
  { value: "strategy", label: "Stratégie" },
  { value: "outbound_inbound", label: "Outbound & Inbound" },
] as const

const SUBCATEGORY_LABELS: Record<string, string> = {
  knowledge: "Knowledge",
  strategy: "Stratégie",
  outbound_inbound: "Outbound & Inbound",
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignalSourcesDialog({ open, onOpenChange }: Props) {
  const [view, setView] = useState<"list" | "form">("list")
  const [sources, setSources] = useState<SignalSource[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingSource, setEditingSource] = useState<SignalSource | null>(null)

  // Form state
  const [formName, setFormName] = useState("")
  const [formType, setFormType] = useState<SourceType>("rss_feed")
  const [formIdentifier, setFormIdentifier] = useState("")
  const [formSubcategory, setFormSubcategory] = useState("knowledge")
  const [formEnabled, setFormEnabled] = useState(true)

  const fetchSources = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/signal-sources")
      if (res.ok) {
        const data = await res.json()
        setSources(data)
      }
    } catch (err) {
      console.error("Failed to fetch sources:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchSources()
      setView("list")
    }
  }, [open, fetchSources])

  function resetForm() {
    setFormName("")
    setFormType("rss_feed")
    setFormIdentifier("")
    setFormSubcategory("knowledge")
    setFormEnabled(true)
    setEditingSource(null)
  }

  function openCreateForm() {
    resetForm()
    setView("form")
  }

  function openEditForm(source: SignalSource) {
    setEditingSource(source)
    setFormName(source.name)
    setFormType(source.source_type as SourceType)
    setFormIdentifier(source.source_identifier)
    setFormSubcategory(source.subcategory)
    setFormEnabled(source.enabled)
    setView("form")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = editingSource
        ? {
            action: "update",
            id: editingSource.id,
            name: formName,
            source_type: formType,
            source_identifier: formIdentifier,
            subcategory: formSubcategory,
            enabled: formEnabled,
          }
        : {
            action: "create",
            name: formName,
            source_type: formType,
            source_identifier: formIdentifier,
            subcategory: formSubcategory,
            enabled: formEnabled,
          }

      const res = await fetch("/api/signal-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        await fetchSources()
        setView("list")
        resetForm()
      } else {
        const err = await res.json()
        console.error("Save error:", err)
      }
    } catch (err) {
      console.error("Save failed:", err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Supprimer cette source ?")) return

    try {
      const res = await fetch("/api/signal-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      })

      if (res.ok) {
        setSources((prev) => prev.filter((s) => s.id !== id))
      }
    } catch (err) {
      console.error("Delete failed:", err)
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    // Optimistic update
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled } : s))
    )

    try {
      const res = await fetch("/api/signal-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", id, enabled }),
      })

      if (!res.ok) {
        // Revert on error
        setSources((prev) =>
          prev.map((s) => (s.id === id ? { ...s, enabled: !enabled } : s))
        )
      }
    } catch {
      setSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, enabled: !enabled } : s))
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-slate-950 border-slate-800 text-slate-100">
        {view === "list" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-slate-50">Sources de signaux</DialogTitle>
              <DialogDescription className="text-slate-400">
                Gérez les sources de veille pour alimenter le module Signal.
              </DialogDescription>
            </DialogHeader>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-purple-400 animate-spin" />
              </div>
            ) : sources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                  <Rss size={22} className="text-slate-600" />
                </div>
                <p className="text-sm text-slate-400">Aucune source configurée.</p>
                <p className="text-xs text-slate-500">
                  Ajoutez des flux RSS, comptes Twitter, subreddits et plus encore.
                </p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6 space-y-2">
                {sources.map((source) => {
                  const config = SOURCE_TYPE_CONFIG[source.source_type as SourceType]
                  const Icon = config?.icon || Globe
                  return (
                    <div
                      key={source.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-md bg-slate-800 flex items-center justify-center shrink-0">
                        <Icon size={15} className="text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-200 truncate">
                            {source.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                            {SUBCATEGORY_LABELS[source.subcategory] || source.subcategory}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono truncate">
                          {source.source_identifier}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={source.enabled}
                          onCheckedChange={(checked) => handleToggle(source.id, checked)}
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-slate-500 hover:text-slate-300"
                          onClick={() => openEditForm(source)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-slate-500 hover:text-red-400"
                          onClick={() => handleDelete(source.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="pt-2">
              <Button
                onClick={openCreateForm}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white gap-2"
              >
                <Plus size={15} />
                Ajouter une source
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-slate-400 hover:text-slate-200"
                  onClick={() => { setView("list"); resetForm() }}
                >
                  <ArrowLeft size={16} />
                </Button>
                <DialogTitle className="text-slate-50">
                  {editingSource ? "Modifier la source" : "Ajouter une source"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-slate-400 sr-only">
                {editingSource ? "Modifier les paramètres de cette source." : "Configurer une nouvelle source de signaux."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Nom</Label>
                <Input
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ma source de veille"
                  className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Type de source</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as SourceType)}>
                  <SelectTrigger className="w-full bg-slate-900 border-slate-700 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {Object.entries(SOURCE_TYPE_CONFIG).map(([key, { label, icon: Icon }]) => (
                      <SelectItem key={key} value={key} className="text-slate-200">
                        <div className="flex items-center gap-2">
                          <Icon size={14} className="text-slate-400" />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Identifiant</Label>
                <Input
                  required
                  value={formIdentifier}
                  onChange={(e) => setFormIdentifier(e.target.value)}
                  placeholder={SOURCE_TYPE_CONFIG[formType]?.placeholder || ""}
                  className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600 font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Catégorie</Label>
                <Select value={formSubcategory} onValueChange={setFormSubcategory}>
                  <SelectTrigger className="w-full bg-slate-900 border-slate-700 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {SUBCATEGORY_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value} className="text-slate-200">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between py-1">
                <Label className="text-slate-300">Activée</Label>
                <Switch checked={formEnabled} onCheckedChange={setFormEnabled} />
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white gap-2"
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                {editingSource ? "Enregistrer" : "Ajouter"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
