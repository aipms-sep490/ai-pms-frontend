import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LecturerWorkspacePage } from './LecturerWorkspacePage'

const inbox = vi.hoisted(() => ({ useSupervisorInbox: vi.fn() }))
const summaries = vi.hoisted(() => ({ useSupervisorProjectSummaries: vi.fn() }))
vi.mock('../hooks/useSupervisorInbox', () => inbox)
vi.mock('../hooks/useSupervisorProjectSummaries', () => summaries)
afterEach(() => { cleanup(); vi.clearAllMocks() })

const request = { id: 8, projectId: 9, supervisorProfileId: 4, requestedBy: 2, status: 'PENDING', requestedAt: '2026-09-15', requestMessage: 'Please supervise' }
const state = (overrides: Record<string, unknown> = {}) => ({ requests: [request], assignments: [], projects: { 9: { id: 9, title: 'Project', status: 'ACTIVE' } }, loading: false, acceptPending: null, rejectPending: null, error: null, refresh: vi.fn(), respond: vi.fn().mockResolvedValue(true), ...overrides })

describe('LecturerWorkspacePage', () => {
  beforeEach(() => { summaries.useSupervisorProjectSummaries.mockReturnValue({}) })
  it('waits for the in-app confirmation before sending an accept decision', async () => {
    const hook = state()
    inbox.useSupervisorInbox.mockReturnValue(hook)
    vi.stubGlobal('confirm', vi.fn(() => true))
    render(<MemoryRouter><LecturerWorkspacePage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Hướng dẫn đồ án' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Phản hồi (tùy chọn)'), { target: { value: 'Accepted' } })
    fireEvent.click(screen.getByText('Nhận hướng dẫn'))
    expect(hook.respond).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Nhận hướng dẫn' }))
    await waitFor(() => expect(hook.respond).toHaveBeenCalledWith(request, 'accept', 'Accepted'))
    expect(globalThis.confirm).not.toHaveBeenCalled()
  })

  it('uses the project major name for request members instead of exposing the major id', () => {
    inbox.useSupervisorInbox.mockReturnValue(state({
      projects: { 9: { id: 9, title: 'Project', status: 'ACTIVE', teamId: 21, majors: [{ majorId: 3, majorName: 'V5 Information Technology' }] } },
      teams: { 21: { id: 21, name: 'Nhóm 1', code: 'SE28', members: [{ userId: 2, fullName: 'Leader', majorId: 3, isLeader: true }] } },
    }))
    render(<MemoryRouter><LecturerWorkspacePage /></MemoryRouter>)
    expect(screen.getByText(/V5 Information Technology/)).toBeTruthy()
    expect(screen.queryByText(/Chuyên ngành #3/)).toBeNull()
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
    expect(screen.getByRole('link', { name: 'Tổng quan đồ án' }).getAttribute('href')).toBe('/supervisor/projects/9/workspace')
    for (const [name, path] of [['Công việc', 'tasks'], ['Báo cáo tiến độ', 'reports'], ['Lịch họp', 'meetings'], ['Hạng mục cần nộp', 'deliverables']]) {
      expect(screen.getByRole('link', { name }).getAttribute('href')).toBe('/supervisor/projects/9/' + path)
    }
  })

  it('shows the roster only for a project assigned to this supervisor', () => {
    inbox.useSupervisorInbox.mockReturnValue(state({ requests: [], assignments: [{ id: 3, projectId: 9, isPrimary: true, assignedAt: '2026-09-15' }], projects: { 9: { id: 9, title: 'Project', teamId: 21, status: 'ACTIVE' } }, teams: { 21: { id: 21, name: 'Nhóm 1', members: [{ userId: 2, fullName: 'Nguyễn An', isLeader: true }] }, 22: { id: 22, name: 'Nhóm khác', members: [{ userId: 3, fullName: 'Nguyễn Bình', isLeader: false }] } } }))
    render(<MemoryRouter><LecturerWorkspacePage /></MemoryRouter>)
    expect(screen.getByText('Nhóm sinh viên:', { exact: false }).textContent).toContain('1 thành viên')
    fireEvent.click(screen.getByText('Thành viên nhóm được phân công'))
    expect(screen.getByText('Nguyễn An')).toBeTruthy()
    expect(screen.queryByText('Nguyễn Bình')).toBeNull()
  })

  it('shows one project card for primary and discipline mentor assignments on the same project', () => {
    inbox.useSupervisorInbox.mockReturnValue(state({ requests: [], assignments: [
      { id: 3, projectId: 9, isPrimary: true, assignedAt: '2026-09-15' },
      { id: 4, projectId: 9, isPrimary: false, assignmentType: 'DISCIPLINE_MENTOR', majorId: 3, assignedAt: '2026-09-16' },
    ], projects: { 9: { id: 9, title: 'Project', code: 'PRJ-9', teamId: 21, status: 'ACTIVE', majors: [{ majorId: 3, majorName: 'Công nghệ thông tin' }] } } }))
    render(<MemoryRouter><LecturerWorkspacePage /></MemoryRouter>)
    expect(screen.getAllByRole('heading', { name: 'Project' })).toHaveLength(1)
    expect(screen.getByText('2 phạm vi hướng dẫn', { exact: false })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Tổng quan đồ án' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Mở hướng dẫn chuyên ngành' }).getAttribute('href')).toBe('/mentor/projects/9/majors/3/workspace')
  })

  it('does not synthesize an ACTIVE route from an assignment when the refreshed project is not ACTIVE', () => {
    inbox.useSupervisorInbox.mockReturnValue(state({ requests: [], projects: { 9: { id: 9, title: 'Project', status: 'SUPERVISOR_PENDING' } }, assignments: [{ id: 3, projectId: 9, isPrimary: true, assignedAt: '2026-09-15' }] }))
    render(<MemoryRouter><LecturerWorkspacePage /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: 'Tổng quan đồ án' })).toBeNull()
  })

  it('explains an unreadable project without falsely saying the assignment ended', () => {
    inbox.useSupervisorInbox.mockReturnValue(state({ requests: [], projects: {}, assignments: [{ id: 3, projectId: 9, isPrimary: true, assignedAt: '2026-09-15', endedAt: null }] }))
    render(<MemoryRouter><LecturerWorkspacePage /></MemoryRouter>)
    expect(screen.getByText(/Chưa tải được trạng thái đồ án/)).toBeTruthy()
    expect(screen.queryByText('Phân công hướng dẫn đã kết thúc.')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Tổng quan đồ án' })).toBeNull()
  })

  it('keeps a project card usable when an individual summary resource fails', () => {
    summaries.useSupervisorProjectSummaries.mockReturnValue({ 9: { progress: { state: 'error', message: 'Chưa tải được tiến độ.' }, attention: { state: 'ready', data: { overdue: 1, blocked: 2 } }, meetings: { state: 'loading' }, reports: { state: 'ready', data: { count: 3 } } } })
    inbox.useSupervisorInbox.mockReturnValue(state({ requests: [], assignments: [{ id: 3, projectId: 9, isPrimary: true, assignedAt: '2026-09-15' }] }))
    render(<MemoryRouter><LecturerWorkspacePage /></MemoryRouter>)
    expect(screen.getByText('Chưa tải được tiến độ.')).toBeTruthy()
    expect(screen.getByText('1 quá hạn · 2 vướng mắc')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Tổng quan đồ án' })).toBeTruthy()
  })
})
