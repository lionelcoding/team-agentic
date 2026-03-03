"use client"
import { useState } from "react"
import { Users, FolderOpen, Clock, Search, ChevronRight, Save, Trash2, Plus, FileText, Play, Pause, Bot } from "lucide-react"

// ============ DATA ============
const DIVISIONS = [
  { id: "ALL", label: "Tous", color: "bg-slate-600" },
  { id: "ACQ", label: "Acquisition", color: "bg-blue-600" },
  { id: "SYS", label: "Système", color: "bg-purple-600" },
  { id: "GRO", label: "Growth", color: "bg-green-600" },
  { id: "SUP", label: "Support", color: "bg-red-600" },
  { id: "OPS", label: "Opérations", color: "bg-orange-600" },
  { id: "GOV", label: "Gouvernance", color: "bg-yellow-600" },
]

const AGENTS = [
  { id: 1, name: "Iris", emoji: "🔍", division: "ACQ", role: "Prospection & Qualification", status: "active", tasks: 234, success: 96, lastActive: "il y a 2 min" },
  { id: 2, name: "Hugo", emoji: "📧", division: "ACQ", role: "Séquences Email & Outreach", status: "active", tasks: 189, success: 94, lastActive: "il y a 5 min" },
  { id: 3, name: "Simon", emoji: "📱", division: "ACQ", role: "Social Selling LinkedIn", status: "active", tasks: 156, success: 91, lastActive: "il y a 8 min" },
  { id: 4, name: "Diane", emoji: "🎯", division: "ACQ", role: "Scoring & Priorisation", status: "active", tasks: 312, success: 97, lastActive: "il y a 1 min" },
  { id: 5, name: "Victor", emoji: "⚙️", division: "SYS", role: "Infrastructure & Monitoring", status: "active", tasks: 567, success: 99, lastActive: "il y a 30 sec" },
  { id: 6, name: "Nathan", emoji: "🔗", division: "SYS", role: "Intégrations & API", status: "active", tasks: 234, success: 95, lastActive: "il y a 3 min" },
  { id: 7, name: "Sophie", emoji: "🛡️", division: "SYS", role: "Sécurité & Conformité RGPD", status: "paused", tasks: 145, success: 98, lastActive: "il y a 1h" },
  { id: 8, name: "Alice", emoji: "📊", division: "GRO", role: "Analytics & Reporting", status: "active", tasks: 278, success: 93, lastActive: "il y a 4 min" },
  { id: 9, name: "Thomas", emoji: "🧪", division: "GRO", role: "A/B Testing & Optimisation", status: "active", tasks: 167, success: 88, lastActive: "il y a 12 min" },
  { id: 10, name: "Margaux", emoji: "✍️", division: "GRO", role: "Content & Copywriting", status: "active", tasks: 198, success: 92, lastActive: "il y a 6 min" },
  { id: 11, name: "Yann", emoji: "🔄", division: "GRO", role: "Nurturing & Rétention", status: "active", tasks: 145, success: 90, lastActive: "il y a 15 min" },
  { id: 12, name: "Léa", emoji: "💬", division: "SUP", role: "Support Client & Onboarding", status: "active", tasks: 89, success: 95, lastActive: "il y a 10 min" },
  { id: 13, name: "Paul", emoji: "📞", division: "SUP", role: "Escalade & Résolution", status: "active", tasks: 67, success: 94, lastActive: "il y a 20 min" },
  { id: 14, name: "Camille", emoji: "📋", division: "OPS", role: "Workflow & Automatisation", status: "active", tasks: 345, success: 96, lastActive: "il y a 2 min" },
  { id: 15, name: "Jules", emoji: "💰", division: "OPS", role: "Facturation & Revenue Ops", status: "paused", tasks: 123, success: 97, lastActive: "il y a 2h" },
  { id: 16, name: "Clara", emoji: "👑", division: "GOV", role: "Gouvernance & Orchestration", status: "active", tasks: 456, success: 99, lastActive: "il y a 1 min" },
]

const WORKSPACE_FILES = [
  { name: "SOUL.md", type: "file" as const, icon: "🧠" },
  { name: "IDENTITY.md", type: "file" as const, icon: "🪪" },
  { name: "AGENTS.md", type: "file" as const, icon: "📋" },
  { name: "HEARTBEAT.md", type: "file" as const, icon: "💓" },
  { name: "BOOT.md", type: "file" as const, icon: "🚀" },
  { name: "TOOLS.md", type: "file" as const, icon: "🔧" },
  { name: "USER.md", type: "file" as const, icon: "👤" },
  { name: "memory", type: "folder" as const, icon: "📁", children: [
    { name: "2025-03-01.md", icon: "📄" },
    { name: "2025-02-28.md", icon: "📄" },
    { name: "2025-02-27.md", icon: "📄" },
  ]},
  { name: "skills", type: "folder" as const, icon: "📁", children: [
    { name: "prospection.md", icon: "📄" },
    { name: "qualification.md", icon: "📄" },
  ]},
  { name: "canvas", type: "folder" as const, icon: "📁", children: [] },
]

