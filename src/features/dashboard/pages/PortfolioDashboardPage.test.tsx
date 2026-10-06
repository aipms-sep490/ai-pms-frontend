import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { PortfolioDashboardPage } from './PortfolioDashboardPage'

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
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<MemoryRouter><PortfolioDashboardPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu trữ' }))
    await waitFor(() => expect(api.archiveProject).toHaveBeenCalledWith(7, null))
  })
})

it('provides the admin dashboard without department workflow links or mutations', async () => {
  api.getWorkspaceRole.mockReturnValue('admin')
  render(<MemoryRouter><PortfolioDashboardPage /></MemoryRouter>)
  await screen.findByText(/Portfolio contract/)
  expect(api.getPortfolioDashboard).toHaveBeenCalledWith('admin', { page: 1, pageSize: 20 })
  expect(screen.queryByRole('link', { name: 'Xem' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Tệp' })).toBeNull()
  expect(api.getReviewActions).not.toHaveBeenCalled()
})
