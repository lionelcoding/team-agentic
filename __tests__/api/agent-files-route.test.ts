import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase server client
const mockSingle = vi.fn()
const mockFrom = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      single: mockSingle,
    })),
  })),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}))

// Mock gateway
const mockExecuteCommand = vi.fn()
vi.mock('@/lib/gateway', () => ({
  executeCommand: (...args: unknown[]) => mockExecuteCommand(...args),
}))

import { GET, PUT } from '@/app/api/agent-files/route'
import { NextRequest } from 'next/server'

describe('GET /api/agent-files', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects missing agent_id', async () => {
    const req = new NextRequest('http://localhost/api/agent-files')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('rejects agent_id not found in DB', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null })

    const req = new NextRequest('http://localhost/api/agent-files?agent_id=unknown')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Invalid agent_id')
  })

  it('accepts dynamically created agent from DB', async () => {
    // Agent exists in DB
    mockSingle.mockResolvedValueOnce({ data: { id: 'dynamic-agent' }, error: null })
    mockExecuteCommand.mockResolvedValueOnce({ files: [{ filename: 'SOUL.md' }] })

    const req = new NextRequest('http://localhost/api/agent-files?agent_id=dynamic-agent')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockExecuteCommand).toHaveBeenCalledWith('list_files', 'dynamic-agent')
  })

  it('reads a specific file for a valid agent', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'main' }, error: null })
    mockExecuteCommand.mockResolvedValueOnce({ filename: 'SOUL.md', content: '# Soul' })

    const req = new NextRequest('http://localhost/api/agent-files?agent_id=main&file=SOUL.md')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockExecuteCommand).toHaveBeenCalledWith('read_file', 'main', { filename: 'SOUL.md' })
  })
})

describe('PUT /api/agent-files', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects agent_id not found in DB', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null })

    const req = new NextRequest('http://localhost/api/agent-files', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: 'unknown', file: 'SOUL.md', content: 'test' }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('writes file for valid agent', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'dynamic-agent' }, error: null })
    mockExecuteCommand.mockResolvedValueOnce({ filename: 'SOUL.md', written: true })

    const req = new NextRequest('http://localhost/api/agent-files', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: 'dynamic-agent', file: 'SOUL.md', content: '# Updated' }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    expect(mockExecuteCommand).toHaveBeenCalledWith('write_file', 'dynamic-agent', {
      filename: 'SOUL.md',
      content: '# Updated',
    })
  })

  it('rejects missing file or content', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'main' }, error: null })

    const req = new NextRequest('http://localhost/api/agent-files', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: 'main' }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/file and content/)
  })
})