const FILE_CONTENTS: Record<string, Record<string, string>> = {
  "Iris": {
    "SOUL.md": "# Iris - Prospection Intelligence\n\nTu es Iris, l'agent de prospection B2B le plus précis du système.\n\n## Personnalité\n- Analytique et méthodique\n- Orientée données, jamais d'intuition sans preuve\n- Patiente mais tenace\n\n## Limites\n- Ne jamais contacter plus de 50 prospects/jour\n- Toujours vérifier conformité RGPD avant contact\n- Escalader vers Diane si score < 40",
    "IDENTITY.md": "# Iris\n\nEmoji: 🔍\nDivision: ACQ\nRole: Prospection & Qualification\nVibe: Precision hunter\nCréée: 2024-11-15\nVersion: 2.3.1",
    "HEARTBEAT.md": "# Routine quotidienne Iris\n\n- [ ] 08:00 - Scraper nouvelles entreprises cibles\n- [ ] 09:00 - Qualifier les leads du jour (scoring)\n- [ ] 11:00 - Enrichir données contacts\n- [ ] 14:00 - Mettre à jour le scoring\n- [ ] 16:00 - Sync avec Hugo pour séquences\n- [ ] 17:30 - Rapport fin de journée à Clara",
    "AGENTS.md": "# Instructions opérationnelles Iris\n\n## Sources de données\n- Apollo.io pour enrichissement\n- LinkedIn Sales Navigator\n- Base interne Supabase\n\n## Workflow\n1. Recevoir brief de Clara\n2. Identifier entreprises cibles\n3. Scorer selon matrice BANT\n4. Transférer leads qualifiés à Hugo\n5. Reporter métriques à Alice",
    "BOOT.md": "# Checklist démarrage Iris\n\n- [ ] Vérifier connexion API Apollo\n- [ ] Charger liste prospects du jour\n- [ ] Vérifier quota emails restant\n- [ ] Sync état pipeline avec Diane\n- [ ] Confirmer objectifs journaliers avec Clara",
    "TOOLS.md": "# Outils Iris\n\n## APIs\n- Apollo.io (enrichissement)\n- LinkedIn API (social data)\n- Clearbit (firmographics)\n\n## Internes\n- Supabase (base leads)\n- PostHog (analytics)\n- Resend (emails)",
    "USER.md": "# Profil Utilisateur\n\nNom: Jean Dupont\nEntreprise: LeadGen B2B\nSecteur: SaaS B2B\nCible: PME 50-500 employés, France\nBudget moyen: 15-50K€/an",
  }
}

