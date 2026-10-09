import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { PortfolioDashboardPage } from './PortfolioDashboardPage'
import { HttpError } from '../../../services/http/http-client'

const api = vi.hoisted(() => ({ getWorkspaceRole: vi.fn(), getPortfolioDashboard: vi.fn(), exportPortfolioCsv: vi.fn(), archiveProject: vi.fn(), getReviewActions: vi.fn() }))
vi.mock('../../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { accessToken: 'department-token', user: { id: 3, roles: ['DEPARTMENT_STAFF'] } } }) }))
vi.mock('../../auth/utils/role-access', () => ({ getWorkspaceRole: api.getWorkspaceRole }))
vi.mock('../api/dashboard-api', () => ({ getPortfolioDashboard: api.getPortfolioDashboard, exportPortfolioCsv: api.exportPortfolioCsv }))
vi.mock('../../projects/api/archive-project', () => ({ archiveProject: api.archiveProject }))
vi.mock('../../projects/api/project-review-api', () => ({ getReviewActions: api.getReviewActions }))

const dashboard = {
  asOfUtc: '2026-09-28T00:00:00Z', departmentId: 1,
  summary: { totalProjects: 1, projectStates: [{ status: 'ACTIVE', count: 1 }], majors: [{ majorId: 4, code: 'SE', name: 'Software Engineering', projectCount: 1 }], supervisors: [], riskLevels: [{ status: 'LOW', count: 1 }] },
  projects: { items: [{ id: 7, code: 'PRJ-7', title: 'Portfolio contract', status: 'ACTIVE', teamId: 2, semesterId: 1, pendingProgressReviews: 0, departmentId: 1, departmentName: 'SE', majors: [], supervisor: null, analysis: { dataStatus: 'READY', riskLevel: 'LOW', trendStatus: 'STABLE', progressSummary: { progressPercentage: 50, overdueTasks: 0, blockedTasks: 0 } } }], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
}

beforeEach(() => { vi.clearAllMocks(); api.getWorkspaceRole.mockReturnValue('department'); api.getPortfolioDashboard.mockResolvedValue(dashboard); api.getReviewActions.mockResolvedValue({ actions: [{ code: 'archive_project', allowed: false, reasons: ['Chưa đủ điều kiện'] }] }) })
afterEach(cleanup)

it.each([
  [401, 'Phiên đăng nhập đã hết hạn'],
  [403, 'Bạn chưa có quyền'],
  [422, 'vượt giới hạn 10.000 đồ án'],
  [503, 'Dịch vụ hiện tạm thời không khả dụng'],
])('explains export failure %s using the actual error category', async (status, message) => {
  api.exportPortfolioCsv.mockRejectedValue(new HttpError('Export failed', Number(status)))
  render(<MemoryRouter><PortfolioDashboardPage /></MemoryRouter>)
  await screen.findByText(/Portfolio contract/)
  fireEvent.click(screen.getByRole('button', { name: 'Xuất CSV' }))
  expect((await screen.findByRole('alert')).textContent).toContain(message)
  expect(screen.queryByText(/Đã tạo tệp CSV/)).toBeNull()
})

it('prevents duplicate export while a download is pending', async () => {
  api.exportPortfolioCsv.mockReturnValue(new Promise(() => {}))
  render(<MemoryRouter><PortfolioDashboardPage /></MemoryRouter>)
  await screen.findByText(/Portfolio contract/)
  const button = screen.getByRole('button', { name: 'Xuất CSV' })
  fireEvent.click(button); fireEvent.click(button)
  expect(api.exportPortfolioCsv).toHaveBeenCalledTimes(1)
  expect((screen.getByRole('button', { name: 'Đang xuất…' }) as HTMLButtonElement).disabled).toBe(true)
})

describe('PortfolioDashboardPage', () => {
  it('filters the backend portfolio by a returned major without inventing a client dataset', async () => {
    render(<MemoryRouter><PortfolioDashboardPage /></MemoryRouter>)
    await waitFor(() => expect(api.getPortfolioDashboard).toHaveBeenCalledWith('department', { page: 1, pageSize: 20 }))
    expect(screen.getByRole('link', { name: 'Xem' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'SE' }))
    await waitFor(() => expect(api.getPortfolioDashboard).toHaveBeenLastCalledWith('department', { page: 1, pageSize: 20, majorId: 4 }))
  })
  it('offers archive only when the workflow action returned by Backend allows it', async () => {
    api.getPortfolioDashboard.mockResolvedValue({ ...dashboard, projects: { ...dashboard.projects, items: [{ ...dashboard.projects.items[0], status: 'COMPLETED' }] } })
    api.getReviewActions.mockResolvedValue({ actions: [{ code: 'archive_project', allowed: true, reasons: [] }] })
    api.archiveProject.mockResolvedValue({ id: 7 })
    render(<MemoryRouter><PortfolioDashboardPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu trữ' }))
    expect(api.archiveProject).not.toHaveBeenCalled()
    expect(within(screen.getByRole('dialog')).getByText(/PRJ-7/)).toBeTruthy()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận lưu trữ' }))
    await waitFor(() => expect(api.archiveProject).toHaveBeenCalledWith(7, null))
  })
  it('cancels archive without a write, and reloads conflicts without replaying', async () => {
    api.getReviewActions.mockResolvedValue({ actions: [{ code: 'archive_project', allowed: true, reasons: [] }] })
    api.archiveProject.mockRejectedValue(new HttpError('Conflict', 409))
    render(<MemoryRouter><PortfolioDashboardPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu trữ' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hủy' }))
    expect(api.archiveProject).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu trữ' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận lưu trữ' }))
    await screen.findByText(/Đồ án đã thay đổi/)
    expect(api.archiveProject).toHaveBeenCalledTimes(1)
    expect(api.getPortfolioDashboard).toHaveBeenCalledTimes(2)
  })
  it('supports all review states and discards a late response for an older filter', async () => {
    let complete!: (value: typeof dashboard) => void
    api.getPortfolioDashboard.mockReturnValueOnce(new Promise(resolve => { complete = resolve }))
    render(<MemoryRouter><PortfolioDashboardPage /></MemoryRouter>)
    for (const value of ['SUBMITTED', 'REVISION_REQUIRED', 'REJECTED', 'SUPERVISOR_PENDING']) {
      expect(document.querySelector(`option[value="${value}"]`)).toBeTruthy()
    }
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'REVISION_REQUIRED' } })
    await screen.findByText(/Portfolio contract/)
    complete({ ...dashboard, projects: { ...dashboard.projects, items: [{ ...dashboard.projects.items[0], title: 'Stale project' }] } })
    await waitFor(() => expect(screen.queryByText(/Stale project/)).toBeNull())
    expect(api.getPortfolioDashboard).toHaveBeenLastCalledWith('department', expect.objectContaining({ status: 'REVISION_REQUIRED', page: 1 }))
  })
})

