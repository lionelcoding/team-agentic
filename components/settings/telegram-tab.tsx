'use client'

import { useState } from 'react'
import { Send, Eye, EyeOff, Loader2, CheckCircle2, Bot } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { NOTIFICATION_RULES } from '@/lib/mock/settings-data'

export function TelegramTab() {
  const [tokenVisible, setTokenVisible]     = useState(false)
  const [chatId, setChatId]                 = useState('-1001234567890')
  const [webhookUrl, setWebhookUrl]         = useState('https://api.telegram.org/bot{TOKEN}/setWebhook')
  const [testing, setTesting]               = useState(false)
  const [testSent, setTestSent]             = useState(false)
  const [rules, setRules]                   = useState(
    Object.fromEntries(NOTIFICATION_RULES.map((r) => [r.id, r.enabled]))
  )

  async function handleTest() {
    setTesting(true)
    await new Promise((r) => setTimeout(r, 1600))
    setTesting(false)
    setTestSent(true)
    setTimeout(() => setTestSent(false), 3000)
  }

  function toggleRule(id: string) {
    setRules((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const BOT_TOKEN_MASKED = '7892345678:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

  return (
    <div className="flex flex-col gap-6 max-w-2xl">

      {/* Bot config */}
      <Card className="bg-slate-900 border-slate-800 p-5 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-500/30">
            <Bot className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">Configuration du bot</p>
            <p className="text-xs text-slate-500">@leadgen_b2b_bot</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs text-slate-400">Bot Token</Label>
          <div className="flex items-center gap-2">
            <Input
              type={tokenVisible ? 'text' : 'password'}
              defaultValue={BOT_TOKEN_MASKED}
              className="bg-slate-800 border-slate-700 text-slate-200 font-mono text-xs focus-visible:ring-blue-500"
            />
            <button
              onClick={() => setTokenVisible((v) => !v)}
              className="p-2 rounded-md hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
            >
              {tokenVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs text-slate-400">Webhook URL</Label>
          <Input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="bg-slate-800 border-slate-700 text-slate-200 font-mono text-xs focus-visible:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs text-slate-400">Chat ID (canal de notifications)</Label>
          <Input
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            className="bg-slate-800 border-slate-700 text-slate-200 font-mono text-xs focus-visible:ring-blue-500"
          />
          <p className="text-[11px] text-slate-600">Utilisez un ID de groupe ou de canal Telegram</p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={handleTest}
            disabled={testing || testSent}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-700"
          >
            {testing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</>
              : testSent
              ? <><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Envoyé !</>
              : <><Send className="w-4 h-4" /> Envoyer test</>
            }
          </Button>
          {testSent && (
            <p className="text-xs text-emerald-400">Message de test envoyé sur Telegram</p>
          )}
        </div>
      </Card>

      {/* Notification rules */}
      <Card className="bg-slate-900 border-slate-800 p-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-200">Regles de notification</p>
          <p className="text-xs text-slate-500 mt-0.5">Choisissez quand recevoir des messages Telegram</p>
        </div>
        <div className="flex flex-col divide-y divide-slate-800/60">
          {NOTIFICATION_RULES.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm text-slate-200">{rule.label}</p>
                <p className="text-[11px] text-slate-500">{rule.description}</p>
              </div>
              <Switch
                checked={rules[rule.id]}
                onCheckedChange={() => toggleRule(rule.id)}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          ))}
        </div>
      </Card>

      <Button className="bg-blue-600 hover:bg-blue-700 text-white w-fit">
        Enregistrer
      </Button>
    </div>
  )
}
