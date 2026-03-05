import { NextRequest, NextResponse } from 'next/server'
import { executeCommand } from '@/lib/gateway'

/**
 * GET /api/crons → list_crons
 */
export async function GET() {
  try {
    const result = await executeCommand('list_crons')
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/crons
 * Body: { action: "run", cron_id } | { action: "toggle", cron_id, enabled }
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, cron_id: cronId, enabled } = body

  if (!cronId) {
    return NextResponse.json({ error: 'cron_id is required' }, { status: 400 })
  }

  try {
    if (action === 'run') {
      const result = await executeCommand('run_cron', undefined, { cron_id: cronId })
      return NextResponse.json(result)
    }
    if (action === 'toggle') {
      if (typeof enabled !== 'boolean') {
        return NextResponse.json({ error: 'enabled (boolean) is required' }, { status: 400 })
      }
      const result = await executeCommand('toggle_cron', undefined, { cron_id: cronId, enabled })
      return NextResponse.json(result)
    }
    return NextResponse.json({ error: 'Invalid action. Use "run" or "toggle"' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
