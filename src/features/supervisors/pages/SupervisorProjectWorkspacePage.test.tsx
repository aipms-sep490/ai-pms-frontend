import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SupervisorProjectWorkspacePage } from './SupervisorProjectWorkspacePage'

const access = vi.hoisted(() => ({ useExecutionAccess: vi.fn() }))
const operational = vi.hoisted(() => ({ useSupervisorOperationalSummary: vi.fn() }))
const review = vi.hoisted(() => ({ useSupervisorProgressReview: vi.fn() }))
vi.mock('../../execution/context/ExecutionAccessContext', () => access)
vi.mock('../hooks/useSupervisorOperationalSummary', () => operational)
vi.mock('../hooks/useSupervisorProgressReview', () => review)

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
  it('renders a read-oriented supervision workspace without student-leader controls', () => {
    access.useExecutionAccess.mockReturnValue({ project: { id: 9, code: 'SE-09', title: 'AI-PMS', status: 'ACTIVE', teamName: 'Team Alpha' }, supervisor: { supervisorName: 'Dr. Lan' }, routeBase: '/supervisor/projects/9' })
    operational.useSupervisorOperationalSummary.mockReturnValue(state())
    review.useSupervisorProgressReview.mockReturnValue({ attention: ready({ overdueTasks: [{ id: 1 }], blockedTasks: [{ id: 2 }] }), reload: vi.fn() })
    render(<MemoryRouter><SupervisorProjectWorkspacePage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Không gian vận hành của GVHD' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '2 báo cáo SUBMITTED' }).getAttribute('href')).toBe('/supervisor/projects/9/progress')
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
