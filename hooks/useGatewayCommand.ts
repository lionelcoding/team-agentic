'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GatewayCommandStatus } from '@/lib/agents-data'

interface UseGatewayCommandReturn {
  sendCommand: (command: string, agentId?: string, payload?: Record<string, unknown>) => Promise<void>
  status: GatewayCommandStatus | null
  result: Record<string, unknown> | null
  error: string | null
  isLoading: boolean
}

const POLL_INTERVAL = 2000
const MAX_POLLS = 30 // 60s max

export function useGatewayCommand(): UseGatewayCommandReturn {
  const [status, setStatus] = useState<GatewayCommandStatus | null>(null)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const sendCommand = useCallback(async (
    command: string,
    agentId?: string,
    payload: Record<string, unknown> = {}
  ) => {
    cleanup()
    setStatus('pending')
    setResult(null)
    setError(null)
    setIsLoading(true)

    const supabase = createClient()

    try {
      const { data, error: insertError } = await supabase
        .from('gateway_commands')
        .insert({
          command,
          agent_id: agentId || null,
          payload,
        })
        .select('id')
        .single()

      if (insertError || !data) {
        throw new Error(insertError?.message || 'Erreur lors de la creation de la commande')
      }

      const commandId = data.id
      let pollCount = 0

      pollRef.current = setInterval(async () => {
        pollCount++

        if (pollCount > MAX_POLLS) {
          cleanup()
          setError('Timeout : la commande n\'a pas ete traitee dans le delai imparti')
          setStatus('error')
          setIsLoading(false)
          return
        }

        const { data: row, error: fetchError } = await supabase
          .from('gateway_commands')
          .select('status, result, error_message')
          .eq('id', commandId)
          .single()

        if (fetchError) {
          cleanup()
          setError(fetchError.message)
          setStatus('error')
          setIsLoading(false)
          return
        }

        setStatus(row.status as GatewayCommandStatus)

        if (row.status === 'done') {
          cleanup()
          setResult(row.result || {})
          setIsLoading(false)
        } else if (row.status === 'error') {
          cleanup()
          setError(row.error_message || 'Erreur inconnue')
          setIsLoading(false)
        }
      }, POLL_INTERVAL)
    } catch (err) {
      cleanup()
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setStatus('error')
      setIsLoading(false)
    }
  }, [cleanup])

  return { sendCommand, status, result, error, isLoading }
}
