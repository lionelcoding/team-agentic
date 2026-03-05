import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

import NewAgentPage from '@/app/(dashboard)/agents/new/page'

describe('NewAgentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the form fields', () => {
    render(<NewAgentPage />)

    expect(screen.getByText('Creer un agent')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Content Writer/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('content-writer')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Redaction/)).toBeInTheDocument()
  })

  it('auto-generates slug from name', async () => {
    render(<NewAgentPage />)
    const user = userEvent.setup()

    const nameInput = screen.getByPlaceholderText(/Content Writer/)
    await user.type(nameInput, 'Mon Super Agent')

    const idInput = screen.getByPlaceholderText('content-writer') as HTMLInputElement
    expect(idInput.value).toBe('mon-super-agent')
  })

  it('handles accented characters in slug', async () => {
    render(<NewAgentPage />)
    const user = userEvent.setup()

    const nameInput = screen.getByPlaceholderText(/Content Writer/)
    await user.type(nameInput, 'Agent Éclaireur')

    const idInput = screen.getByPlaceholderText('content-writer') as HTMLInputElement
    expect(idInput.value).toBe('agent-eclaireur')
  })

  it('allows manual id editing', async () => {
    render(<NewAgentPage />)
    const user = userEvent.setup()

    const idInput = screen.getByPlaceholderText('content-writer')
    await user.clear(idInput)
    await user.type(idInput, 'custom-id')

    // Typing in name should no longer override id
    const nameInput = screen.getByPlaceholderText(/Content Writer/)
    await user.type(nameInput, 'Some Name')

    expect((idInput as HTMLInputElement).value).toBe('custom-id')
  })

  it('toggles tags on click', async () => {
    render(<NewAgentPage />)
    const user = userEvent.setup()

    const eagleTag = screen.getByText('eagle')
    await user.click(eagleTag)

    // Tag should appear selected (has ring class via cn)
    expect(eagleTag.closest('button')).toHaveClass('text-blue-400')
  })

  it('toggles the enabled switch', async () => {
    render(<NewAgentPage />)
    const user = userEvent.setup()

    // The toggle button starts as enabled (bg-blue-500)
    const toggles = screen.getAllByRole('button')
    const toggle = toggles.find(b => b.classList.contains('bg-blue-500'))
    expect(toggle).toBeTruthy()

    if (toggle) {
      await user.click(toggle)
      expect(toggle).toHaveClass('bg-slate-700')
    }
  })

  it('shows model select with 3 options', () => {
    render(<NewAgentPage />)

    const select = screen.getByRole('combobox')
    const options = select.querySelectorAll('option')
    expect(options).toHaveLength(3)
    expect(options[0].textContent).toBe('Sonnet 4')
    expect(options[1].textContent).toBe('Opus 4')
    expect(options[2].textContent).toBe('Haiku 4.5')
  })

  it('submits and redirects on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'test-agent', status: 'idle' }),
    })

    render(<NewAgentPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText(/Content Writer/), 'Test Agent')
    await user.type(screen.getByPlaceholderText(/Redaction/), 'Testing role')

    const submitBtn = screen.getByText("Creer l'agent")
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/agents', expect.objectContaining({
        method: 'POST',
      }))
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/agents/test-agent')
    })
  })

  it('shows error on failed submission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Agent existe deja' }),
    })

    render(<NewAgentPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText(/Content Writer/), 'Existing')
    await user.type(screen.getByPlaceholderText(/Redaction/), 'Role')

    const submitBtn = screen.getByText("Creer l'agent")
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Agent existe deja')).toBeInTheDocument()
    })
  })

  it('navigates back when clicking Retour', async () => {
    render(<NewAgentPage />)
    const user = userEvent.setup()

    await user.click(screen.getByText('Retour aux agents'))
    expect(mockPush).toHaveBeenCalledWith('/agents')
  })

  it('shows workspace path preview', async () => {
    render(<NewAgentPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText(/Content Writer/), 'Writer')

    expect(screen.getByText(/\/root\/clawd-eagle\/writer/)).toBeInTheDocument()
  })
})
