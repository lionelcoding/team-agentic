import { createClient } from '@/lib/supabase/server'

const POLL_INTERVAL = 2000
const MAX_POLLS = 15 // 30s max

/**
 * Insert a gateway_command and poll until done/error/timeout.
 * Server-side only (uses service_role).
 */
export async function executeCommand(
  command: string,
  agentId?: string,
  payload?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const supabase = createClient()

  const { data, error: insertError } = await supabase
    .from('gateway_commands')
    .insert({
      command,
      agent_id: agentId || null,
      payload: payload || {},
    })
    .select('id')
    .single()

  if (insertError || !data) {
    throw new Error(insertError?.message || 'Failed to create command')
  }

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL))

    const { data: cmd, error: fetchError } = await supabase
      .from('gateway_commands')
      .select('status, result, error_message')
      .eq('id', data.id)
      .single()

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    if (cmd.status === 'done') {
      return (cmd.result as Record<string, unknown>) || {}
    }
    if (cmd.status === 'error') {
      throw new Error(cmd.error_message || 'Command failed')
    }
  }

  throw new Error('Timeout: command not processed within 30s')
}
