import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Supabase mock ---

let mockInsertData: Record<string, unknown> | null = null
let mockUpdateData: Record<string, unknown> | null = null
let mockInsertTable: string | null = null
let mockInserts: { table: string; data: Record<string, unknown> }[] = []

const mockSingle = vi.fn()
const mockOrder = vi.fn(() => ({ data: [], error: null }))
const mockSelect = vi.fn(() => ({ single: mockSingle, order: mockOrder }))
const mockEq = vi.fn(function () { return { select: mockSelect, single: mockSingle } })
const mockUpdate = vi.fn((data: Record<string, unknown>) => {
  mockUpdateData = data
  return { eq: mockEq }
})
const mockInsert = vi.fn((data: Record<string, unknown>) => {
  mockInsertData = data
  if (mockInsertTable) mockInserts.push({ table: mockInsertTable, data })
  return { select: mockSelect }
})

const mockFrom = vi.fn((table: string) => {
  mockInsertTable = table
  return {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    eq: mockEq,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ from: mockFrom }),
}))

// --- Import after mock ---
const { GET, POST } = await import('@/app/api/projects/route')
const { PATCH } = await import('@/app/api/projects/[id]/route')

// --- Helpers ---

function makeGet() {
  return new NextRequest('http://localhost/api/projects')
}

function makePost(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/projects', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function makePatch(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/projects/proj-123', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

// --- Tests ---

describe('GET /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns projects list', async () => {
    const projects = [{ id: 'p1', name: 'Test', status: 'draft' }]
    mockOrder.mockResolvedValue({ data: projects, error: null })

    const res = await GET(makeGet())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(projects)
    expect(mockFrom).toHaveBeenCalledWith('projects')
  })

  it('returns 500 on DB error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const res = await GET(makeGet())
    expect(res.status).toBe(500)
  })
})