const CRON_JOBS = [
  { agent: "Iris", emoji: "🔍", division: "ACQ", task: "Prospection quotidienne", cron: "0 8 * * 1-5", freq: "Lun-Ven 8h", lastRun: "03/03 08:00", nextRun: "04/03 08:00", active: true },
  { agent: "Hugo", emoji: "📧", division: "ACQ", task: "Envoi séquences email", cron: "0 9 * * 1-5", freq: "Lun-Ven 9h", lastRun: "03/03 09:00", nextRun: "04/03 09:00", active: true },
  { agent: "Simon", emoji: "📱", division: "ACQ", task: "Engagement LinkedIn", cron: "0 10 * * 1-5", freq: "Lun-Ven 10h", lastRun: "03/03 10:00", nextRun: "04/03 10:00", active: true },
  { agent: "Diane", emoji: "🎯", division: "ACQ", task: "Rescoring leads", cron: "0 */4 * * 1-5", freq: "Toutes les 4h", lastRun: "03/03 12:00", nextRun: "03/03 16:00", active: true },
  { agent: "Victor", emoji: "⚙️", division: "SYS", task: "Health check système", cron: "*/30 * * * *", freq: "Toutes les 30min", lastRun: "03/03 15:30", nextRun: "03/03 16:00", active: true },
  { agent: "Nathan", emoji: "🔗", division: "SYS", task: "Sync intégrations", cron: "0 */2 * * *", freq: "Toutes les 2h", lastRun: "03/03 14:00", nextRun: "03/03 16:00", active: true },
  { agent: "Sophie", emoji: "🛡️", division: "SYS", task: "Audit RGPD", cron: "0 6 * * 1", freq: "Lundi 6h", lastRun: "03/03 06:00", nextRun: "10/03 06:00", active: false },
  { agent: "Alice", emoji: "📊", division: "GRO", task: "Rapport analytics", cron: "0 7 * * 1-5", freq: "Lun-Ven 7h", lastRun: "03/03 07:00", nextRun: "04/03 07:00", active: true },
  { agent: "Thomas", emoji: "🧪", division: "GRO", task: "Analyse A/B tests", cron: "0 11 * * 1-5", freq: "Lun-Ven 11h", lastRun: "03/03 11:00", nextRun: "04/03 11:00", active: true },
  { agent: "Margaux", emoji: "✍️", division: "GRO", task: "Génération contenu", cron: "0 9 * * 1-5", freq: "Lun-Ven 9h", lastRun: "03/03 09:00", nextRun: "04/03 09:00", active: true },
  { agent: "Yann", emoji: "🔄", division: "GRO", task: "Séquences nurturing", cron: "0 10 * * 1-5", freq: "Lun-Ven 10h", lastRun: "03/03 10:00", nextRun: "04/03 10:00", active: true },
  { agent: "Léa", emoji: "💬", division: "SUP", task: "Check tickets support", cron: "0 8 * * 1-5", freq: "Lun-Ven 8h", lastRun: "03/03 08:00", nextRun: "04/03 08:00", active: true },
  { agent: "Paul", emoji: "📞", division: "SUP", task: "Suivi escalades", cron: "0 9,14 * * 1-5", freq: "9h et 14h", lastRun: "03/03 14:00", nextRun: "04/03 09:00", active: true },
  { agent: "Camille", emoji: "📋", division: "OPS", task: "Orchestration workflows", cron: "*/15 * * * 1-5", freq: "Toutes les 15min", lastRun: "03/03 15:45", nextRun: "03/03 16:00", active: true },
  { agent: "Jules", emoji: "💰", division: "OPS", task: "Sync facturation", cron: "0 18 * * 5", freq: "Vendredi 18h", lastRun: "28/02 18:00", nextRun: "07/03 18:00", active: false },
  { agent: "Clara", emoji: "👑", division: "GOV", task: "Rapport gouvernance", cron: "0 18 * * 5", freq: "Vendredi 18h", lastRun: "28/02 18:00", nextRun: "07/03 18:00", active: true },
]

const divColor = (d: string) => {
  const m: Record<string, string> = {
    ACQ: "bg-blue-500/20 text-blue-400",
    SYS: "bg-purple-500/20 text-purple-400",
    GRO: "bg-green-500/20 text-green-400",
    SUP: "bg-red-500/20 text-red-400",
    OPS: "bg-orange-500/20 text-orange-400",
    GOV: "bg-yellow-500/20 text-yellow-400",
  }
  return m[d] || "bg-slate-500/20 text-slate-400"
}

