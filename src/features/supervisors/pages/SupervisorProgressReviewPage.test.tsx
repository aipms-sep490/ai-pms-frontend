import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SupervisorProgressReviewPage } from './SupervisorProgressReviewPage'

const access = vi.hoisted(() => ({ useExecutionAccess: vi.fn() }))
const review = vi.hoisted(() => ({ useSupervisorProgressReview: vi.fn() }))
vi.mock('../../execution/context/ExecutionAccessContext', () => access)
vi.mock('../hooks/useSupervisorProgressReview', () => review)

const resources = (overrides: Record<string, unknown> = {}) => ({
  summary: { state: 'ready', data: { progressPercentage: 50, doneTasks: 2, totalTasks: 4, completedMilestones: 1, totalMilestones: 2 } },
  attention: { state: 'ready', data: { overdueTasks: [{ id: 1 }], blockedTasks: [{ id: 2 }] } },
  reports: { state: 'ready', data: { totalCount: 1, items: [{ id: 17, projectId: 9, reportType: 'WEEKLY', periodStart: '2026-09-14', periodEnd: '2026-09-20', status: 'SUBMITTED', submittedByName: 'Trưởng nhóm', submittedAt: '2026-09-21T08:00:00Z', summary: 'Hoàn thành API', issuesAndRisks: 'Cần rà soát phân quyền' }] } },
  reload: vi.fn(),
  ...overrides,
})

beforeEach(() => {
  access.useExecutionAccess.mockReturnValue({ project: { id: 9, code: 'SE-09', title: 'AI-PMS' }, routeBase: '/supervisor/projects/9' })
  review.useSupervisorProgressReview.mockReturnValue(resources())
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('SupervisorProgressReviewPage', () => {
  it('renders backend progress and report data with a scoped detail link', () => {
    render(<MemoryRouter><SupervisorProgressReviewPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Theo dõi tiến độ và báo cáo' })).toBeTruthy()
    expect(screen.getByText('1 quá hạn · 1 vướng mắc')).toBeTruthy()
    expect(screen.getByText('Cần rà soát phân quyền')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Đọc và phản hồi' }).getAttribute('href')).toBe('/supervisor/projects/9/reports/17')
    expect(screen.queryByRole('button', { name: /tạo công việc|tạo mốc|nộp cho GVHD/i })).toBeNull()
  })

  it('keeps report review available when an independent progress resource fails', () => {
    review.useSupervisorProgressReview.mockReturnValue(resources({ summary: { state: 'error', message: 'Backend không cấp quyền xem tiến độ của đồ án này.' } }))
    render(<MemoryRouter><SupervisorProgressReviewPage /></MemoryRouter>)
    expect(screen.getByRole('alert').textContent).toContain('không cấp quyền')
    expect(screen.getByRole('link', { name: 'Đọc và phản hồi' })).toBeTruthy()
  })

  it('shows loading and empty report states without manufacturing attention', () => {
    review.useSupervisorProgressReview.mockReturnValue(resources({ summary: { state: 'loading' }, attention: { state: 'loading' }, reports: { state: 'ready', data: { totalCount: 0, items: [] } } }))
    render(<MemoryRouter><SupervisorProgressReviewPage /></MemoryRouter>)
    expect(screen.getAllByRole('status').length).toBeGreaterThan(1)
    expect(screen.getByText('Chưa có báo cáo tiến độ trong phạm vi dữ liệu hiện có.')).toBeTruthy()
  })
})
