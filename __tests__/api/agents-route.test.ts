import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase server client
const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) }))
const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ execute: vi.fn() })) }))
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}))

// Mock gateway executeCommand
const mockExecuteCommand = vi.fn()
vi.mock('@/lib/gateway', () => ({
  executeCommand: (...args: unknown[]) => mockExecuteCommand(...args),
}))

// Import after mocks
import { POST } from '@/app/api/agents/route'
import { NextRequest } from 'next/server'

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/agents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects missing id', async () => {
    const res = await POST(makeRequest({ name: 'Test', role: 'Tester' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/Identifiant invalide/)
  })

  it('rejects invalid id format (uppercase)', async () => {
    const res = await POST(makeRequest({ id: 'INVALID', name: 'Test', role: 'Tester' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/Identifiant invalide/)
  })

  it('rejects id with underscore', async () => {
    const res = await POST(makeRequest({ id: 'my_agent', name: 'Test', role: 'Tester' }))
    expect(res.status).toBe(400)
  })

  it('rejects missing name', async () => {
    const res = await POST(makeRequest({ id: 'test-agent', role: 'Tester' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/Nom et role/)
  })

  it('rejects missing role', async () => {
    const res = await POST(makeRequest({ id: 'test-agent', name: 'Test' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/Nom et role/)
  })

  it('rejects duplicate id', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'existing' }, error: null })

    const res = await POST(makeRequest({ id: 'existing', name: 'Test', role: 'Tester' }))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toMatch(/existe deja/)
  })

  it('creates agent and provisions on success', async () => {
    // No existing agent
    mockSingle.mockResolvedValueOnce({ data: null, error: null })
    // Insert succeeds
    mockInsert.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'new-agent' }, error: null })
      })
    })
    // But we mock from differently for insert
    let insertCalled = false
    mockFrom.mockImplementation((table: string) => {
      if (table === 'agents' && !insertCalled) {
        // First call: select to check uniqueness
        return { select: mockSelect, insert: mockInsert, update: mockUpdate }
      }
      return { select: mockSelect, insert: mockInsert, update: mockUpdate }
    })

    // Insert returns no error
    mockInsert.mockReturnValueOnce({ error: null })

    // executeCommand succeeds
    mockExecuteCommand.mockResolvedValueOnce({ agent_id: 'new-agent', workspace: '/root/clawd-eagle/new-agent' })

    // Update status to idle
    mockUpdate.mockReturnValueOnce({ eq: vi.fn().mockReturnValue({ execute: vi.fn() }) })

    const res = await POST(makeRequest({
      id: 'new-agent',
      name: 'New Agent',
      role: 'Testing',
      description: 'Test desc',
      model: 'anthropic/claude-sonnet-4-20250514',
      tags: ['eagle'],
      enabled: true,
    }))

    // Should have called executeCommand with provision_agent
    expect(mockExecuteCommand).toHaveBeenCalledWith(
      'provision_agent',
      'new-agent',
      expect.objectContaining({ name: 'New Agent', role: 'Testing' })
    )
  })

  it('sets status to error when provisioning fails', async () => {
    // No existing agent
    mockSingle.mockResolvedValueOnce({ data: null, error: null })
    // Insert succeeds
    mockInsert.mockReturnValueOnce({ error: null })
    // executeCommand fails
    mockExecuteCommand.mockRejectedValueOnce(new Error('VPS unreachable'))
    // Update status to error
    mockUpdate.mockReturnValueOnce({ eq: vi.fn().mockReturnValue({ execute: vi.fn() }) })

    const res = await POST(makeRequest({
      id: 'fail-agent',
      name: 'Fail Agent',
      role: 'Testing',
    }))

    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('VPS unreachable')
    expect(data.status).toBe('error')
  })
})
