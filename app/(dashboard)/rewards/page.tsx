"use client"

import React, { useState } from "react"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts"
import { Trophy, Lock, TrendingUp, Zap, Target, Award } from "lucide-react"

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ")
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", className)}>{children}</span>
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Pole = "ACQ" | "SYS" | "GRO" | "SUP" | "OPS" | "GOV"
type Rarity = "Common" | "Rare" | "Epic" | "Legendary"

// ─── Mock data ────────────────────────────────────────────────────────────────

const POLE_COLOR: Record<Pole, string> = {
  ACQ: "bg-blue-600",   SYS: "bg-purple-600", GRO: "bg-green-600",
  SUP: "bg-red-600",    OPS: "bg-orange-600",  GOV: "bg-slate-500",
}
const POLE_TEXT: Record<Pole, string> = {
  ACQ: "text-blue-400", SYS: "text-purple-400", GRO: "text-green-400",
  SUP: "text-red-400",  OPS: "text-orange-400",  GOV: "text-slate-400",
}
const POLE_BG: Record<Pole, string> = {
  ACQ: "bg-blue-600/15 border-blue-700/40",   SYS: "bg-purple-600/15 border-purple-700/40",
  GRO: "bg-green-600/15 border-green-700/40", SUP: "bg-red-600/15 border-red-700/40",
  OPS: "bg-orange-600/15 border-orange-700/40", GOV: "bg-slate-600/15 border-slate-600/40",
}

const AGENTS: {
  id: string; name: string; role: string; pole: Pole
  xp: number; level: number; xpInLevel: number; xpForNext: number
  badges: number; streak: number; actionsWeek: number
  badgeIds: string[]
  weeklyXp: number
}[] = [
  { id: "victor",  name: "Victor",  role: "Orchestrateur",   pole: "SYS", xp: 15000, level: 12, xpInLevel: 400,  xpForNext: 1000, badges: 14, streak: 18, actionsWeek: 312, badgeIds: ["first_lead","century","streak_10","top_agent","perfect_week"], weeklyXp: 420 },
  { id: "alice",   name: "Alice",   role: "Emailing",        pole: "GRO", xp: 12800, level: 11, xpInLevel: 800,  xpForNext: 1000, badges: 11, streak: 12, actionsWeek: 248, badgeIds: ["first_lead","century","streak_10","perfect_week"], weeklyXp: 385 },
  { id: "hugo",    name: "Hugo",    role: "Scraper",         pole: "ACQ", xp: 11200, level: 10, xpInLevel: 200,  xpForNext: 1000, badges: 9,  streak: 7,  actionsWeek: 203, badgeIds: ["first_lead","century","streak_10"], weeklyXp: 340 },
  { id: "diane",   name: "Diane",   role: "ICP Scoring",     pole: "ACQ", xp:  9800, level:  9, xpInLevel: 800,  xpForNext: 900,  badges: 8,  streak: 9,  actionsWeek: 187, badgeIds: ["first_lead","century","streak_10"], weeklyXp: 298 },
  { id: "iris",    name: "Iris",    role: "Veille PESTEL",   pole: "ACQ", xp:  8600, level:  8, xpInLevel: 600,  xpForNext: 900,  badges: 7,  streak: 5,  actionsWeek: 164, badgeIds: ["first_lead","century"], weeklyXp: 256 },
  { id: "thomas",  name: "Thomas",  role: "Nurturing",       pole: "GRO", xp:  7900, level:  8, xpInLevel: 400,  xpForNext: 800,  badges: 6,  streak: 4,  actionsWeek: 142, badgeIds: ["first_lead","century"], weeklyXp: 231 },
  { id: "simon",   name: "Simon",   role: "Enrichissement",  pole: "ACQ", xp:  7200, level:  7, xpInLevel: 700,  xpForNext: 800,  badges: 6,  streak: 3,  actionsWeek: 128, badgeIds: ["first_lead","century"], weeklyXp: 214 },
  { id: "sophie",  name: "Sophie",  role: "Analytics",       pole: "SYS", xp:  6500, level:  7, xpInLevel: 500,  xpForNext: 800,  badges: 5,  streak: 6,  actionsWeek: 119, badgeIds: ["first_lead"], weeklyXp: 195 },
  { id: "margaux", name: "Margaux", role: "Success Manager", pole: "GRO", xp:  5800, level:  6, xpInLevel: 800,  xpForNext: 700,  badges: 4,  streak: 2,  actionsWeek: 98,  badgeIds: ["first_lead"], weeklyXp: 176 },
  { id: "nathan",  name: "Nathan",  role: "DevOps",          pole: "SYS", xp:  5100, level:  6, xpInLevel: 100,  xpForNext: 700,  badges: 4,  streak: 0,  actionsWeek: 87,  badgeIds: ["first_lead"], weeklyXp: 153 },
  { id: "yann",    name: "Yann",    role: "Referral",        pole: "GRO", xp:  4400, level:  5, xpInLevel: 400,  xpForNext: 600,  badges: 3,  streak: 1,  actionsWeek: 74,  badgeIds: ["first_lead"], weeklyXp: 132 },
  { id: "lea",     name: "Léa",     role: "Opérations",      pole: "SUP", xp:  3700, level:  5, xpInLevel: 200,  xpForNext: 600,  badges: 3,  streak: 0,  actionsWeek: 62,  badgeIds: ["first_lead"], weeklyXp: 112 },
  { id: "paul",    name: "Paul",    role: "Compta Tokens",   pole: "SUP", xp:  3000, level:  4, xpInLevel: 500,  xpForNext: 600,  badges: 2,  streak: 0,  actionsWeek: 51,  badgeIds: ["first_lead"], weeklyXp:  96 },
  { id: "camille", name: "Camille", role: "RH",              pole: "OPS", xp:  2300, level:  4, xpInLevel: 300,  xpForNext: 500,  badges: 2,  streak: 0,  actionsWeek: 42,  badgeIds: ["first_lead"], weeklyXp:  78 },
  { id: "jules",   name: "Jules",   role: "Formation",       pole: "OPS", xp:  1600, level:  3, xpInLevel: 100,  xpForNext: 500,  badges: 1,  streak: 0,  actionsWeek: 31,  badgeIds: ["first_lead"], weeklyXp:  55 },
  { id: "clara",   name: "Clara",   role: "Conformité RGPD", pole: "GOV", xp:   900, level:  2, xpInLevel: 400,  xpForNext: 500,  badges: 1,  streak: 0,  actionsWeek: 24,  badgeIds: ["first_lead"], weeklyXp:  38 },
]

