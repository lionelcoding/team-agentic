import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['draft', 'validating', 'running', 'completed', 'failed', 'paused']
const VALID_COMPLEXITIES = ['simple', 'moyen', 'complexe']

// Fields that can be updated via PATCH (besides status/results)
const PLAN_FIELDS = [
  'objective', 'success_metrics', 'steps', 'complexity',
  'deadline', 'tools_resources', 'risks', 'okr',
  'artifact_content', 'artifact_path',
] as const

/**
 * PATCH /api/projects/[id] — Update project fields (status optional for partial plan updates)
 * Body: { status?, results?, objective?, success_metrics?, steps?, complexity?, deadline?, tools_resources?, risks?, okr?, artifact_content?, artifact_path? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createClient()

  try {
    const body = await request.json()
    const { status, results, ...rest } = body

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Use one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate complexity if provided
    if (rest.complexity && !VALID_COMPLEXITIES.includes(rest.complexity)) {
      return NextResponse.json(
        { error: `Invalid complexity. Use one of: ${VALID_COMPLEXITIES.join(', ')}` },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (status) {
      updateData.status = status

      if (status === 'running') {
        updateData.started_at = new Date().toISOString()
      }

      if (status === 'completed' || status === 'failed') {
        updateData.completed_at = new Date().toISOString()
      }
    }

    if (results) {
      updateData.results = results
    }

    // Copy plan fields
    for (const field of PLAN_FIELDS) {
      if (rest[field] !== undefined) {
        updateData[field] = rest[field]
      }
    }

    // Must have at least one meaningful field to update
    const hasFields = status || results || PLAN_FIELDS.some(f => rest[f] !== undefined)
    if (!hasFields) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // When status → running + assigned_agent exists: auto-wake agent
    if (status === 'running' && data.assigned_agent) {
      const { error: cmdError } = await supabase
        .from('gateway_commands')
        .insert({
          command: 'wake',
          agent_id: data.assigned_agent,
          payload: {
            project_id: id,
            message: `[PROJECT VALIDATED] Exécute le plan du projet "${data.name}".\n\nConsulte le plan: python3 /root/sync-daemon/handover-cli.py project-info ${id}`,
          },
        })

      if (cmdError) {
        console.error('Failed to create gateway_command for project validation:', cmdError)
      }
    }

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
