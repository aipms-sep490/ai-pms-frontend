import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LecturerWorkspacePage } from './LecturerWorkspacePage'

const inbox = vi.hoisted(() => ({ useSupervisorInbox: vi.fn() }))
vi.mock('../hooks/useSupervisorInbox', () => inbox)
afterEach(() => { cleanup(); vi.clearAllMocks() })

const request = { id: 8, projectId: 9, supervisorProfileId: 4, requestedBy: 2, status: 'PENDING', requestedAt: '2026-09-15', requestMessage: 'Please supervise' }
const state = (overrides: Record<string, unknown> = {}) => ({ requests: [request], assignments: [], projects: { 9: { id: 9, title: 'Project', status: 'ACTIVE' } }, loading: false, acceptPending: null, rejectPending: null, error: null, refresh: vi.fn(), respond: vi.fn().mockResolvedValue(true), ...overrides })

describe('LecturerWorkspacePage', () => {
  it('waits for the in-app confirmation before sending an accept decision', async () => {
    const hook = state()
    inbox.useSupervisorInbox.mockReturnValue(hook)
    vi.stubGlobal('confirm', vi.fn(() => true))
    render(<MemoryRouter><LecturerWorkspacePage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Bàn làm việc' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Phản hồi (tùy chọn)'), { target: { value: 'Accepted' } })
    fireEvent.click(screen.getByText('Accept & assign'))
    expect(hook.respond).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Nhận hướng dẫn' }))
    await waitFor(() => expect(hook.respond).toHaveBeenCalledWith(request, 'accept', 'Accepted'))
    expect(globalThis.confirm).not.toHaveBeenCalled()
  })

  it('shows an empty Backend inbox and a distinct forbidden response', () => {
    inbox.useSupervisorInbox.mockReturnValue(state({ requests: [], error: { kind: 'forbidden', message: 'Backend từ chối quyền Inbox hoặc request scope.' } }))
    render(<MemoryRouter><LecturerWorkspacePage /></MemoryRouter>)
    expect(screen.getByRole('alert').textContent).toContain('Inbox')
    expect(screen.getByText('Chưa có yêu cầu hướng dẫn.')).toBeTruthy()
  })

  it('offers an ACTIVE workspace only for a current primary assignment', () => {
    inbox.useSupervisorInbox.mockReturnValue(state({ requests: [], assignments: [{ id: 3, projectId: 9, isPrimary: true, assignedAt: '2026-09-15' }] }))
    render(<MemoryRouter><LecturerWorkspacePage /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Mở Project ACTIVE' }).getAttribute('href')).toBe('/supervisor/projects/9/workspace')
  })

  it('does not synthesize an ACTIVE route from an assignment when the refreshed project is not ACTIVE', () => {
    inbox.useSupervisorInbox.mockReturnValue(state({ requests: [], projects: { 9: { id: 9, title: 'Project', status: 'SUPERVISOR_PENDING' } }, assignments: [{ id: 3, projectId: 9, isPrimary: true, assignedAt: '2026-09-15' }] }))
    render(<MemoryRouter><LecturerWorkspacePage /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: 'Mở Project ACTIVE' })).toBeNull()
  })
})
