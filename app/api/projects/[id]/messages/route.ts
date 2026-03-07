import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_MESSAGE_TYPES = ['plan_proposal', 'feedback', 'status_update', 'deliverable', 'metric_update']

/**
 * GET /api/projects/[id]/messages — List messages for a project
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createClient()

  const { data, error } = await supabase
    .from('project_messages')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/projects/[id]/messages — Create a human message
 * Body: { content, message_type? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createClient()

  try {
    const body = await request.json()
    const { content, message_type } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const msgType = message_type || 'feedback'
    if (!VALID_MESSAGE_TYPES.includes(msgType)) {
      return NextResponse.json(
        { error: `Invalid message_type. Use one of: ${VALID_MESSAGE_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('project_messages')
      .insert({
        project_id: id,
        role: 'human',
        content: content.trim(),
        message_type: msgType,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
