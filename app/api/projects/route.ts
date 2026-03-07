import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_CATEGORIES = ['knowledge', 'strategy', 'outbound_inbound']
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent']

/**
 * GET /api/projects — List all projects
 */
export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/projects — Create a new project
 * Body: { name, description?, assigned_agent?, category?, priority?, related_signal_id?, related_handover_id? }
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()

  try {
    const body = await request.json()
    const { name, description, assigned_agent, category, priority, related_signal_id, related_handover_id } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `Invalid category. Use one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 })
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: `Invalid priority. Use one of: ${VALID_PRIORITIES.join(', ')}` }, { status: 400 })
    }

    const insertData: Record<string, unknown> = {
      name,
      status: 'draft',
    }

    if (description) insertData.description = description
    if (assigned_agent) insertData.assigned_agent = assigned_agent
    if (category) insertData.category = category
    if (priority) insertData.priority = priority
    if (related_signal_id) insertData.related_signal_id = related_signal_id
    if (related_handover_id) insertData.related_handover_id = related_handover_id

    const { data, error } = await supabase
      .from('projects')
      .insert(insertData)
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
