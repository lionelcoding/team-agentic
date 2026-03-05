import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PATCH /api/signals/[id] — Update signal status
 * Body: { status, dispatched_to?, action_suggestion? }
 *
 * status values:
 *   "approved"   — mark as approved
 *   "rejected"   — mark as rejected
 *   "dispatched" — mark as dispatched + create gateway_command to wake target agent
 *   "archived"   — mark as archived
 *   "raw"        — reset to raw (re-queue)
 *   "tagged"     — reset to tagged (re-queue)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createClient()

  try {
    const body = await request.json()
    const { status, dispatched_to, action_suggestion } = body

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const validStatuses = ['raw', 'tagged', 'approved', 'rejected', 'dispatched', 'archived']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Use one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Build update payload
    const updateData: Record<string, unknown> = { status }

    if (status === 'archived') {
      updateData.archived_at = new Date().toISOString()
    }

    if (status === 'dispatched' && dispatched_to) {
      updateData.dispatched_to = dispatched_to
    }

    if (action_suggestion) {
      updateData.action_suggestion = action_suggestion
    }

    // Update signal
    const { data, error } = await supabase
      .from('signal_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 })
    }

    // If dispatching, create a gateway_command to wake the target agent
    if (status === 'dispatched' && dispatched_to) {
      const { error: cmdError } = await supabase
        .from('gateway_commands')
        .insert({
          command: 'wake',
          agent_id: dispatched_to,
          payload: {
            signal_id: id,
            title: data.title,
            summary: data.summary,
          },
        })

      if (cmdError) {
        console.error('Failed to create gateway command for dispatch:', cmdError)
        // Don't fail the whole request — signal was already updated
      }
    }

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
