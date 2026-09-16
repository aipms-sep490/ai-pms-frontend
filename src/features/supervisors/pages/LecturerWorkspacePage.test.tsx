import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LecturerWorkspacePage } from './LecturerWorkspacePage'

const inbox = vi.hoisted(() => ({ useSupervisorInbox: vi.fn() }))
vi.mock('../hooks/useSupervisorInbox', () => inbox)
afterEach(() => { cleanup(); vi.clearAllMocks() })

const request = { id: 8, projectId: 9, supervisorProfileId: 4, requestedBy: 2, status: 'PENDING', requestedAt: '2026-09-15', requestMessage: 'Please supervise' }
const state = (overrides: Record<string, unknown> = {}) => ({ requests: [request], assignments: [], loading: false, acceptPending: null, rejectPending: null, error: null, refresh: vi.fn(), respond: vi.fn().mockResolvedValue(true), ...overrides })

describe('LecturerWorkspacePage', () => {
  it('uses the backend-scoped inbox response and sends an explicit accept decision', () => {
    const hook = state()
    inbox.useSupervisorInbox.mockReturnValue(hook)
    vi.stubGlobal('confirm', vi.fn(() => true))
    render(<MemoryRouter><LecturerWorkspacePage /></MemoryRouter>)
    expect(screen.getByText(/Backend chỉ trả/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Phản hồi (tùy chọn)'), { target: { value: 'Accepted' } })
    fireEvent.click(screen.getByText('Accept & assign'))
    expect(hook.respond).toHaveBeenCalledWith(request, 'accept', 'Accepted')
  })

  it('shows an empty Backend inbox and a distinct forbidden response', () => {
    inbox.useSupervisorInbox.mockReturnValue(state({ requests: [], error: { kind: 'forbidden', message: 'Backend từ chối quyền Inbox hoặc request scope.' } }))
    render(<MemoryRouter><LecturerWorkspacePage /></MemoryRouter>)
    expect(screen.getByRole('alert').textContent).toContain('Inbox')
    expect(screen.getByText(/Không có yêu cầu/)).toBeTruthy()
  })

  it('offers an ACTIVE workspace only for a current primary assignment', () => {
    inbox.useSupervisorInbox.mockReturnValue(state({ requests: [], assignments: [{ id: 3, projectId: 9, isPrimary: true, assignedAt: '2026-09-15' }] }))
    render(<MemoryRouter><LecturerWorkspacePage /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Mở Project ACTIVE' }).getAttribute('href')).toBe('/supervisor/projects/9/workspace')
  })
})
