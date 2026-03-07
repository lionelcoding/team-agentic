import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Supabase mock ---

let mockInsertData: Record<string, unknown> | null = null
let mockUpdateData: Record<string, unknown> | null = null

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
  return { select: mockSelect }
})

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  eq: mockEq,
}))

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
})