const LEADERBOARD = [...AGENTS].sort((a, b) => b.xp - a.xp)

const BADGES: {
  id: string; emoji: string; name: string; desc: string; rarity: Rarity
}[] = [
  { id: "first_lead",    emoji: "🎯", name: "Premier Lead",      desc: "Générer son premier lead qualifié",          rarity: "Common"    },
  { id: "century",       emoji: "💯", name: "Centurion",          desc: "100 actions complétées avec succès",         rarity: "Common"    },
  { id: "streak_10",     emoji: "🔥", name: "On Fire",            desc: "Streak de 10 jours consécutifs",             rarity: "Rare"      },
  { id: "perfect_week",  emoji: "⭐", name: "Semaine Parfaite",   desc: "0 erreur sur 7 jours",                       rarity: "Rare"      },
  { id: "top_agent",     emoji: "🏆", name: "Top Agent",          desc: "Classement #1 pendant 30 jours",             rarity: "Epic"      },
  { id: "speed_demon",   emoji: "⚡", name: "Speed Demon",        desc: "Réponse < 500ms sur 1 000 requêtes",         rarity: "Rare"      },
  { id: "cost_master",   emoji: "💰", name: "Cost Master",        desc: "Coût/action < €0.10 pendant un mois",        rarity: "Epic"      },
  { id: "referral_king", emoji: "👑", name: "Referral King",      desc: "5 leads obtenus par référence",              rarity: "Rare"      },
  { id: "omniscient",    emoji: "🔮", name: "Omniscient",         desc: "100% taux de réussite sur une semaine",      rarity: "Epic"      },
  { id: "guardian",      emoji: "🛡️", name: "Gardien RGPD",       desc: "Aucune violation RGPD sur 90 jours",         rarity: "Legendary" },
  { id: "pipeline_pro",  emoji: "🚀", name: "Pipeline Pro",       desc: "50 leads déplacés jusqu'à Customer",         rarity: "Epic"      },
  { id: "night_owl",     emoji: "🦉", name: "Night Owl",          desc: "50 actions effectuées entre 22h et 6h",      rarity: "Rare"      },
  { id: "analyst",       emoji: "📊", name: "Data Analyst",       desc: "Générer 10 rapports analytiques",            rarity: "Common"    },
  { id: "diplomat",      emoji: "🤝", name: "Diplomate",          desc: "100 handovers sans escalade",                rarity: "Rare"      },
  { id: "legend",        emoji: "🌟", name: "Légende",            desc: "Atteindre le niveau 20",                     rarity: "Legendary" },
  { id: "pioneer",       emoji: "🗺️", name: "Pionnier",           desc: "Premier agent à utiliser un nouveau modèle", rarity: "Legendary" },
  { id: "collaborator",  emoji: "🔗", name: "Collaborateur",      desc: "Participer à 200 handovers",                 rarity: "Common"    },
  { id: "optimizer",     emoji: "⚙️", name: "Optimiseur",         desc: "Réduire son coût/action de 30%",             rarity: "Epic"      },
  { id: "signal_hawk",   emoji: "📡", name: "Signal Hawk",        desc: "Détecter 50 signaux HIGH en une semaine",    rarity: "Rare"      },
  { id: "grand_master",  emoji: "🎖️", name: "Grand Maître",       desc: "15 000 XP accumulés",                        rarity: "Legendary" },
]

