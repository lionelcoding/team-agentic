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
 * Body:
 *   { action: "run", cron_id }
 *   { action: "toggle", cron_id, enabled }
 *   { action: "create", agent_id, name, schedule_expr, description? }
 *   { action: "update", cron_id, name?, schedule_expr?, description? }
 *   { action: "delete", cron_id }
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  try {
    if (action === 'run') {
      if (!body.cron_id) {
        return NextResponse.json({ error: 'cron_id is required' }, { status: 400 })
      }
      const result = await executeCommand('run_cron', undefined, { cron_id: body.cron_id })
      return NextResponse.json(result)
    }

    if (action === 'toggle') {
      if (!body.cron_id || typeof body.enabled !== 'boolean') {
        return NextResponse.json({ error: 'cron_id and enabled (boolean) are required' }, { status: 400 })
      }
      const result = await executeCommand('toggle_cron', undefined, { cron_id: body.cron_id, enabled: body.enabled })
      return NextResponse.json(result)
    }

    if (action === 'create') {
      if (!body.agent_id || !body.name || !body.schedule_expr) {
        return NextResponse.json({ error: 'agent_id, name, and schedule_expr are required' }, { status: 400 })
      }
      const result = await executeCommand('create_cron', body.agent_id, {
        name: body.name,
        schedule_expr: body.schedule_expr,
        description: body.description || '',
      })
      return NextResponse.json(result)
    }

    if (action === 'update') {
      if (!body.cron_id) {
        return NextResponse.json({ error: 'cron_id is required' }, { status: 400 })
      }
      const result = await executeCommand('update_cron', undefined, {
        cron_id: body.cron_id,
        name: body.name,
        schedule_expr: body.schedule_expr,
        description: body.description,
      })
      return NextResponse.json(result)
    }

    if (action === 'delete') {
      if (!body.cron_id) {
        return NextResponse.json({ error: 'cron_id is required' }, { status: 400 })
      }
      const result = await executeCommand('delete_cron', undefined, { cron_id: body.cron_id })
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid action. Use "run", "toggle", "create", "update", or "delete"' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