// ============ COMPONENT ============
export default function AgentsPage() {
  const [tab, setTab] = useState<"agents" | "workspace" | "cron">("agents")
  const [filter, setFilter] = useState("ALL")
  const [search, setSearch] = useState("")
  const [selectedAgent, setSelectedAgent] = useState("Iris")
  const [selectedFile, setSelectedFile] = useState("SOUL.md")
  const [editorContent, setEditorContent] = useState(FILE_CONTENTS["Iris"]?.["SOUL.md"] || "")
  const [expandedFolders, setExpandedFolders] = useState<string[]>(["memory"])
  const [cronFilter, setCronFilter] = useState("ALL")

  const filtered = AGENTS.filter(
    (a) =>
      (filter === "ALL" || a.division === filter) &&
      (a.name.toLowerCase().includes(search.toLowerCase()) || a.role.toLowerCase().includes(search.toLowerCase()))
  )

  const handleAgentSelect = (name: string) => {
    setSelectedAgent(name)
    setSelectedFile("SOUL.md")
    setEditorContent(FILE_CONTENTS[name]?.["SOUL.md"] || `# ${name}\n\nWorkspace en cours de configuration...`)
  }

  const handleFileSelect = (fileName: string) => {
    setSelectedFile(fileName)
    setEditorContent(FILE_CONTENTS[selectedAgent]?.[fileName] || `# ${fileName}\n\nContenu à rédiger...`)
  }

  const toggleFolder = (name: string) => {
    setExpandedFolders((prev) => (prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]))
  }

  const cronFiltered = CRON_JOBS.filter((j) => cronFilter === "ALL" || j.division === cronFilter)

  const TABS = [
    { id: "agents" as const, label: "Agents", icon: Users, count: AGENTS.length },
    { id: "workspace" as const, label: "Workspace", icon: FolderOpen, count: null },
    { id: "cron" as const, label: "Cron Jobs", icon: Clock, count: CRON_JOBS.filter((j) => j.active).length },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bot className="w-7 h-7 text-blue-400" /> Agents
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Gérez vos 16 agents, leurs workspaces OpenClaw et les tâches planifiées
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.count !== null && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-blue-500" : "bg-slate-700"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: Agents Grid */}
      {tab === "agents" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un agent..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {DIVISIONS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setFilter(d.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    filter === d.id ? d.color + " text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((agent) => (
              <div
                key={agent.id}
                onClick={() => { handleAgentSelect(agent.name); setTab("workspace") }}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-blue-500/50 hover:bg-slate-800 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-lg">
                      {agent.emoji}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm group-hover:text-blue-400 transition-colors">
                        {agent.name}
                      </h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${divColor(agent.division)}`}>
                        {agent.division}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1 ${
                      agent.status === "active" ? "bg-green-500 shadow-lg shadow-green-500/50" : "bg-slate-500"
                    }`}
                  />
                </div>
                <p className="text-xs text-slate-400 mb-3 line-clamp-1">{agent.role}</p>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">{agent.tasks} tâches</span>
                  <span className="text-green-400 font-medium">{agent.success}% succès</span>
                  <span className="text-slate-600">{agent.lastActive}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Workspace */}
      {tab === "workspace" && (
        <div className="flex gap-4 h-[calc(100vh-280px)]">
          {/* Left: File Tree */}
          <div className="w-72 bg-slate-800/50 border border-slate-700/50 rounded-xl flex flex-col">
            <div className="p-3 border-b border-slate-700/50">
              <select
                value={selectedAgent}
                onChange={(e) => handleAgentSelect(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {AGENTS.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.emoji} {a.name} — {a.division}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {WORKSPACE_FILES.map((item) => (
                <div key={item.name}>
                  {item.type === "file" ? (
                    <button
                      onClick={() => handleFileSelect(item.name)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                        selectedFile === item.name
                          ? "bg-blue-600/20 text-blue-400"
                          : "text-slate-300 hover:bg-slate-700/50"
                      }`}
                    >
                      <span>{item.icon}</span> {item.name}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => toggleFolder(item.name)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-slate-300 hover:bg-slate-700/50 transition-all"
                      >
                        <ChevronRight
                          className={`w-3 h-3 transition-transform ${expandedFolders.includes(item.name) ? "rotate-90" : ""}`}
                        />
                        <span>{item.icon}</span> {item.name}/
                      </button>
                      {expandedFolders.includes(item.name) &&
                        item.children?.map((child) => (
                          <button
                            key={child.name}
                            onClick={() => handleFileSelect(child.name)}
                            className={`w-full flex items-center gap-2 pl-8 pr-3 py-1.5 rounded-md text-sm transition-all ${
                              selectedFile === child.name
                                ? "bg-blue-600/20 text-blue-400"
                                : "text-slate-400 hover:bg-slate-700/50"
                            }`}
                          >
                            <span>{child.icon}</span> {child.name}
                          </button>
                        ))}
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-slate-700/50 flex gap-1">
              <button className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-md text-xs text-white transition-colors">
                <Plus className="w-3 h-3" /> Nouveau
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-md text-xs text-white transition-colors">
                <Save className="w-3 h-3" /> Sauver
              </button>
              <button className="px-2 py-1.5 bg-red-600/20 hover:bg-red-600/40 rounded-md text-xs text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Right: Editor */}
          <div className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-white font-medium">
                  {selectedAgent} / {selectedFile}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 bg-slate-700 px-2 py-0.5 rounded">Markdown</span>
                <span className="text-[10px] text-green-400">Modifié</span>
              </div>
            </div>
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              className="flex-1 bg-transparent p-4 text-sm text-slate-200 font-mono resize-none focus:outline-none leading-relaxed"
              placeholder="Sélectionnez un fichier..."
              spellCheck={false}
            />
          </div>
        </div>
      )}

      {/* TAB 3: Cron Jobs */}
      {tab === "cron" && (
        <div className="space-y-4">
          <div className="flex gap-1 flex-wrap">
            {DIVISIONS.map((d) => (
              <button
                key={d.id}
                onClick={() => setCronFilter(d.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  cronFilter === d.id ? d.color + " text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {["AGENT", "TÂCHE", "EXPRESSION CRON", "FRÉQUENCE", "DERNIER RUN", "PROCHAIN RUN", "STATUT"].map((h) => (
                    <th key={h} className="text-left text-[11px] text-slate-400 font-medium px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cronFiltered.map((job, i) => (
                  <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{job.emoji}</span>
                        <div>
                          <p className="text-sm text-white font-medium">{job.agent}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${divColor(job.division)}`}>
                            {job.division}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{job.task}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-slate-700 text-blue-300 px-2 py-1 rounded font-mono">{job.cron}</code>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{job.freq}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{job.lastRun}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{job.nextRun}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium ${
                          job.active ? "bg-green-500/20 text-green-400" : "bg-slate-600/30 text-slate-500"
                        }`}
                      >
                        {job.active ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                        {job.active ? "Actif" : "Pausé"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