describe('POST /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsertData = null
  })

  it('creates a project with required fields', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'p1', name: 'My Project', status: 'draft' }, error: null })

    const res = await POST(makePost({ name: 'My Project' }))
    expect(res.status).toBe(201)
    expect(mockInsertData?.name).toBe('My Project')
    expect(mockInsertData?.status).toBe('draft')
  })

  it('returns 400 when name is missing', async () => {
    const res = await POST(makePost({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('name')
  })

  it('accepts optional fields', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'p2' }, error: null })

    await POST(makePost({
      name: 'Project X',
      description: 'desc',
      assigned_agent: 'research',
      category: 'strategy',
      priority: 'high',
      related_signal_id: 'sig-1',
      related_handover_id: 'ho-1',
    }))

    expect(mockInsertData).toMatchObject({
      name: 'Project X',
      description: 'desc',
      assigned_agent: 'research',
      category: 'strategy',
      priority: 'high',
      related_signal_id: 'sig-1',
      related_handover_id: 'ho-1',
    })
  })

  it('returns 400 for invalid category', async () => {
    const res = await POST(makePost({ name: 'X', category: 'invalid' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('category')
  })

  it('returns 400 for invalid priority', async () => {
    const res = await POST(makePost({ name: 'X', priority: 'medium' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('priority')
  })
})

describe('PATCH /api/projects/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateData = null
    mockInserts = []
  })

  it('updates project status', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'proj-123', status: 'running' }, error: null })

    const res = await PATCH(makePatch({ status: 'running' }), { params: Promise.resolve({ id: 'proj-123' }) })
    expect(res.status).toBe(200)
    expect(mockUpdateData?.status).toBe('running')
  })

  it('returns 400 for invalid status', async () => {
    const res = await PATCH(makePatch({ status: 'invalid' }), { params: Promise.resolve({ id: 'proj-123' }) })
    expect(res.status).toBe(400)
  })

  it('accepts all valid statuses', async () => {
    const validStatuses = ['draft', 'validating', 'running', 'completed', 'failed', 'paused']
    for (const status of validStatuses) {
      mockSingle.mockResolvedValue({ data: { id: 'proj-123', status }, error: null })
      const res = await PATCH(makePatch({ status }), { params: Promise.resolve({ id: 'proj-123' }) })
      expect(res.status).toBe(200)
    }
  })

  it('sets started_at when moving to running', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'proj-123', status: 'running' }, error: null })
    await PATCH(makePatch({ status: 'running' }), { params: Promise.resolve({ id: 'proj-123' }) })
    expect(mockUpdateData).toHaveProperty('started_at')
  })

  it('sets completed_at when moving to completed', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'proj-123', status: 'completed' }, error: null })
    await PATCH(makePatch({ status: 'completed' }), { params: Promise.resolve({ id: 'proj-123' }) })
    expect(mockUpdateData).toHaveProperty('completed_at')
  })

  it('allows updating results', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'proj-123', status: 'completed' }, error: null })
    await PATCH(makePatch({ status: 'completed', results: { summary: 'done' } }), { params: Promise.resolve({ id: 'proj-123' }) })
    expect(mockUpdateData?.results).toEqual({ summary: 'done' })
  })

  it('returns 500 on DB error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'fail' } })
    const res = await PATCH(makePatch({ status: 'running' }), { params: Promise.resolve({ id: 'proj-123' }) })
    expect(res.status).toBe(500)
  })

  // --- New tests for plan fields ---

  it('accepts plan fields without status (partial update)', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'proj-123', status: 'draft', objective: 'Test' }, error: null })

    const res = await PATCH(makePatch({
      objective: 'Test objective',
      complexity: 'moyen',
      steps: [{ label: 'Step 1', done: false }],
    }), { params: Promise.resolve({ id: 'proj-123' }) })

    expect(res.status).toBe(200)
    expect(mockUpdateData?.objective).toBe('Test objective')
    expect(mockUpdateData?.complexity).toBe('moyen')
    expect(mockUpdateData?.steps).toEqual([{ label: 'Step 1', done: false }])
    expect(mockUpdateData?.status).toBeUndefined()
  })

  it('returns 400 for invalid complexity', async () => {
    const res = await PATCH(makePatch({ complexity: 'hard' }), { params: Promise.resolve({ id: 'proj-123' }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('complexity')
  })

  it('accepts all valid complexities', async () => {
    for (const complexity of ['simple', 'moyen', 'complexe']) {
      mockSingle.mockResolvedValue({ data: { id: 'proj-123', complexity }, error: null })
      const res = await PATCH(makePatch({ complexity }), { params: Promise.resolve({ id: 'proj-123' }) })
      expect(res.status).toBe(200)
    }
  })

  it('returns 400 when no fields to update', async () => {
    const res = await PATCH(makePatch({}), { params: Promise.resolve({ id: 'proj-123' }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('No fields')
  })

  it('accepts success_metrics, tools_resources, risks, okr, deadline', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'proj-123' }, error: null })

    const metrics = [{ name: 'CTR', baseline: '2%', target: '5%', actual: null, type: 'quanti' }]
    await PATCH(makePatch({
      success_metrics: metrics,
      tools_resources: ['brave_search', 'web_scraper'],
      risks: ['API rate limit'],
      okr: 'O1: Increase visibility',
      deadline: '2026-04-01T00:00:00Z',
    }), { params: Promise.resolve({ id: 'proj-123' }) })

    expect(mockUpdateData?.success_metrics).toEqual(metrics)
    expect(mockUpdateData?.tools_resources).toEqual(['brave_search', 'web_scraper'])
    expect(mockUpdateData?.risks).toEqual(['API rate limit'])
    expect(mockUpdateData?.okr).toBe('O1: Increase visibility')
    expect(mockUpdateData?.deadline).toBe('2026-04-01T00:00:00Z')
  })

  it('accepts artifact_content and artifact_path', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'proj-123' }, error: null })

    await PATCH(makePatch({
      artifact_content: '# Report\n\nDone.',
      artifact_path: '/root/clawd/output/report.md',
    }), { params: Promise.resolve({ id: 'proj-123' }) })

    expect(mockUpdateData?.artifact_content).toBe('# Report\n\nDone.')
    expect(mockUpdateData?.artifact_path).toBe('/root/clawd/output/report.md')
  })

  it('auto-inserts gateway_command when status goes to running with assigned_agent', async () => {
    mockSingle.mockResolvedValue({
      data: { id: 'proj-123', status: 'running', assigned_agent: 'research', name: 'My Project' },
      error: null,
    })

    await PATCH(makePatch({ status: 'running' }), { params: Promise.resolve({ id: 'proj-123' }) })

    const cmdInsert = mockInserts.find(i => i.table === 'gateway_commands')
    expect(cmdInsert).toBeDefined()
    expect(cmdInsert!.data).toMatchObject({
      command: 'wake',
      agent_id: 'research',
    })
    const payload = cmdInsert!.data.payload as Record<string, unknown>
    expect(payload.project_id).toBe('proj-123')
    expect(payload.message).toContain('[PROJECT VALIDATED]')
  })

  it('does not insert gateway_command when no assigned_agent', async () => {
    mockSingle.mockResolvedValue({
      data: { id: 'proj-123', status: 'running', assigned_agent: null },
      error: null,
    })

    await PATCH(makePatch({ status: 'running' }), { params: Promise.resolve({ id: 'proj-123' }) })

    const cmdInsert = mockInserts.find(i => i.table === 'gateway_commands')
    expect(cmdInsert).toBeUndefined()
  })
})
