import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { DepartmentWorkspacePage } from './DepartmentWorkspacePage'

const mocks = vi.hoisted(() => ({
  portfolio: vi.fn(),
  reviews: vi.fn(),
  supervisors: vi.fn(),
  academic: vi.fn(),
  urgent: vi.fn(),
}))

vi.mock('../../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { accessToken: 'department-token' } }) }))
vi.mock('../../../app/context/useAcademicWorkflow', () => ({ useAcademicWorkflow: mocks.academic }))
vi.mock('../../dashboard/api/dashboard-api', () => ({ getPortfolioDashboard: mocks.portfolio }))
vi.mock('../../projects/api/project-review-api', () => ({ getReviewQueue: mocks.reviews }))
vi.mock('../../supervisors/api/supervisor-api', () => ({ list: mocks.supervisors }))
vi.mock('../../calendar/action-aggregators-api', () => ({ getDepartmentUrgentActions: mocks.urgent }))

beforeEach(() => { mocks.urgent.mockResolvedValue({ departmentId: 2, totalCount: 0, hasMore: false, items: [], asOfUtc: '' }) })
afterEach(() => { cleanup(); vi.clearAllMocks() })

const academic = { status: 'ready', academic: { selectedSemester: { id: 3 }, departments: [{ id: 2, code: 'SE', name: 'Software Engineering', isActive: true }], periods: [{ id: 4, code: 'REVIEW', name: 'Project review', periodType: 'PROJECT_REVIEW', status: 'ACTIVE', startAtUtc: '2026-10-01T00:00:00Z', endAtUtc: '2026-10-31T00:00:00Z', isOpen: true }] } }
const reviewPage = { items: [{ id: 9, teamId: 1, teamName: 'Team One', code: 'P-09', title: 'Scoped project', status: 'UNDER_REVIEW', createdAt: '', submittedAt: null, majors: [{ majorCode: 'SE', majorName: 'Software Engineering' }] }], page: 1, pageSize: 5, totalCount: 1, totalPages: 1 }
const portfolio = { asOfUtc: '', departmentId: 2, summary: { totalProjects: 1, projectStates: [], majors: [], supervisors: [], riskLevels: [] }, projects: { ...reviewPage, items: [{ id: 9, code: 'P-09', title: 'Scoped project', status: 'ACTIVE', teamId: 1, semesterId: 3, pendingProgressReviews: 1, analysis: { dataStatus: 'READY', riskLevel: 'MEDIUM', trendStatus: 'AT_RISK', progressSummary: { progressPercentage: 50, overdueTasks: 1, blockedTasks: 1 } }, departmentId: 2, departmentName: 'Software Engineering', majors: [], supervisor: null }] } }
const supervisors = { items: [{ id: 4, userId: 11, fullName: 'Lecturer One', departmentId: 2, departmentName: 'Software Engineering', bio: null, isAvailable: true, expertise: [] }], page: 1, pageSize: 5, totalCount: 1 }

function LocationProbe() { const location = useLocation(); return <output data-testid="location-search">{location.search}</output> }
function renderPage(entry = '/') { return render(<MemoryRouter initialEntries={[entry]}><DepartmentWorkspacePage /><LocationProbe /></MemoryRouter>) }

describe('DepartmentWorkspacePage', () => {
  it('reads the urgent count from the scoped department endpoint', async () => {
    mocks.academic.mockReturnValue(academic)
    mocks.reviews.mockResolvedValue(reviewPage); mocks.portfolio.mockResolvedValue(portfolio); mocks.supervisors.mockResolvedValue(supervisors)
    mocks.urgent.mockResolvedValue({ departmentId: 2, totalCount: 7, hasMore: true, items: [], asOfUtc: '' })
    renderPage()
    await waitFor(() => expect(mocks.urgent).toHaveBeenCalledWith(2))
    expect(within(screen.getByRole('list', { name: 'Chỉ số tổng quan' })).getByText('7')).toBeTruthy()
  })

  it('does not guess a department scope when none is available', async () => {
    mocks.academic.mockReturnValue({ ...academic, academic: { ...academic.academic, departments: [] } })
    mocks.reviews.mockResolvedValue(reviewPage); mocks.portfolio.mockResolvedValue(portfolio); mocks.supervisors.mockResolvedValue(supervisors)
    renderPage()
    expect(await screen.findByText('Chưa xác định được bộ môn từ phiên đăng nhập. Không truy vấn phạm vi khác.')).toBeTruthy()
    expect(mocks.urgent).not.toHaveBeenCalled()
  })

  it('restores portfolio filters from the URL and updates it when filters change', async () => {
    mocks.academic.mockReturnValue(academic)
    mocks.reviews.mockResolvedValue(reviewPage); mocks.portfolio.mockResolvedValue(portfolio); mocks.supervisors.mockResolvedValue(supervisors)
    mocks.urgent.mockResolvedValue({ departmentId: 2, totalCount: 0, hasMore: false, items: [], asOfUtc: '' })
    renderPage('/?q=Scoped&status=ARCHIVED')
    await waitFor(() => expect(mocks.portfolio).toHaveBeenCalledWith('department', expect.objectContaining({ search: 'Scoped', status: 'ARCHIVED' })))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm đồ án' }), { target: { value: 'Team' } })
    expect(screen.getByTestId('location-search').textContent).toContain('q=Team')
  })

  it('explains why archived projects block the selection bar', async () => {
    mocks.academic.mockReturnValue(academic)
    mocks.reviews.mockResolvedValue(reviewPage); mocks.portfolio.mockResolvedValue({ ...portfolio, projects: { ...portfolio.projects, items: [{ ...portfolio.projects.items[0], status: 'ARCHIVED' }] } }); mocks.supervisors.mockResolvedValue(supervisors)
    mocks.urgent.mockResolvedValue({ departmentId: 2, totalCount: 0, hasMore: false, items: [], asOfUtc: '' })
    renderPage()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Chọn P-09' }))
    const bar = screen.getByRole('region', { name: 'Các mục đang chọn' })
    expect(bar.getAttribute('data-tone')).toBe('attention')
    expect(bar.textContent).toContain('Đã lưu trữ')
  })
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
