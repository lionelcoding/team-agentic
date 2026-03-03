"use client"

import { useState, useRef } from "react"
import {
  CheckCircle2, Wifi, RefreshCw, Eye, EyeOff, Copy, Send,
  ChevronDown, Shield, Bot, Zap, AlertTriangle, Save,
  ToggleLeft, ToggleRight, Terminal, Key, Bell,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

// ─── Mock data ────────────────────────────────────────────────────────────────

const GATEWAY_LOGS = [
  "[2025-03-02 08:42:11] INFO  Gateway started on port 18789",
  "[2025-03-02 08:42:11] INFO  Loading agent registry… 16 agents found",
  "[2025-03-02 08:42:12] INFO  Tailscale tunnel established — tailnet: leadgen-prod",
  "[2025-03-02 08:43:05] INFO  Agent Victor: heartbeat OK (42ms)",
  "[2025-03-02 08:43:05] INFO  Agent Iris: heartbeat OK (38ms)",
  "[2025-03-02 08:44:17] WARN  Agent Nathan: slow response (1 240ms) — retrying",
  "[2025-03-02 08:44:18] INFO  Agent Nathan: retry OK (210ms)",
  "[2025-03-02 08:45:00] INFO  Dispatch queue: 3 pending messages",
  "[2025-03-02 08:45:01] INFO  Dispatched → Alice (emailing sequence #74)",
  "[2025-03-02 08:46:33] INFO  Agent Diane: ICP scoring batch completed (47 leads)",
  "[2025-03-02 08:47:10] INFO  Token budget check: €8.42 / €50.00 today",
  "[2025-03-02 08:48:00] INFO  Signal scan: 3 new BODACC entries detected",
  "[2025-03-02 08:48:02] INFO  Dispatched → Hugo (scraper task #31)",
  "[2025-03-02 08:49:30] INFO  Agent Clara: RGPD audit passed — 0 violations",
  "[2025-03-02 08:50:00] INFO  Heartbeat cycle #147 — all 16 agents responding",
  "[2025-03-02 08:51:45] INFO  Agent Victor: orchestration plan updated",
  "[2025-03-02 08:52:10] WARN  Model rate limit approaching: claude-opus — 85% used",
  "[2025-03-02 08:53:00] INFO  Rotating to claude-sonnet for non-critical tasks",
  "[2025-03-02 08:54:22] INFO  Handover message: Victor → Diane (lead qualification)",
  "[2025-03-02 08:55:00] INFO  Daily cost projection: €23.45 (within budget)",
]

const MODELS = [
  { id: "claude-opus-4-6",   provider: "Anthropic", usage: "Orchestration", costIn: "$15", costOut: "$75",  active: true,  color: "text-purple-400", bg: "bg-purple-600/15" },
  { id: "claude-sonnet-4-5", provider: "Anthropic", usage: "Standard",      costIn: "$3",  costOut: "$15",  active: true,  color: "text-blue-400",   bg: "bg-blue-600/15"   },
  { id: "claude-haiku-4-5",  provider: "Anthropic", usage: "Heartbeats",    costIn: "$1",  costOut: "$5",   active: true,  color: "text-emerald-400",bg: "bg-emerald-600/15"},
]

const ROUTING_RULES = [
  { task: "Orchestration & planning",   model: "claude-opus-4-6"   },
  { task: "Lead enrichissement",        model: "claude-sonnet-4-5" },
  { task: "ICP scoring",                model: "claude-sonnet-4-5" },
  { task: "Heartbeats & monitoring",    model: "claude-haiku-4-5"  },
  { task: "Rédaction email outbound",   model: "claude-sonnet-4-5" },
  { task: "Conformité RGPD",            model: "claude-haiku-4-5"  },
]

const NOTIF_RULES = [
  { id: "critical",  label: "Alertes critiques",         defaultOn: true  },
  { id: "daily",     label: "Daily standup (08h00)",      defaultOn: true  },
  { id: "dispatch",  label: "Rapports de dispatch",       defaultOn: false },
  { id: "handover",  label: "Messages handover pending",  defaultOn: true  },
  { id: "cost",      label: "Dépassement budget",         defaultOn: true  },
  { id: "lead",      label: "Nouveau lead qualifié",      defaultOn: false },
  { id: "agent_err", label: "Erreur agent",               defaultOn: true  },
  { id: "weekly",    label: "Récap hebdomadaire",         defaultOn: false },
]

const AGENTS_16 = [
  { id: "iris",    name: "Iris",    role: "Veille PESTEL",    pole: "ACQ" },
  { id: "hugo",    name: "Hugo",    role: "Scraper",          pole: "ACQ" },
  { id: "simon",   name: "Simon",   role: "Enrichissement",   pole: "ACQ" },
  { id: "diane",   name: "Diane",   role: "ICP Scoring",      pole: "ACQ" },
  { id: "victor",  name: "Victor",  role: "Orchestrateur",    pole: "SYS" },
  { id: "nathan",  name: "Nathan",  role: "DevOps",           pole: "SYS" },
  { id: "sophie",  name: "Sophie",  role: "Analytics",        pole: "SYS" },
  { id: "alice",   name: "Alice",   role: "Emailing",         pole: "GRO" },
  { id: "thomas",  name: "Thomas",  role: "Nurturing",        pole: "GRO" },
  { id: "margaux", name: "Margaux", role: "Success Manager",  pole: "GRO" },
  { id: "yann",    name: "Yann",    role: "Referral",         pole: "GRO" },
  { id: "lea",     name: "Léa",     role: "Opérations",       pole: "SUP" },
  { id: "paul",    name: "Paul",    role: "Compta Tokens",    pole: "SUP" },
  { id: "camille", name: "Camille", role: "RH",               pole: "OPS" },
  { id: "jules",   name: "Jules",   role: "Formation",        pole: "OPS" },
  { id: "clara",   name: "Clara",   role: "Conformité RGPD",  pole: "GOV" },
]

const AUTONOMY_INITIAL: Record<string, string> = {
  iris: "supervised", hugo: "assisted",  simon: "assisted",  diane: "supervised",
  victor: "autonomous", nathan: "supervised", sophie: "supervised",
  alice: "assisted",  thomas: "assisted", margaux: "supervised", yann: "supervised",
  lea: "supervised",  paul: "supervised", camille: "supervised", jules: "supervised",
  clara: "supervised",
}

const POLE_BG: Record<string, string> = {
  ACQ: "bg-blue-600",   SYS: "bg-purple-600", GRO: "bg-green-600",
  SUP: "bg-red-600",    OPS: "bg-orange-600",  GOV: "bg-slate-600",
}

const AUTONOMY_COLOR: Record<string, string> = {
  supervised: "text-slate-400",
  assisted:   "text-yellow-400",
  autonomous: "text-emerald-400",
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function AgentAvatar({ name, pole }: { name: string; pole: string }) {
  return (
    <span className={cn(
      "inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-[11px] font-bold shrink-0",
      POLE_BG[pole] ?? "bg-slate-600",
    )}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}

function SaveBar({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800 mt-6">
      {saved && (
        <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4" /> Enregistré
        </span>
      )}
      <Button onClick={onSave} className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
        <Save className="w-4 h-4" /> Enregistrer
      </Button>
    </div>
  )
}

// ─── Tab 1 — Gateway ─────────────────────────────────────────────────────────

function GatewayTab() {
  const [testing,    setTesting]    = useState(false)
  const [testOk,     setTestOk]     = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [saved,      setSaved]      = useState(false)

  function handleTest() {
    setTesting(true); setTestOk(false)
    setTimeout(() => { setTesting(false); setTestOk(true) }, 1600)
  }
  function handleRestart() {
    setRestarting(true)
    setTimeout(() => setRestarting(false), 2000)
  }

  return (
    <div className="space-y-5">
      {/* Status + URL */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-blue-400" />
            Statut de connexion
          </h3>
          <Badge className="bg-emerald-600/20 border border-emerald-700/40 text-emerald-400 gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Connected
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Gateway URL</Label>
            <Input
              readOnly
              value="http://localhost:18789"
              className="bg-slate-950 border-slate-700 text-slate-300 font-mono text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              onClick={handleTest}
              disabled={testing}
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-2"
            >
              {testing
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <Wifi className="w-4 h-4" />}
              {testing ? "Test en cours…" : "Tester la connexion"}
            </Button>
            {testOk && (
              <span className="flex items-center gap-1 text-emerald-400 text-sm whitespace-nowrap">
                <CheckCircle2 className="w-4 h-4" /> OK (42ms)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tailscale */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-5 py-4">
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-blue-400" />
          <div>
            <p className="text-sm font-medium text-slate-200">Tailscale VPN</p>
            <p className="text-xs text-slate-500">Tunnel chiffré entre les agents</p>
          </div>
        </div>
        <Badge className="bg-emerald-600/20 border border-emerald-700/40 text-emerald-400 text-xs">
          tailnet: leadgen-prod
        </Badge>
      </div>

      {/* Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-400" /> Logs Gateway
          </h3>
          <Button
            onClick={handleRestart}
            disabled={restarting}
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-2"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", restarting && "animate-spin")} />
            {restarting ? "Restart…" : "Restart Gateway"}
          </Button>
        </div>
        <pre className="p-4 font-mono text-[11px] leading-[1.7] bg-slate-950 max-h-64 overflow-y-auto">
          {GATEWAY_LOGS.map((line, i) => (
            <div
              key={i}
              className={line.includes("WARN") ? "text-yellow-400" : line.includes("ERROR") ? "text-red-400" : "text-slate-400"}
            >
              {line}
            </div>
          ))}
        </pre>
      </div>

      <SaveBar onSave={() => { setSaved(true); setTimeout(() => setSaved(false), 2500) }} saved={saved} />
    </div>
  )
}

// ─── Tab 2 — API & Models ─────────────────────────────────────────────────────

function ApiModelsTab() {
  const [models,  setModels]  = useState(MODELS)
  const [routing, setRouting] = useState<Record<string, string>>(
    Object.fromEntries(ROUTING_RULES.map(r => [r.task, r.model]))
  )
  const [visible, setVisible] = useState(false)
  const [copied,  setCopied]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  function toggleModel(id: string) {
    setModels(prev => prev.map(m => m.id === id ? { ...m, active: !m.active } : m))
  }

  return (
    <div className="space-y-5">
      {/* Model table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" /> Modèles configurés
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              {["Modèle", "Provider", "Usage", "Input /1K", "Output /1K", "Statut"].map(h => (
                <TableHead key={h} className="text-xs text-slate-500 font-medium">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map(m => (
              <TableRow key={m.id} className="border-slate-800 hover:bg-slate-800/40">
                <TableCell>
                  <span className={cn("font-mono text-sm font-semibold", m.color)}>{m.id}</span>
                </TableCell>
                <TableCell className="text-slate-400 text-sm">{m.provider}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs border-0", m.bg, m.color)}>
                    {m.usage}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm text-slate-300">{m.costIn}</TableCell>
                <TableCell className="font-mono text-sm text-slate-300">{m.costOut}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={m.active}
                      onCheckedChange={() => toggleModel(m.id)}
                      className="data-[state=checked]:bg-blue-600"
                    />
                    <span className={cn("text-xs", m.active ? "text-emerald-400" : "text-slate-500")}>
                      {m.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Routing rules */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
          <ChevronDown className="w-4 h-4 text-blue-400" /> Routing par type de tâche
        </h3>
        <div className="grid gap-3">
          {ROUTING_RULES.map(rule => (
            <div key={rule.task} className="flex items-center justify-between gap-4">
              <Label className="text-sm text-slate-400 flex-1">{rule.task}</Label>
              <Select
                value={routing[rule.task]}
                onValueChange={v => setRouting(prev => ({ ...prev, [rule.task]: v }))}
              >
                <SelectTrigger className="w-52 bg-slate-950 border-slate-700 text-slate-300 text-sm h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {MODELS.map(m => (
                    <SelectItem key={m.id} value={m.id} className="text-slate-300 focus:bg-slate-800 font-mono text-xs">
                      {m.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      {/* API key */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-400" /> Clé API Anthropic
        </h3>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            type={visible ? "text" : "password"}
            value="sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="bg-slate-950 border-slate-700 text-slate-300 font-mono text-sm flex-1"
          />
          <Button
            variant="outline" size="icon"
            onClick={() => setVisible(v => !v)}
            className="border-slate-700 text-slate-400 hover:bg-slate-800 shrink-0"
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline" size="icon"
            onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }}
            className="border-slate-700 text-slate-400 hover:bg-slate-800 shrink-0"
          >
            <Copy className="w-4 h-4" />
          </Button>
          {copied && <span className="text-xs text-emerald-400 whitespace-nowrap">Copié</span>}
        </div>
        <p className="text-xs text-slate-600">Dernière rotation: 28 fév. 2025 · Expire dans 287 jours</p>
      </div>

      <SaveBar onSave={() => { setSaved(true); setTimeout(() => setSaved(false), 2500) }} saved={saved} />
    </div>
  )
}

// ─── Tab 3 — Telegram ─────────────────────────────────────────────────────────

function TelegramTab() {
  const [tokenVisible, setTokenVisible] = useState(false)
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_RULES.map(r => [r.id, r.defaultOn]))
  )
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [saved,   setSaved]   = useState(false)

  function handleTest() {
    setSending(true); setSent(false)
    setTimeout(() => { setSending(false); setSent(true); setTimeout(() => setSent(false), 3000) }, 1800)
  }

  return (
    <div className="space-y-5">
      {/* Bot config */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Send className="w-4 h-4 text-blue-400" /> Configuration Bot Telegram
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Bot Token</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                type={tokenVisible ? "text" : "password"}
                value="7842156234:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="bg-slate-950 border-slate-700 text-slate-300 font-mono text-sm"
              />
              <Button
                variant="outline" size="icon"
                onClick={() => setTokenVisible(v => !v)}
                className="border-slate-700 text-slate-400 hover:bg-slate-800 shrink-0"
              >
                {tokenVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Chat ID</Label>
            <Input readOnly value="-1002451839274" className="bg-slate-950 border-slate-700 text-slate-300 font-mono text-sm" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400">Webhook URL</Label>
          <Input readOnly value="https://api.telegram.org/bot7842156234:AAH.../setWebhook" className="bg-slate-950 border-slate-700 text-slate-300 font-mono text-sm" />
        </div>
      </div>

      {/* Notification toggles */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-blue-400" /> Règles de notification
        </h3>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {NOTIF_RULES.map(rule => (
            <div key={rule.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-slate-800/50 border border-slate-800/80">
              <Label htmlFor={rule.id} className="text-sm text-slate-300 cursor-pointer">{rule.label}</Label>
              <Switch
                id={rule.id}
                checked={toggles[rule.id]}
                onCheckedChange={v => setToggles(prev => ({ ...prev, [rule.id]: v }))}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Test button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleTest}
          disabled={sending}
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-2"
        >
          {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Envoi…" : "Envoyer message test"}
        </Button>
        {sent && (
          <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
            <CheckCircle2 className="w-4 h-4" /> Message envoyé dans #leadgen-alerts
          </span>
        )}
      </div>

      <SaveBar onSave={() => { setSaved(true); setTimeout(() => setSaved(false), 2500) }} saved={saved} />
    </div>
  )
}

// ─── Tab 4 — Autonomie ────────────────────────────────────────────────────────

function AutonomieTab() {
  const [globalAuto, setGlobalAuto] = useState(false)
  const [levels,     setLevels]     = useState<Record<string, string>>(AUTONOMY_INITIAL)
  const [rules,      setRules]      = useState(
    "Un agent peut passer en mode autonome si :\n- Taux de réussite > 95% sur 7 jours\n- Aucune erreur critique dans les 48h\n- Budget journalier < 60% consommé\n- Approval de Victor (Orchestrateur) requise"
  )
  const [budget,     setBudget]     = useState("50")
  const [maxActions, setMaxActions] = useState("100")
  const [saved,      setSaved]      = useState(false)

  return (
    <div className="space-y-5">
      {/* Global toggle */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg transition-colors", globalAuto ? "bg-emerald-600/20" : "bg-slate-800")}>
            <Bot className={cn("w-4 h-4 transition-colors", globalAuto ? "text-emerald-400" : "text-slate-500")} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">Mode autonome global</p>
            <p className="text-xs text-slate-500">
              {globalAuto
                ? "Les agents peuvent agir sans supervision selon leurs règles."
                : "Tous les agents en mode supervisé — validation humaine requise."}
            </p>
          </div>
        </div>
        <button onClick={() => setGlobalAuto(v => !v)} aria-label="Activer/désactiver autonomie globale" className="shrink-0 ml-4">
          {globalAuto
            ? <ToggleRight className="w-9 h-9 text-emerald-400" />
            : <ToggleLeft  className="w-9 h-9 text-slate-600" />}
        </button>
      </div>

      {/* Per-agent levels */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200">Niveau d'autonomie par agent</h3>
        </div>
        <div className="divide-y divide-slate-800/60 max-h-[420px] overflow-y-auto">
          {AGENTS_16.map(agent => {
            const level = levels[agent.id]
            return (
              <div key={agent.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-800/30 transition-colors">
                <AgentAvatar name={agent.name} pole={agent.pole} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{agent.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{agent.role}</p>
                </div>
                <span className="text-[10px] font-medium text-slate-600 w-8 text-center hidden sm:inline">{agent.pole}</span>
                <Select
                  value={level}
                  onValueChange={v => setLevels(prev => ({ ...prev, [agent.id]: v }))}
                >
                  <SelectTrigger className={cn(
                    "w-36 h-8 bg-slate-950 border-slate-700 text-sm",
                    AUTONOMY_COLOR[level],
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="supervised" className="text-slate-400  focus:bg-slate-800">Supervisé</SelectItem>
                    <SelectItem value="assisted"   className="text-yellow-400 focus:bg-slate-800">Assisté</SelectItem>
                    <SelectItem value="autonomous" className="text-emerald-400 focus:bg-slate-800">Autonome</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rules + limits */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400">Conditions pour passage en autonome</Label>
          <Textarea
            value={rules}
            onChange={e => setRules(e.target.value)}
            rows={7}
            className="bg-slate-950 border-slate-700 text-slate-300 text-sm font-mono resize-none"
          />
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Budget max en mode autonome (€/jour)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">€</span>
              <Input
                type="number" value={budget} onChange={e => setBudget(e.target.value)}
                className="bg-slate-950 border-slate-700 text-slate-300 pl-7"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Actions max par agent / jour</Label>
            <Input
              type="number" value={maxActions} onChange={e => setMaxActions(e.target.value)}
              className="bg-slate-950 border-slate-700 text-slate-300"
            />
          </div>
          {globalAuto && (
            <div className="flex items-start gap-2 bg-yellow-600/10 border border-yellow-700/30 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-400 leading-relaxed">
                Mode autonome activé. Surveillez les coûts et les logs — les agents peuvent prendre des décisions sans validation humaine.
              </p>
            </div>
          )}
        </div>
      </div>

      <SaveBar onSave={() => { setSaved(true); setTimeout(() => setSaved(false), 2500) }} saved={saved} />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const TABS = [
    { value: "gateway",  label: "Gateway",      Icon: Wifi  },
    { value: "api",      label: "API & Models",  Icon: Zap   },
    { value: "telegram", label: "Telegram",      Icon: Send  },
    { value: "autonomy", label: "Autonomie",     Icon: Bot   },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-50 text-balance">Paramètres</h1>
        <p className="text-sm text-slate-400 mt-1">Configuration du système LeadGen B2B</p>
      </div>

      <Tabs defaultValue="gateway" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 h-auto p-1 rounded-lg flex w-full sm:w-auto sm:inline-flex">
          {TABS.map(({ value, label, Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 px-4 py-2 text-sm flex-1 sm:flex-none"
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="gateway"  className="mt-0"><GatewayTab   /></TabsContent>
          <TabsContent value="api"      className="mt-0"><ApiModelsTab /></TabsContent>
          <TabsContent value="telegram" className="mt-0"><TelegramTab  /></TabsContent>
          <TabsContent value="autonomy" className="mt-0"><AutonomieTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