const EARNED_IDS = new Set(["first_lead", "century", "streak_10", "perfect_week", "top_agent"])

const WEEKLY_XP_DATA = LEADERBOARD.slice(0, 12).map(a => ({
  name: a.name.slice(0, 6),
  xp: a.weeklyXp,
}))

const TOP5 = LEADERBOARD.slice(0, 5).map(a => a.name)
const LINE_WEEKS = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]
const LINE_DATA = LINE_WEEKS.map((week, i) => {
  const base: Record<string, string | number> = { week }
  LEADERBOARD.slice(0, 5).forEach(a => {
    base[a.name] = Math.round(a.xp * (0.3 + (i / 7) * 0.7) * (0.85 + Math.random() * 0.3))
  })
  return base
})
const LINE_COLORS = ["#3b82f6", "#a855f7", "#22c55e", "#ef4444", "#f97316"]

const RECENT_ACHIEVEMENTS = [
  { agent: "Victor",  badge: "Grand Maître",    emoji: "🎖️", rarity: "Legendary", ago: "il y a 2h" },
  { agent: "Alice",   badge: "Semaine Parfaite", emoji: "⭐", rarity: "Rare",      ago: "il y a 5h" },
  { agent: "Hugo",    badge: "On Fire",          emoji: "🔥", rarity: "Rare",      ago: "il y a 1j" },
  { agent: "Diane",   badge: "Centurion",        emoji: "💯", rarity: "Common",    ago: "il y a 1j" },
  { agent: "Sophie",  badge: "Data Analyst",     emoji: "📊", rarity: "Common",    ago: "il y a 2j" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function AgentAvatar({ name, pole, size = "md" }: { name: string; pole: Pole; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-12 h-12 text-base" : size === "md" ? "w-9 h-9 text-xs" : "w-7 h-7 text-[10px]"
  return (
    <span className={cn("inline-flex items-center justify-center rounded-full font-bold text-white shrink-0", POLE_COLOR[pole], sz)}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}

function XpBar({ pct, color = "bg-blue-500" }: { pct: number; color?: string }) {
  return (
    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

const RARITY_STYLE: Record<Rarity, { border: string; text: string; bg: string; label: string }> = {
  Common:    { border: "border-slate-700",    text: "text-slate-400",  bg: "bg-slate-800",     label: "Commun"     },
  Rare:      { border: "border-blue-700/60",  text: "text-blue-400",   bg: "bg-blue-950/60",   label: "Rare"       },
  Epic:      { border: "border-purple-700/60",text: "text-purple-400", bg: "bg-purple-950/60", label: "Épique"     },
  Legendary: { border: "border-amber-600/60", text: "text-amber-400",  bg: "bg-amber-950/40",  label: "Légendaire" },
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" }

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-6 rounded-full bg-blue-500" />
      <div>
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Section 1 — Leaderboard ──────────────────────────────────────────────────

function Leaderboard() {
  return (
    <section>
      <SectionHeader title="Classement" sub="Trié par XP total — mis à jour en temps réel" />
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_160px_90px_80px_70px_80px] gap-3 px-4 py-2.5 border-b border-slate-800 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
          <span>#</span>
          <span>Agent</span>
          <span>Level & XP</span>
          <span className="text-right">XP Total</span>
          <span className="text-center">Badges</span>
          <span className="text-center">Streak</span>
          <span className="text-right">Actions</span>
        </div>
        {LEADERBOARD.map((agent, i) => {
          const rank = i + 1
          const isTop = rank === 1
          return (
            <div
              key={agent.id}
              className={cn(
                "grid grid-cols-[40px_1fr_160px_90px_80px_70px_80px] gap-3 px-4 py-3 items-center",
                "border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30 transition-colors",
                isTop && "border-l-2 border-l-amber-500/80 bg-amber-950/10 hover:bg-amber-950/20",
              )}
            >
              <span className="text-base text-center">
                {MEDAL[rank] ?? <span className="text-sm font-bold text-slate-500">#{rank}</span>}
              </span>
              <div className="flex items-center gap-2.5 min-w-0">
                <AgentAvatar name={agent.name} pole={agent.pole} size="sm" />
                <div className="min-w-0">
                  <p className={cn("text-sm font-semibold truncate", isTop ? "text-amber-300" : "text-slate-200")}>
                    {agent.name}
                  </p>
                  <span className={cn("inline-block text-[10px] font-medium px-1.5 py-px rounded border", POLE_BG[agent.pole], POLE_TEXT[agent.pole])}>
                    {agent.pole}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Lv.{agent.level}</span>
                  <span className="text-[10px] text-slate-600">{agent.xpInLevel}/{agent.xpForNext}</span>
                </div>
                <XpBar pct={(agent.xpInLevel / agent.xpForNext) * 100} color={isTop ? "bg-amber-400" : "bg-blue-500"} />
              </div>
              <span className={cn("text-sm font-bold tabular-nums text-right", isTop ? "text-amber-300" : "text-slate-200")}>
                {agent.xp.toLocaleString("fr-FR")}
              </span>
              <div className="flex items-center justify-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-sm font-medium text-slate-300">{agent.badges}</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                {agent.streak > 0
                  ? <><span className="text-sm">🔥</span><span className="text-xs font-medium text-orange-400">{agent.streak}j</span></>
                  : <span className="text-xs text-slate-600">—</span>
                }
              </div>
              <span className="text-sm text-slate-400 tabular-nums text-right">{agent.actionsWeek}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Section 2 — Badge Showcase ───────────────────────────────────────────────

function BadgeShowcase() {
  const [hovered, setHovered] = useState<string | null>(null)
  return (
    <section>
      <SectionHeader title="Badge Showcase" sub={`${BADGES.length} badges disponibles — ${EARNED_IDS.size} obtenus`} />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
        {BADGES.map(badge => {
          const earned = EARNED_IDS.has(badge.id)
          const s = RARITY_STYLE[badge.rarity]
          return (
            <div
              key={badge.id}
              onMouseEnter={() => setHovered(badge.id)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all cursor-default",
                earned ? cn(s.bg, s.border, "hover:scale-105 hover:shadow-lg") : "bg-slate-900 border-slate-800 opacity-40 grayscale",
              )}
            >
              {!earned && <Lock className="absolute top-1.5 right-1.5 w-3 h-3 text-slate-600" />}
              <span className="text-2xl leading-none">{badge.emoji}</span>
              <span className={cn("text-[10px] font-semibold text-center leading-tight", earned ? s.text : "text-slate-500")}>
                {badge.name}
              </span>
              <span className={cn("text-[9px] font-medium px-1.5 py-px rounded-full border", earned ? cn(s.text, s.border) : "text-slate-600 border-slate-700")}>
                {s.label}
              </span>
              {hovered === badge.id && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-44 bg-slate-800 border border-slate-700 rounded-lg p-2.5 shadow-xl pointer-events-none">
                  <p className="text-xs font-semibold text-slate-200 mb-1">{badge.name}</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{badge.desc}</p>
                  {!earned && <p className="text-[10px] text-slate-600 mt-1.5 italic">Non obtenu</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Section 3 — Agent Profile Cards ─────────────────────────────────────────

function AgentProfileCards() {
  return (
    <section>
      <SectionHeader title="Profils des agents" sub="Stats individuelles — semaine en cours" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {LEADERBOARD.map((agent, i) => {
          const earnedBadges = BADGES.filter(b => agent.badgeIds.includes(b.id))
          const shown = earnedBadges.slice(0, 5)
          const extra = earnedBadges.length - shown.length
          const rank = i + 1
          return (
            <div
              key={agent.id}
              className={cn(
                "bg-slate-900 border rounded-lg p-4 hover:border-slate-700 transition-colors",
                rank === 1 ? "border-amber-600/50 bg-amber-950/10" : "border-slate-800",
              )}
            >
              <div className="flex items-start gap-3 mb-3">
                <AgentAvatar name={agent.name} pole={agent.pole} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm font-semibold truncate", rank === 1 ? "text-amber-300" : "text-slate-200")}>
                      {agent.name}
                    </p>
                    {rank <= 3 && <span className="text-sm">{MEDAL[rank]}</span>}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{agent.role}</p>
                  <span className={cn("inline-block text-[9px] font-medium px-1.5 py-px rounded border mt-1", POLE_BG[agent.pole], POLE_TEXT[agent.pole])}>
                    {agent.pole}
                  </span>
                </div>
              </div>
              <div className="space-y-1 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Lv.{agent.level}</span>
                  <span className="text-[10px] text-slate-600">{agent.xpInLevel}/{agent.xpForNext} XP</span>
                </div>
                <XpBar
                  pct={(agent.xpInLevel / agent.xpForNext) * 100}
                  color={rank === 1 ? "bg-amber-400" : rank === 2 ? "bg-slate-400" : rank === 3 ? "bg-orange-600" : "bg-blue-500"}
                />
              </div>
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                {shown.map(b => (
                  <span key={b.id} className="text-base leading-none" title={b.name}>{b.emoji}</span>
                ))}
                {extra > 0 && (
                  <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-px rounded-full">+{extra}</span>
                )}
                {earnedBadges.length === 0 && (
                  <span className="text-[10px] text-slate-600 italic">Aucun badge</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-200">{agent.actionsWeek}</p>
                  <p className="text-[10px] text-slate-600">Actions</p>
                </div>
                <div className="text-center border-x border-slate-800">
                  {agent.streak > 0
                    ? <p className="text-xs font-semibold text-orange-400">🔥 {agent.streak}j</p>
                    : <p className="text-xs font-semibold text-slate-500">—</p>
                  }
                  <p className="text-[10px] text-slate-600">Streak</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-200">{agent.xp.toLocaleString("fr-FR")}</p>
                  <p className="text-[10px] text-slate-600">XP total</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Section 4 — Weekly Stats ─────────────────────────────────────────────────

function CustomTooltipDark({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl text-xs">
      <p className="font-semibold text-slate-300 mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-semibold text-slate-200">{p.value.toLocaleString("fr-FR")} XP</span>
        </div>
      ))}
    </div>
  )
}

function WeeklyStats() {
  return (
    <section>
      <SectionHeader title="Stats hebdomadaires" sub="XP cette semaine et évolution top 5" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <p className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" /> XP gagné cette semaine
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={WEEKLY_XP_DATA} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltipDark />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="xp" fill="#3b82f6" radius={[0, 4, 4, 0]} name="XP" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <p className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" /> Evolution XP — Top 5 (8 semaines)
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={LINE_DATA} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
              <Tooltip content={<CustomTooltipDark />} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8", paddingTop: 8 }} />
              {TOP5.map((name, i) => (
                <Line key={name} type="monotone" dataKey={name} stroke={LINE_COLORS[i]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <p className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" /> Achievements récents
          </p>
          <div className="space-y-2">
            {RECENT_ACHIEVEMENTS.map((ach, i) => {
              const s = RARITY_STYLE[ach.rarity as Rarity]
              const agent = AGENTS.find(a => a.name === ach.agent)!
              return (
                <div key={i} className={cn("flex items-center gap-3 p-3 rounded-lg border", s.bg, s.border)}>
                  <span className="text-xl leading-none shrink-0">{ach.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AgentAvatar name={ach.agent} pole={agent.pole} size="sm" />
                      <span className="text-xs font-semibold text-slate-200">{ach.agent}</span>
                      <span className="text-[10px] text-slate-500">a obtenu</span>
                    </div>
                    <p className={cn("text-xs font-medium mt-0.5", s.text)}>{ach.badge}</p>
                  </div>
                  <span className="text-[10px] text-slate-600 shrink-0 whitespace-nowrap">{ach.ago}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RewardsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-600/20 border border-amber-600/30">
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-50 text-balance">Rewards</h1>
          </div>
          <p className="text-sm text-slate-400 ml-12">
            16 agents &bull; 142 badges distribués &bull;
            <span className="text-amber-400 font-medium ml-1">Agent du mois : Victor</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: "16 agents",              color: "bg-blue-600/20 border-blue-700/40 text-blue-400"     },
            { label: "142 badges",             color: "bg-purple-600/20 border-purple-700/40 text-purple-400" },
            { label: "Top streak: Victor 18j", color: "bg-orange-600/20 border-orange-700/40 text-orange-400" },
          ].map(chip => (
            <span key={chip.label} className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium", chip.color)}>
              {chip.label}
            </span>
          ))}
        </div>
      </div>

      <Leaderboard />
      <BadgeShowcase />
      <AgentProfileCards />
      <WeeklyStats />
    </div>
  )
}
