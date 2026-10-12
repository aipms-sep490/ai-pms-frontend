import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { ActorDashboardCard } from './ActorDashboardCard'

const mocks = vi.hoisted(() => ({ getActorDashboard: vi.fn() }))
vi.mock('../api/dashboard-api', () => ({ getActorDashboard: mocks.getActorDashboard }))

afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('ActorDashboardCard', () => {
  it('renders the cross-role metrics once loaded', async () => {
    mocks.getActorDashboard.mockResolvedValue({
      asOfUtc: '2026-10-12T00:00:00Z', projectCount: 3, openTasks: 5, overdueTasks: 1, pendingEvaluations: 2,
      unreadNotifications: 4, activeAccounts: null, scope: 'ACTOR_ASSIGNMENTS', complete: true,
    })
    render(<ActorDashboardCard />)
    expect(await screen.findByText('Tổng quan nhanh · Phạm vi của bạn')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.queryByText('Số liệu chưa đầy đủ')).toBeNull()
    expect(screen.queryByText('Tài khoản hoạt động')).toBeNull()
  })

  it('shows the active-accounts metric and an incomplete-data caveat for a platform-scoped admin', async () => {
    mocks.getActorDashboard.mockResolvedValue({
      asOfUtc: '2026-10-12T00:00:00Z', projectCount: 0, openTasks: 0, overdueTasks: 0, pendingEvaluations: 0,
      unreadNotifications: 0, activeAccounts: 42, scope: 'PLATFORM', complete: false,
    })
    render(<ActorDashboardCard />)
    expect(await screen.findByText('Tổng quan nhanh · Toàn hệ thống')).toBeTruthy()
    expect(screen.getByText('Số liệu chưa đầy đủ')).toBeTruthy()
    expect(screen.getByText('42')).toBeTruthy()
  })

  it('renders nothing when the summary fails to load, so it never blocks the role-specific dashboard', async () => {
    mocks.getActorDashboard.mockRejectedValue(new Error('boom'))
    const { container } = render(<ActorDashboardCard />)
    await waitFor(() => expect(container.firstChild).toBeNull())
  })
})
