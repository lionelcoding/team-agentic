import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Supabase mock ---

let mockUpdateData: Record<string, unknown> | null = null
let mockInsertTable: string | null = null
let mockInserts: { table: string; data: Record<string, unknown> }[] = []

const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockEq = vi.fn(function (this: unknown) { return { select: mockSelect, single: mockSingle } })
const mockUpdate = vi.fn((data: Record<string, unknown>) => {
  mockUpdateData = data
  return { eq: mockEq }
})
const mockInsert = vi.fn((data: Record<string, unknown>) => {
  mockInsertTable && mockInserts.push({ table: mockInsertTable, data })
  return { select: mockSelect }
})

const mockFrom = vi.fn((table: string) => {
  mockInsertTable = table
  return {
    update: mockUpdate,
    insert: mockInsert,
    eq: mockEq,
    select: mockSelect,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ from: mockFrom }),
}))

// --- Import after mock ---
const { PATCH } = await import('@/app/api/signals/[id]/route')

// --- Helpers ---

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/signals/test-id', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

const SIGNAL_DATA = {
  id: 'sig-123',
  title: 'Test Signal',
  summary: 'A test summary',
  source_url: 'https://example.com',
  source_platform: 'youtube',
  subcategory: 'knowledge',
  impact_level: 'moyen',
  status: 'dispatched',
  dispatched_to: 'research',
}

// --- Tests ---

