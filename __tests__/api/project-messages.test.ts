import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Supabase mock ---

let mockInsertData: Record<string, unknown> | null = null

const mockSingle = vi.fn()
const mockOrder = vi.fn(() => ({ data: [], error: null }))
const mockEq = vi.fn(function () { return { order: mockOrder, select: mockSelect, single: mockSingle } })
const mockSelect = vi.fn(() => ({ single: mockSingle, order: mockOrder, eq: mockEq }))
const mockInsert = vi.fn((data: Record<string, unknown>) => {
  mockInsertData = data
  return { select: mockSelect }
})

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  eq: mockEq,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ from: mockFrom }),
}))

// --- Import after mock ---
const { GET, POST } = await import('@/app/api/projects/[id]/messages/route')

// --- Helpers ---

function makeGet() {
  return new NextRequest('http://localhost/api/projects/proj-1/messages')
}

function makePost(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/projects/proj-1/messages', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const params = { params: Promise.resolve({ id: 'proj-1' }) }

// --- Tests ---

describe('GET /api/projects/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns messages ordered by created_at', async () => {
    const messages = [
      { id: 'm1', content: 'first', created_at: '2026-01-01T00:00:00Z' },
      { id: 'm2', content: 'second', created_at: '2026-01-01T01:00:00Z' },
    ]
    mockOrder.mockResolvedValue({ data: messages, error: null })

    const res = await GET(makeGet(), params)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(messages)
    expect(mockFrom).toHaveBeenCalledWith('project_messages')
    expect(mockEq).toHaveBeenCalledWith('project_id', 'proj-1')
  })

  it('returns 500 on DB error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const res = await GET(makeGet(), params)
    expect(res.status).toBe(500)
  })
})

describe('POST /api/projects/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsertData = null
  })

  it('creates message with role human', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'm1', role: 'human', content: 'test' }, error: null })

    const res = await POST(makePost({ content: 'test' }), params)
    expect(res.status).toBe(201)
    expect(mockInsertData?.role).toBe('human')
    expect(mockInsertData?.content).toBe('test')
    expect(mockInsertData?.message_type).toBe('feedback')
  })

  it('returns 400 when content is missing', async () => {
    const res = await POST(makePost({}), params)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('content')
  })

  it('returns 400 when content is empty string', async () => {
    const res = await POST(makePost({ content: '   ' }), params)
    expect(res.status).toBe(400)
  })

  it('accepts valid message_type', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'm1' }, error: null })

    const res = await POST(makePost({ content: 'test', message_type: 'status_update' }), params)
    expect(res.status).toBe(201)
    expect(mockInsertData?.message_type).toBe('status_update')
  })

  it('rejects invalid message_type', async () => {
    const res = await POST(makePost({ content: 'test', message_type: 'invalid_type' }), params)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Invalid message_type')
  })

  it('defaults message_type to feedback', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'm1' }, error: null })

    await POST(makePost({ content: 'hello' }), params)
    expect(mockInsertData?.message_type).toBe('feedback')
  })

  it('trims content whitespace', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'm1' }, error: null })

    await POST(makePost({ content: '  hello world  ' }), params)
    expect(mockInsertData?.content).toBe('hello world')
  })
})
