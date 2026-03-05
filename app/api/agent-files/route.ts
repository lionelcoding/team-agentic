import { NextRequest, NextResponse } from 'next/server'
import { executeCommand } from '@/lib/gateway'

const KNOWN_AGENTS = new Set(['main', 'architect', 'tam', 'research', 'outbound', 'monitor'])

/**
 * GET /api/agent-files?agent_id=main          → list_files
 * GET /api/agent-files?agent_id=main&file=SOUL.md → read_file
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const agentId = searchParams.get('agent_id')
  const file = searchParams.get('file')

  if (!agentId || !KNOWN_AGENTS.has(agentId)) {
    return NextResponse.json({ error: 'Invalid agent_id' }, { status: 400 })
  }

  try {
    if (file) {
      const result = await executeCommand('read_file', agentId, { filename: file })
      return NextResponse.json(result)
    }
    const result = await executeCommand('list_files', agentId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PUT /api/agent-files
 * Body: { agent_id, file, content }
 */
export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { agent_id: agentId, file, content } = body

  if (!agentId || !KNOWN_AGENTS.has(agentId)) {
    return NextResponse.json({ error: 'Invalid agent_id' }, { status: 400 })
  }
  if (!file || content === undefined) {
    return NextResponse.json({ error: 'file and content are required' }, { status: 400 })
  }

  try {
    const result = await executeCommand('write_file', agentId, { filename: file, content })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
