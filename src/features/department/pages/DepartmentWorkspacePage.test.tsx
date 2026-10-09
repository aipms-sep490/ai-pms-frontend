import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { DepartmentWorkspacePage } from './DepartmentWorkspacePage'

const mocks = vi.hoisted(() => ({
  portfolio: vi.fn(),
  reviews: vi.fn(),
  supervisors: vi.fn(),
  academic: vi.fn(),
}))

vi.mock('../../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { accessToken: 'department-token' } }) }))
vi.mock('../../../app/context/useAcademicWorkflow', () => ({ useAcademicWorkflow: mocks.academic }))
vi.mock('../../dashboard/api/dashboard-api', () => ({ getPortfolioDashboard: mocks.portfolio }))
vi.mock('../../projects/api/project-review-api', () => ({ getReviewQueue: mocks.reviews }))
vi.mock('../../supervisors/api/supervisor-api', () => ({ list: mocks.supervisors }))

afterEach(() => { cleanup(); vi.clearAllMocks() })

const academic = { status: 'ready', academic: { selectedSemester: { id: 3 }, departments: [{ id: 2, code: 'SE', name: 'Software Engineering', isActive: true }], periods: [{ id: 4, code: 'REVIEW', name: 'Project review', periodType: 'PROJECT_REVIEW', status: 'ACTIVE', startAtUtc: '2026-10-01T00:00:00Z', endAtUtc: '2026-10-31T00:00:00Z', isOpen: true }] } }
const reviewPage = { items: [{ id: 9, teamId: 1, teamName: 'Team One', code: 'P-09', title: 'Scoped project', status: 'UNDER_REVIEW', createdAt: '', submittedAt: null, majors: [{ majorCode: 'SE', majorName: 'Software Engineering' }] }], page: 1, pageSize: 5, totalCount: 1, totalPages: 1 }
const portfolio = { asOfUtc: '', departmentId: 2, summary: { totalProjects: 1, projectStates: [], majors: [], supervisors: [], riskLevels: [] }, projects: { ...reviewPage, items: [{ id: 9, code: 'P-09', title: 'Scoped project', status: 'ACTIVE', teamId: 1, semesterId: 3, pendingProgressReviews: 1, analysis: { dataStatus: 'READY', riskLevel: 'MEDIUM', trendStatus: 'AT_RISK', progressSummary: { progressPercentage: 50, overdueTasks: 1, blockedTasks: 1 } }, departmentId: 2, departmentName: 'Software Engineering', majors: [], supervisor: null }] } }
const supervisors = { items: [{ id: 4, userId: 11, fullName: 'Lecturer One', departmentId: 2, departmentName: 'Software Engineering', bio: null, isAvailable: true, expertise: [] }], page: 1, pageSize: 5, totalCount: 1 }

function renderPage() { return render(<MemoryRouter><DepartmentWorkspacePage /></MemoryRouter>) }

describe('DepartmentWorkspacePage', () => {
  it('does not present upcoming periods as closed and labels academic period types', async () => {
    mocks.academic.mockReturnValue({ ...academic, academic: { ...academic.academic, periods: [{ ...academic.academic.periods[0], periodType: 'FINAL_SUBMISSION', status: 'UPCOMING', isOpen: false }] } })
    mocks.reviews.mockResolvedValue(reviewPage); mocks.portfolio.mockResolvedValue(portfolio); mocks.supervisors.mockResolvedValue(supervisors)
    renderPage()
    expect(await screen.findByText('Sắp diễn ra')).toBeDefined()
    expect(screen.getByText('Bàn giao cuối kỳ')).toBeDefined()
    expect(screen.queryByText('Đã đóng')).toBeNull()
  })

  it('distinguishes an active period outside its opening window from closed status', async () => {
    mocks.academic.mockReturnValue({ ...academic, academic: { ...academic.academic, periods: [{ ...academic.academic.periods[0], isOpen: false }] } })
    mocks.reviews.mockResolvedValue(reviewPage); mocks.portfolio.mockResolvedValue(portfolio); mocks.supervisors.mockResolvedValue(supervisors)
    renderPage()
    expect(await screen.findByText('Ngoài thời gian mở')).toBeDefined()
    expect(screen.queryByText('Đã đóng')).toBeNull()
  })
  it('composes published Department reads and keeps project review as the authority route', async () => {
    mocks.academic.mockReturnValue(academic)
    mocks.reviews.mockResolvedValue(reviewPage)
    mocks.portfolio.mockResolvedValue(portfolio)
    mocks.supervisors.mockResolvedValue(supervisors)

    renderPage()

    expect(await screen.findByText('Quản lý đồ án bộ môn')).toBeDefined()
    expect((await screen.findAllByText(/Scoped project/)).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Xem thẩm định' })[0].getAttribute('href')).toBe('/department/projects/review/9')
    expect(screen.queryByRole('button', { name: /approve|publish|assign/i })).toBeNull()
  })

  it('isolates an unavailable portfolio from review, supervisor and policy reads', async () => {
    mocks.academic.mockReturnValue(academic)
    mocks.reviews.mockResolvedValue(reviewPage)
    mocks.portfolio.mockRejectedValue(new HttpError('Unavailable', 503))
    mocks.supervisors.mockResolvedValue(supervisors)

    renderPage()

    expect((await screen.findAllByText('Dịch vụ hiện tạm thời không khả dụng.')).length).toBeGreaterThan(0)
    expect(await screen.findByText('Chờ thẩm định')).toBeDefined()
    expect(screen.getByText('Project review')).toBeDefined()
  })
})
