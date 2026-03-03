'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2, RefreshCw, Wifi, WifiOff, Terminal, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { GATEWAY_LOGS } from '@/lib/mock/settings-data'
import type { ConnectionStatus } from '@/lib/mock/settings-data'

const LOG_COLORS: Record<string, string> = {
  INFO:  'text-blue-400',
  DEBUG: 'text-slate-500',
  WARN:  'text-amber-400',
  ERROR: 'text-red-400',
}

export function GatewayTab() {
  const [gatewayUrl, setGatewayUrl]       = useState('http://localhost:18789')
  const [status, setStatus]               = useState<ConnectionStatus>('connected')
  const [testing, setTesting]             = useState(false)
  const [restarting, setRestarting]       = useState(false)
  const [tailscaleStatus]                 = useState<ConnectionStatus>('connected')

  async function handleTest() {
    setTesting(true)
    setStatus('checking')
    await new Promise((r) => setTimeout(r, 1800))
    setStatus('connected')
    setTesting(false)
  }

  async function handleRestart() {
    setRestarting(true)
    await new Promise((r) => setTimeout(r, 2200))
    setRestarting(false)
  }

  function StatusBadge({ s }: { s: ConnectionStatus }) {
    if (s === 'checking') return (
      <Badge className="bg-slate-700 text-slate-300 border-slate-600 gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" /> Vérification...
      </Badge>
    )
    if (s === 'connected') return (
      <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-700/40 gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
        Connected
      </Badge>
    )
    return (
      <Badge className="bg-red-600/20 text-red-400 border-red-700/40 gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
        Disconnected
      </Badge>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">

      {/* Connection */}
      <Card className="bg-slate-900 border-slate-800 p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-200">Connexion Gateway</p>
            <p className="text-xs text-slate-500 mt-0.5">OpenClaw LeadGen Gateway v2.4.1</p>
          </div>
          <StatusBadge s={status} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="gateway-url" className="text-xs text-slate-400">URL du Gateway</Label>
          <div className="flex gap-2">
            <Input
              id="gateway-url"
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-200 font-mono text-sm focus-visible:ring-blue-500"
              placeholder="http://localhost:18789"
            />
            <Button
              onClick={handleTest}
              disabled={testing}
              className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {testing ? 'Test...' : 'Tester'}
            </Button>
          </div>
        </div>

        {/* Tailscale */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            {tailscaleStatus === 'connected'
              ? <Wifi className="w-4 h-4 text-emerald-400" />
              : <WifiOff className="w-4 h-4 text-red-400" />
            }
            <div>
              <p className="text-sm text-slate-200 font-medium">Tailscale</p>
              <p className="text-xs text-slate-500 font-mono">leadgen-b2b.tail1234.ts.net</p>
            </div>
          </div>
          <StatusBadge s={tailscaleStatus} />
        </div>
      </Card>

      {/* Gateway Logs */}
      <Card className="bg-slate-900 border-slate-800 p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-200">Gateway Logs</p>
            <span className="text-xs text-slate-600">20 dernières lignes</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestart}
            disabled={restarting}
            className="border-red-700/50 text-red-400 hover:bg-red-600/10 hover:text-red-300 text-xs"
          >
            {restarting
              ? <><Loader2 className="w-3 h-3 animate-spin" /> Redémarrage...</>
              : <><RotateCcw className="w-3 h-3" /> Restart Gateway</>
            }
          </Button>
        </div>
        <div className="bg-slate-950 rounded-md border border-slate-800 p-3 h-72 overflow-y-auto font-mono text-xs leading-6 space-y-0.5">
          {GATEWAY_LOGS.map((log, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-slate-600 shrink-0">{log.timestamp}</span>
              <span className={cn('shrink-0 w-12', LOG_COLORS[log.level])}>{log.level}</span>
              <span className="text-slate-300">{log.message}</span>
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