describe('PATCH /api/signals/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInserts = []
    mockUpdateData = null

    // Default: update succeeds, returns signal data
    mockSingle.mockResolvedValue({ data: SIGNAL_DATA, error: null })
  })

  it('returns 400 when status is missing', async () => {
    const res = await PATCH(makeRequest({}), { params: Promise.resolve({ id: 'sig-123' }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('status is required')
  })

  it('returns 400 for invalid status', async () => {
    const res = await PATCH(makeRequest({ status: 'invalid' }), { params: Promise.resolve({ id: 'sig-123' }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Invalid status')
  })

  it('accepts all valid statuses', async () => {
    const validStatuses = ['raw', 'tagged', 'approved', 'rejected', 'dispatched', 'archived']
    for (const status of validStatuses) {
      mockSingle.mockResolvedValue({ data: { ...SIGNAL_DATA, status }, error: null })
      const res = await PATCH(makeRequest({ status }), { params: Promise.resolve({ id: 'sig-123' }) })
      expect(res.status).toBe(200)
    }
  })

  it('sets archived_at when status is archived', async () => {
    mockSingle.mockResolvedValue({ data: { ...SIGNAL_DATA, status: 'archived' }, error: null })
    await PATCH(makeRequest({ status: 'archived' }), { params: Promise.resolve({ id: 'sig-123' }) })
    expect(mockUpdateData).toHaveProperty('archived_at')
    expect(mockUpdateData?.status).toBe('archived')
  })

  it('sets dispatched_to when dispatching', async () => {
    await PATCH(
      makeRequest({ status: 'dispatched', dispatched_to: 'research' }),
      { params: Promise.resolve({ id: 'sig-123' }) }
    )
    expect(mockUpdateData?.dispatched_to).toBe('research')
  })

  it('returns 500 when update fails', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const res = await PATCH(makeRequest({ status: 'approved' }), { params: Promise.resolve({ id: 'sig-123' }) })
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('DB error')
  })

  describe('dispatch creates handover_message + gateway_command', () => {
    beforeEach(() => {
      // First call: update signal_items → returns signal data
      // Second call: insert handover_messages → returns handover id
      // Third call: insert gateway_commands → returns ok
      let callCount = 0
      mockSingle.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({ data: SIGNAL_DATA, error: null })
        }
        if (callCount === 2) {
          return Promise.resolve({ data: { id: 'ho-456' }, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })
    })

    it('inserts a handover_message with correct fields', async () => {
      await PATCH(
        makeRequest({ status: 'dispatched', dispatched_to: 'research' }),
        { params: Promise.resolve({ id: 'sig-123' }) }
      )

      const hoInsert = mockInserts.find(i => i.table === 'handover_messages')
      expect(hoInsert).toBeDefined()
      expect(hoInsert!.data).toMatchObject({
        from_agent: 'main',
        to_agent: 'research',
        status: 'sent',
        related_signal_id: 'sig-123',
      })
      expect(hoInsert!.data.content).toContain('Test Signal')
      expect(hoInsert!.data.data).toHaveProperty('signal')
    })

    it('uses correct priority mapping from impact_level', async () => {
      // Test 'critique' → 'urgent'
      let callCount = 0
      mockSingle.mockImplementation(() => {
        callCount++
        if (callCount === 1) return Promise.resolve({ data: { ...SIGNAL_DATA, impact_level: 'critique' }, error: null })
        return Promise.resolve({ data: { id: 'ho-x' }, error: null })
      })
      await PATCH(
        makeRequest({ status: 'dispatched', dispatched_to: 'main' }),
        { params: Promise.resolve({ id: 'sig-123' }) }
      )
      const ho1 = mockInserts.find(i => i.table === 'handover_messages')
      expect(ho1!.data.priority).toBe('urgent')

      // Test 'fort' → 'high'
      mockInserts = []
      callCount = 0
      mockSingle.mockImplementation(() => {
        callCount++
        if (callCount === 1) return Promise.resolve({ data: { ...SIGNAL_DATA, impact_level: 'fort' }, error: null })
        return Promise.resolve({ data: { id: 'ho-y' }, error: null })
      })
      await PATCH(
        makeRequest({ status: 'dispatched', dispatched_to: 'main' }),
        { params: Promise.resolve({ id: 'sig-123' }) }
      )
      const ho2 = mockInserts.find(i => i.table === 'handover_messages')
      expect(ho2!.data.priority).toBe('high')

      // Test 'moyen' → 'normal'
      mockInserts = []
      callCount = 0
      mockSingle.mockImplementation(() => {
        callCount++
        if (callCount === 1) return Promise.resolve({ data: { ...SIGNAL_DATA, impact_level: 'moyen' }, error: null })
        return Promise.resolve({ data: { id: 'ho-z' }, error: null })
      })
      await PATCH(
        makeRequest({ status: 'dispatched', dispatched_to: 'main' }),
        { params: Promise.resolve({ id: 'sig-123' }) }
      )
      const ho3 = mockInserts.find(i => i.table === 'handover_messages')
      expect(ho3!.data.priority).toBe('normal')
    })

    it('inserts a gateway_command with plan-first instructions', async () => {
      await PATCH(
        makeRequest({ status: 'dispatched', dispatched_to: 'research' }),
        { params: Promise.resolve({ id: 'sig-123' }) }
      )

      const cmdInsert = mockInserts.find(i => i.table === 'gateway_commands')
      expect(cmdInsert).toBeDefined()
      expect(cmdInsert!.data).toMatchObject({
        command: 'wake',
        agent_id: 'research',
      })
      const payload = cmdInsert!.data.payload as Record<string, unknown>
      expect(payload.signal_id).toBe('sig-123')
      expect(payload.project_id).toBeDefined()
      expect(payload.message).toContain('[HANDOVER ho-456]')
      expect(payload.message).toContain('Test Signal')
      expect(payload.message).toContain('qualification')
      expect(payload.message).toContain('handover-cli.py message')
      expect(payload.message).toContain('plan_proposal')
      expect(payload.message).toContain('NE PAS exécuter')
    })

    it('creates a project linked to signal and handover', async () => {
      await PATCH(
        makeRequest({ status: 'dispatched', dispatched_to: 'research' }),
        { params: Promise.resolve({ id: 'sig-123' }) }
      )

      const projInsert = mockInserts.find(i => i.table === 'projects')
      expect(projInsert).toBeDefined()
      expect(projInsert!.data).toMatchObject({
        name: 'Test Signal',
        status: 'draft',
        assigned_agent: 'research',
        related_signal_id: 'sig-123',
        related_handover_id: 'ho-456',
        category: 'knowledge',
        priority: 'normal',
      })
    })

    it('does not create handover or command for non-dispatch status', async () => {
      mockSingle.mockResolvedValue({ data: { ...SIGNAL_DATA, status: 'approved' }, error: null })
      await PATCH(makeRequest({ status: 'approved' }), { params: Promise.resolve({ id: 'sig-123' }) })
      expect(mockInserts).toHaveLength(0)
    })

    it('does not create handover when dispatched_to is missing', async () => {
      mockSingle.mockResolvedValue({ data: { ...SIGNAL_DATA, status: 'dispatched' }, error: null })
      await PATCH(makeRequest({ status: 'dispatched' }), { params: Promise.resolve({ id: 'sig-123' }) })
      expect(mockInserts).toHaveLength(0)
    })

    it('still returns success if handover insert fails', async () => {
      let callCount = 0
      mockSingle.mockImplementation(() => {
        callCount++
        if (callCount === 1) return Promise.resolve({ data: SIGNAL_DATA, error: null })
        if (callCount === 2) return Promise.resolve({ data: null, error: { message: 'handover failed' } })
        return Promise.resolve({ data: null, error: null })
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const res = await PATCH(
        makeRequest({ status: 'dispatched', dispatched_to: 'research' }),
        { params: Promise.resolve({ id: 'sig-123' }) }
      )
      expect(res.status).toBe(200)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to create handover message:', expect.anything())
      consoleSpy.mockRestore()
    })
  })

  describe('subcategory update', () => {
    it('includes subcategory in update when provided', async () => {
      await PATCH(
        makeRequest({ status: 'approved', subcategory: 'strategy' }),
        { params: Promise.resolve({ id: 'sig-123' }) }
      )
      expect(mockUpdateData?.subcategory).toBe('strategy')
    })

    it('accepts all valid subcategories', async () => {
      const validSubcategories = ['knowledge', 'strategy', 'outbound_inbound']
      for (const subcategory of validSubcategories) {
        mockSingle.mockResolvedValue({ data: { ...SIGNAL_DATA, subcategory }, error: null })
        const res = await PATCH(
          makeRequest({ status: 'approved', subcategory }),
          { params: Promise.resolve({ id: 'sig-123' }) }
        )
        expect(res.status).toBe(200)
        expect(mockUpdateData?.subcategory).toBe(subcategory)
      }
    })

    it('returns 400 for invalid subcategory', async () => {
      const res = await PATCH(
        makeRequest({ status: 'approved', subcategory: 'invalid_cat' }),
        { params: Promise.resolve({ id: 'sig-123' }) }
      )
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toContain('Invalid subcategory')
    })

    it('does not include subcategory when not provided', async () => {
      await PATCH(
        makeRequest({ status: 'approved' }),
        { params: Promise.resolve({ id: 'sig-123' }) }
      )
      expect(mockUpdateData).not.toHaveProperty('subcategory')
    })
  })
})
