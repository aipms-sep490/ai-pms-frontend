import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SupervisorProjectWorkspacePage } from './SupervisorProjectWorkspacePage'

const access = vi.hoisted(() => ({ useExecutionAccess: vi.fn() }))
const operational = vi.hoisted(() => ({ useSupervisorOperationalSummary: vi.fn() }))
const review = vi.hoisted(() => ({ useSupervisorProgressReview: vi.fn() }))
const peer = vi.hoisted(() => ({ panel: vi.fn(() => null) }))
vi.mock('../../execution/context/ExecutionAccessContext', () => access)
vi.mock('../hooks/useSupervisorOperationalSummary', () => operational)
vi.mock('../hooks/useSupervisorProgressReview', () => review)
vi.mock('../../student-collaboration/TeamReflectionPanel', () => ({ TeamReflectionPanel: peer.panel }))

const ready = <T,>(data: T) => ({ state: 'ready' as const, data })
const state = (overrides: Record<string, unknown> = {}) => ({
  meeting: ready({ count: 1, next: { id: 31, title: 'Rà soát tuần', startAt: '2026-10-10T02:00:00Z' } }),
  milestone: ready({ count: 2, current: { title: 'Kiểm thử tích hợp' } }),
  deliverables: ready({ count: 3 }),
  pendingReports: ready({ count: 2 }),
  evaluator: ready(false),
  reload: vi.fn(),
  ...overrides,
})

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('SupervisorProjectWorkspacePage', () => {
  it.each([
    { status: 'ACTIVE', primary: true, endedAt: null, allowed: true },
    { status: 'FINAL_SUBMISSION', primary: true, endedAt: null, allowed: true },
    { status: 'FinalSubmission', primary: true, endedAt: null, allowed: true },
    { status: 'FINAL_SUBMISSION', primary: true, endedAt: '2026-10-01', allowed: false },
    { status: 'FINAL_SUBMISSION', primary: false, endedAt: null, allowed: false },
    { status: 'COMPLETED', primary: true, endedAt: null, allowed: false },
  ])('peer evaluation write is $allowed for $status with primary=$primary and endedAt=$endedAt', ({ status, primary, endedAt, allowed }) => {
    access.useExecutionAccess.mockReturnValue({
      project: { id: 9, code: 'SE-09', title: 'AI-PMS', status },
      supervisor: { assignmentType: primary ? 'PRIMARY' : 'DISCIPLINE_MENTOR', isPrimary: primary, endedAt },
      readOnly: status !== 'ACTIVE', routeBase: '/supervisor/projects/9',
    })
    operational.useSupervisorOperationalSummary.mockReturnValue(state())
    review.useSupervisorProgressReview.mockReturnValue({ attention: ready({ overdueTasks: [], blockedTasks: [] }), reload: vi.fn() })
    render(<MemoryRouter><SupervisorProjectWorkspacePage /></MemoryRouter>)
    expect(peer.panel).toHaveBeenCalledWith(expect.objectContaining({ canManagePeer: allowed }), undefined)
  })
  it('renders a read-oriented supervision workspace without student-leader controls', () => {
    access.useExecutionAccess.mockReturnValue({ project: { id: 9, code: 'SE-09', title: 'AI-PMS', status: 'ACTIVE', teamName: 'Team Alpha' }, supervisor: { supervisorName: 'Dr. Lan' }, routeBase: '/supervisor/projects/9' })
    operational.useSupervisorOperationalSummary.mockReturnValue(state())
    review.useSupervisorProgressReview.mockReturnValue({ attention: ready({ overdueTasks: [{ id: 1 }], blockedTasks: [{ id: 2 }] }), reload: vi.fn() })
    render(<MemoryRouter><SupervisorProjectWorkspacePage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Tổng quan đồ án' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '2 báo cáo chờ phản hồi' }).getAttribute('href')).toBe('/supervisor/projects/9/progress')
    expect(screen.getByRole('link', { name: /Công việc & mốc/ }).getAttribute('href')).toBe('/supervisor/projects/9/tasks')
    expect(screen.getByRole('link', { name: /Kho tệp đồ án/ }).getAttribute('href')).toBe('/supervisor/projects/9/files')
    expect(screen.getByRole('link', { name: /Đóng góp/ }).getAttribute('href')).toBe('/supervisor/projects/9/contributions')
    expect(screen.getByRole('link', { name: /Bàn giao cuối/ }).getAttribute('href')).toBe('/supervisor/projects/9/final-submission')
    expect(screen.queryByRole('button', { name: /tạo công việc|tạo mốc|nộp báo cáo/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /Đánh giá/ })).toBeNull()
  })

  it('shows Evaluation entry only after the Backend-scoped evaluator assignment is present', () => {
    access.useExecutionAccess.mockReturnValue({ project: { id: 9, code: 'SE-09', title: 'AI-PMS', status: 'ACTIVE', teamName: 'Team Alpha' }, supervisor: { supervisorName: 'Dr. Lan' }, routeBase: '/supervisor/projects/9' })
    operational.useSupervisorOperationalSummary.mockReturnValue(state({ evaluator: ready(true) }))
    review.useSupervisorProgressReview.mockReturnValue({ attention: ready({ overdueTasks: [], blockedTasks: [] }), reload: vi.fn() })
    render(<MemoryRouter><SupervisorProjectWorkspacePage /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /Đánh giá/ }).getAttribute('href')).toBe('/evaluator/evaluations')
  })

})
