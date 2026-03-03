'use client'

import { useState } from 'react'
import { Eye, EyeOff, Copy, Check, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { MODELS, ROUTING_RULES } from '@/lib/mock/settings-data'

const MODEL_NAMES = ['claude-opus-4-6', 'claude-sonnet-4-5', 'claude-haiku-4-5']

const API_KEYS = [
  { id: 'anthropic', label: 'Anthropic API Key', value: 'sk-ant-api03-••••••••••••••••••••••••••••••••••' },
  { id: 'openai',    label: 'OpenAI API Key',    value: 'sk-proj-••••••••••••••••••••••••••••••••••••••' },
  { id: 'supabase',  label: 'Supabase Service Key', value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.••••••••' },
]

function MaskedKey({ value }: { value: string }) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied]   = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-3 py-2 font-mono text-xs text-slate-300 truncate">
        {visible ? value : value.replace(/[^•]/g, (c, i) => i < 8 ? c : '•')}
      </div>
      <button
        onClick={() => setVisible((v) => !v)}
        className="p-2 rounded-md hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
        aria-label={visible ? 'Masquer' : 'Révéler'}
      >
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={handleCopy}
        className="p-2 rounded-md hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
        aria-label="Copier"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

export function ApiModelsTab() {
  const [routingRules, setRoutingRules] = useState(
    Object.fromEntries(ROUTING_RULES.map((r) => [r.taskType, r.model]))
  )

  return (
    <div className="flex flex-col gap-6">

      {/* Models table */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800">
          <p className="text-sm font-semibold text-slate-200">Modèles configurés</p>
          <p className="text-xs text-slate-500 mt-0.5">Tarifs pour 1 000 tokens (input / output)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Modèle', 'Provider', 'Usage', 'Input /1K', 'Output /1K', "Req. aujourd'hui", 'Statut'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODELS.map((m) => (
                <tr
                  key={m.id}
                  className={cn(
                    'border-b border-slate-800/60 transition-colors',
                    m.status === 'active' ? 'hover:bg-slate-800/40' : 'opacity-50'
                  )}
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-200">{m.name}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{m.provider}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-[180px]">{m.usage}</td>
                  <td className="px-4 py-3 text-xs text-emerald-400 font-mono">{m.costInput}</td>
                  <td className="px-4 py-3 text-xs text-amber-400 font-mono">{m.costOutput}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">{m.requestsToday.toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    {m.status === 'active'
                      ? <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-700/40 text-[10px]">Actif</Badge>
                      : <Badge className="bg-slate-700/40 text-slate-500 border-slate-700 text-[10px]">Inactif</Badge>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Routing rules */}
      <Card className="bg-slate-900 border-slate-800 p-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-200">Règles de routage</p>
          <p className="text-xs text-slate-500 mt-0.5">Quel modèle pour quel type de tâche</p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {ROUTING_RULES.map((rule) => (
            <div key={rule.taskType} className="flex items-center gap-4 py-2 border-b border-slate-800/60 last:border-0">
              <div className="flex-1">
                <p className="text-xs font-mono text-slate-300">{rule.taskType}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{rule.description}</p>
              </div>
              <Select
                value={routingRules[rule.taskType]}
                onValueChange={(v) => setRoutingRules((prev) => ({ ...prev, [rule.taskType]: v }))}
              >
                <SelectTrigger className="w-52 h-8 bg-slate-800 border-slate-700 text-slate-300 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {MODEL_NAMES.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs text-slate-300 focus:bg-slate-700 font-mono">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </Card>

      {/* API Keys */}
      <Card className="bg-slate-900 border-slate-800 p-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-200">Clés API</p>
          <p className="text-xs text-slate-500 mt-0.5">Stockées chiffrées — non visibles en clair</p>
        </div>
        <div className="flex flex-col gap-4">
          {API_KEYS.map((k) => (
            <div key={k.id} className="flex flex-col gap-1.5">
              <Label className="text-xs text-slate-400">{k.label}</Label>
              <MaskedKey value={k.value} />
            </div>
          ))}
        </div>
      </Card>

      <Button className="bg-blue-600 hover:bg-blue-700 text-white w-fit">
        Enregistrer les règles de routage
      </Button>
    </div>
  )
}
