import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeCommand } from '@/lib/gateway'

const SLUG_RE = /^[a-z][a-z0-9-]{1,30}$/

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { id, name, role, description, model, tags, enabled } = body

  // Validation
  if (!id || !SLUG_RE.test(id)) {
    return NextResponse.json(
      { error: 'Identifiant invalide (lettres minuscules, chiffres, tirets, 2-31 chars)' },
      { status: 400 }
    )
  }
  if (!name || !role) {
    return NextResponse.json({ error: 'Nom et role sont requis' }, { status: 400 })
  }

  const supabase = createClient()

  // Check uniqueness
  const { data: existing } = await supabase
    .from('agents')
    .select('id')
    .eq('id', id)
    .single()

  if (existing) {
    return NextResponse.json({ error: `Un agent avec l'id "${id}" existe deja` }, { status: 409 })
  }

  const workspacePath = `/root/clawd-eagle/${id}`

  // 1. INSERT agent with status "provisioning"
  const { error: insertError } = await supabase.from('agents').insert({
    id,
    name,
    role,
    description: description || null,
    model: model || 'anthropic/claude-sonnet-4-20250514',
    tags: tags || [],
    enabled: enabled !== false,
    status: 'provisioning',
    workspace_path: workspacePath,
    personas: [],
    tokens_used: 0,
    tasks_count: 0,
    tasks_failed: 0,
    memory_size_tokens: 0,
    daily_notes_count: 0,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // 2. Send provision_agent command to daemon
  try {
    await executeCommand('provision_agent', id, { name, role, description, model })

    // 3. Success → set status to idle
    await supabase
      .from('agents')
      .update({ status: 'idle' })
      .eq('id', id)

    return NextResponse.json({ id, status: 'idle', workspace_path: workspacePath })
  } catch (err) {
    // Provisioning failed → set status to error
    const message = err instanceof Error ? err.message : 'Provisioning failed'
    await supabase
      .from('agents')
      .update({ status: 'error' })
      .eq('id', id)

    return NextResponse.json({ error: message, id, status: 'error' }, { status: 500 })
  }
}
