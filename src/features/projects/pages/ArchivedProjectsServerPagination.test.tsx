import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ArchivedProjectsPage } from './ArchivedProjectsPage'
import { HttpError } from '../../../services/http/http-client'

const dashboardMocks = vi.hoisted(() => ({ getPortfolioDashboard: vi.fn() }))

vi.mock('../../dashboard/api/dashboard-api', () => dashboardMocks)
vi.mock('../../auth/context/useAuthSession', () => ({
  useAuthSession: () => ({ session: { user: { id: 1, roles: ['DEPARTMENT_STAFF'] } } }),
}))

const makeDashboard = (page: number, totalCount = 105) => ({
  projects: {
    page,
    pageSize: 10,
    totalCount,
    totalPages: Math.ceil(totalCount / 10),
    items: Array.from({ length: 10 }, (_, idx) => ({
      id: (page - 1) * 10 + idx + 1,
      code: `ARC-${(page - 1) * 10 + idx + 1}`,
      title: `Archived Dossier ${(page - 1) * 10 + idx + 1}`,
      status: 'ARCHIVED',
      departmentName: 'Khoa CNTT',
      supervisor: { name: 'TS. Nguyễn Văn A' },
    })),
  },
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

async function flush() {
  await act(async () => {
    await vi.runOnlyPendingTimersAsync()
    await Promise.resolve()
  })
}

describe('ArchivedProjectsPage server pagination (>100 archived projects)', () => {
  it('requests server pages above 100 and forwards debounced search terms', async () => {
    dashboardMocks.getPortfolioDashboard
      .mockResolvedValueOnce(makeDashboard(1, 105))
      .mockResolvedValueOnce(makeDashboard(2, 105))
      .mockResolvedValueOnce(makeDashboard(1, 3))

    render(<MemoryRouter><ArchivedProjectsPage /></MemoryRouter>)
    await flush()
    expect(dashboardMocks.getPortfolioDashboard).toHaveBeenCalledWith('department', {
      status: 'ARCHIVED',
      search: undefined,
      page: 1,
      pageSize: 10,
    })
    expect(screen.getByText('105 đồ án đã lưu trữ trong phạm vi hiện tại.')).toBeTruthy()

    const nextButtons = screen.getAllByRole('button', { name: /Trang sau|Sau/i })
    fireEvent.click(nextButtons[0])
    await flush()
    expect(dashboardMocks.getPortfolioDashboard).toHaveBeenLastCalledWith('department', {
      status: 'ARCHIVED',
      search: undefined,
      page: 2,
      pageSize: 10,
    })

    const searchInput = screen.getByLabelText('Tìm đồ án lưu trữ')
    fireEvent.change(searchInput, { target: { value: 'ARC-105' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(750)
      await Promise.resolve()
    })
    await flush()
    expect(dashboardMocks.getPortfolioDashboard).toHaveBeenLastCalledWith('department', {
      status: 'ARCHIVED',
      search: 'ARC-105',
      page: 1,
      pageSize: 10,
    })
  })

  it('shows 403 error state when archive listing is forbidden', async () => {
    dashboardMocks.getPortfolioDashboard.mockRejectedValueOnce(new HttpError('Forbidden', 403))
    render(<MemoryRouter><ArchivedProjectsPage /></MemoryRouter>)
    await flush()
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Bạn chưa có quyền xem kho lưu trữ này.')
  })
})