it('provides the admin dashboard without department workflow links or mutations', async () => {
  api.getWorkspaceRole.mockReturnValue('admin')
  render(<MemoryRouter><PortfolioDashboardPage /></MemoryRouter>)
  await screen.findByText(/Portfolio contract/)
  expect(api.getPortfolioDashboard).toHaveBeenCalledWith('admin', { page: 1, pageSize: 20 })
  expect(screen.queryByRole('link', { name: 'Xem' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Tệp' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Phương án đánh giá' }).getAttribute('href')).toBe('/admin/projects/7/evaluation-schemes')
  expect(screen.getByRole('link', { name: 'Kết quả' }).getAttribute('href')).toBe('/admin/projects/7/result')
  expect(api.getReviewActions).not.toHaveBeenCalled()
})

it('does not archive a project when the confirmation is cancelled', async () => {
  api.getPortfolioDashboard.mockResolvedValue({ ...dashboard, projects: { ...dashboard.projects, items: [{ ...dashboard.projects.items[0], status: 'COMPLETED' }] } })
  api.getReviewActions.mockResolvedValue({ actions: [{ code: 'archive_project', allowed: true, reasons: [] }] })
  render(<MemoryRouter><PortfolioDashboardPage /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: 'Lưu trữ' }))
  fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
  expect(api.archiveProject).not.toHaveBeenCalled()
})
