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
    const { status, dispatched_to, action_suggestion, subcategory } = body

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

    if (subcategory) {
      const validSubcategories = ['knowledge', 'strategy', 'outbound_inbound']
      if (!validSubcategories.includes(subcategory)) {
        return NextResponse.json(
          { error: `Invalid subcategory. Use one of: ${validSubcategories.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Build update payload
    const updateData: Record<string, unknown> = { status }

    if (subcategory) {
      updateData.subcategory = subcategory
    }

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

    // If dispatching, create handover_message + project + gateway_command wake
    if (status === 'dispatched' && dispatched_to) {
      // 1. Create handover_message for tracking
      const { data: handover, error: hoError } = await supabase
        .from('handover_messages')
        .insert({
          from_agent: 'main',
          to_agent: dispatched_to,
          content: `Signal dispatché: ${data.title}\n\n${(data.summary || '').slice(0, 500)}`,
          priority: data.impact_level === 'critique' ? 'urgent' : data.impact_level === 'fort' ? 'high' : 'normal',
          status: 'sent',
          related_signal_id: id,
          data: {
            signal: {
              id,
              title: data.title,
              source_url: data.source_url,
              source_platform: data.source_platform,
              subcategory: data.subcategory,
            },
          },
        })
        .select('id')
        .single()

      if (hoError) {
        console.error('Failed to create handover message:', hoError)
      }

      // 2. Create project FIRST (need project_id for wake message)
      const handoverId = handover?.id || 'unknown'
      const priority = data.impact_level === 'critique' ? 'urgent' : data.impact_level === 'fort' ? 'high' : 'normal'
      const { data: project, error: projError } = await supabase
        .from('projects')
        .insert({
          name: data.title,
          description: (data.summary || '').slice(0, 500),
          status: 'draft',
          assigned_agent: dispatched_to,
          related_signal_id: id,
          related_handover_id: handoverId !== 'unknown' ? handoverId : null,
          category: data.subcategory || 'knowledge',
          priority,
          created_by: 'dashboard',
        })
        .select('id')
        .single()

      if (projError) {
        console.error('Failed to create project:', projError)
      }

      // 3. Create gateway_command wake with plan-first instructions
      const projectId = project?.id || 'unknown'
      const wakeMessage = `[HANDOVER ${handoverId}] Signal dispatché pour qualification.

Titre: ${data.title}
Source: ${data.source_url || 'N/A'}

INSTRUCTIONS:
1. Analyse le signal (consulte la source URL si accessible)
2. Propose un plan structuré via la commande ci-dessous.
3. NE PAS exécuter le plan. Attends la validation humaine.

COMMANDE:
python3 /root/sync-daemon/handover-cli.py message ${projectId} '<JSON>' --type plan_proposal

FORMAT JSON REQUIS (utilise ces clés exactes):
{"objective":"Décris l'objectif en 1-2 phrases","steps":[{"label":"Etape 1","done":false},{"label":"Etape 2","done":false}],"success_metrics":[{"name":"Nom métrique","baseline":"valeur actuelle","target":"valeur cible","type":"quanti"}],"complexity":"simple|moyen|complexe","risks":["Risque 1"],"tools_resources":["outil1","outil2"]}`

      const { error: cmdError } = await supabase
        .from('gateway_commands')
        .insert({
          command: 'wake',
          agent_id: dispatched_to,
          payload: {
            signal_id: id,
            project_id: projectId,
            title: data.title,
            summary: data.summary,
            message: wakeMessage,
          },
        })

      if (cmdError) {
        console.error('Failed to create gateway command for dispatch:', cmdError)
      }
    }

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
