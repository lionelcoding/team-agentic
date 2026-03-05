import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock useGatewayCommand
vi.mock('@/hooks/useGatewayCommand', () => ({
  useGatewayCommand: () => ({
    sendCommand: vi.fn(),
    isLoading: false,
    status: null,
    error: null,
  }),
}))

// Track realtime callback
let realtimeCallback: ((payload: Record<string, unknown>) => void) | null = null

const mockChannel = {
  on: vi.fn().mockImplementation((_event: string, _filter: unknown, cb: (payload: Record<string, unknown>) => void) => {
    realtimeCallback = cb
    return mockChannel
  }),
  subscribe: vi.fn().mockReturnThis(),
}

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'main',
            name: 'Morpheus',
            role: 'Principal',
            status: 'idle',
            enabled: true,
            model: 'anthropic/claude-sonnet-4-20250514',
            workspace_path: '/root/clawd',
            personas: [],
            description: 'Main agent',
            tags: ['principal'],
            memory_size_tokens: 0,
            daily_notes_count: 0,
            tokens_used: 0,
            tasks_count: 0,
            tasks_failed: 0,
            last_action: null,
            last_action_at: null,
            created_at: '2025-01-01',
          },
        ],
        error: null,
      }),
    })),
  })),
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

import AgentsPage from '@/app/(dashboard)/agents/page'

describe('AgentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    realtimeCallback = null
  })

  it('renders the create agent button', async () => {
    render(<AgentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Creer un agent')).toBeInTheDocument()
    })
  })

  it('create button links to /agents/new', async () => {
    render(<AgentsPage />)

    await waitFor(() => {
      const link = screen.getByText('Creer un agent').closest('a')
      expect(link).toHaveAttribute('href', '/agents/new')
    })
  })

  it('renders agents from DB', async () => {
    render(<AgentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Morpheus')).toBeInTheDocument()
      expect(screen.getByText('Principal')).toBeInTheDocument()
    })
  })

  it('handles INSERT realtime event', async () => {
    render(<AgentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Morpheus')).toBeInTheDocument()
    })

    // Simulate INSERT event
    realtimeCallback?.({
      eventType: 'INSERT',
      new: {
        id: 'new-agent',
        name: 'New Agent',
        role: 'Testing',
        status: 'provisioning',
        enabled: true,
        model: 'anthropic/claude-sonnet-4-20250514',
        workspace_path: '/root/clawd-eagle/new-agent',
        personas: [],
        description: null,
        tags: [],
        memory_size_tokens: 0,
        daily_notes_count: 0,
        tokens_used: 0,
        tasks_count: 0,
        tasks_failed: 0,
        last_action: null,
        last_action_at: null,
        created_at: '2025-03-05',
      },
      old: {},
    })

    await waitFor(() => {
      expect(screen.getByText('New Agent')).toBeInTheDocument()
      expect(screen.getByText('Provisioning')).toBeInTheDocument()
    })
  })

  it('handles DELETE realtime event', async () => {
    render(<AgentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Morpheus')).toBeInTheDocument()
    })

    // Simulate DELETE event
    realtimeCallback?.({
      eventType: 'DELETE',
      new: {},
      old: { id: 'main' },
    })

    await waitFor(() => {
      expect(screen.queryByText('Morpheus')).not.toBeInTheDocument()
    })
  })

  it('handles UPDATE realtime event', async () => {
    render(<AgentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Disponible')).toBeInTheDocument()
    })

    // Simulate UPDATE event
    realtimeCallback?.({
      eventType: 'UPDATE',
      new: {
        id: 'main',
        name: 'Morpheus',
        role: 'Principal',
        status: 'working',
        enabled: true,
        model: 'anthropic/claude-sonnet-4-20250514',
        workspace_path: '/root/clawd',
        personas: [],
        description: 'Main agent',
        tags: ['principal'],
        memory_size_tokens: 0,
        daily_notes_count: 0,
        tokens_used: 0,
        tasks_count: 0,
        tasks_failed: 0,
        last_action: null,
        last_action_at: null,
        created_at: '2025-01-01',
      },
      old: {},
    })

    await waitFor(() => {
      expect(screen.getByText('En cours')).toBeInTheDocument()
    })
  })
})
