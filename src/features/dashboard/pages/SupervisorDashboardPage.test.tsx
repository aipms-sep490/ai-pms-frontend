import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { SupervisorDashboardPage } from './SupervisorDashboardPage'

const api = vi.hoisted(() => ({ getSupervisorDashboard: vi.fn() }))
vi.mock('../api/dashboard-api', () => ({ getSupervisorDashboard: api.getSupervisorDashboard }))

const dashboard = {
  asOfUtc: '2026-09-28T00:00:00Z',
  workload: { hasProfile: true, isAvailable: true, assignedProjects: 2, profileMaxActiveProjects: 4 },
  projectStates: [{ status: 'ACTIVE', count: 2 }], pendingProgressReviews: 1, overdueTasks: 1,
  projects: { items: [{ id: 7, code: 'PRJ-7', title: 'Dashboard contract', status: 'ACTIVE', teamId: 2, semesterId: 1, pendingProgressReviews: 1, departmentId: 1, departmentName: 'SE', majors: [], supervisor: { userId: 4, name: 'GV A' }, analysis: { dataStatus: 'READY', riskLevel: 'HIGH', trendStatus: 'UP', progressSummary: { progressPercentage: 50, overdueTasks: 1, blockedTasks: 0 } } }], page: 1, pageSize: 20, totalCount: 22, totalPages: 2 },
}

beforeEach(() => { vi.clearAllMocks(); api.getSupervisorDashboard.mockResolvedValue(dashboard) })
afterEach(cleanup)

describe('SupervisorDashboardPage', () => {
  it('uses the backend filter contract for status and pagination', async () => {
    render(<MemoryRouter><SupervisorDashboardPage /></MemoryRouter>)
    await waitFor(() => expect(api.getSupervisorDashboard).toHaveBeenCalledWith({ page: 1, pageSize: 20 }))
    expect(screen.getByRole('link', { name: 'Mở không gian đồ án' })).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'ACTIVE' } })
    await waitFor(() => expect(api.getSupervisorDashboard).toHaveBeenLastCalledWith({ page: 1, pageSize: 20, status: 'ACTIVE' }))
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(api.getSupervisorDashboard).toHaveBeenLastCalledWith({ page: 2, pageSize: 20, status: 'ACTIVE' }))
  })
})
