import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProjectDefensePage } from './ProjectDefensePage'
import { HttpError } from '../../services/http/http-client'
import type { DefenseSession } from './defense-types'

const mocks = vi.hoisted(() => ({ journey: { project: { id: 9 } as { id: number } | null }, getProjectDefenseSessions: vi.fn() }))
vi.mock('../../app/context', () => ({ useStudentJourney: () => mocks.journey }))
vi.mock('./defense-api', () => ({ getProjectDefenseSessions: mocks.getProjectDefenseSessions }))

const scheduled: DefenseSession = {
  id: 1, projectId: 9, committeeId: 2, startAt: '2026-12-20T02:00:00Z', endAt: '2026-12-20T03:00:00Z',
  room: 'A1.01', status: 'SCHEDULED', concurrencyToken: 'defense-token', cancellationReason: null, canCancel: true,
}

const render_ = () => render(<MemoryRouter><ProjectDefensePage /></MemoryRouter>)
const paged = (items: DefenseSession[]) => ({ items, page: 1, pageSize: 20, totalCount: items.length, totalPages: 1 })

beforeEach(() => { mocks.journey.project = { id: 9 } })
afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('ProjectDefensePage', () => {
  it('renders the scheduled session time range, room and status without any committee roster', async () => {
    mocks.getProjectDefenseSessions.mockResolvedValue(paged([scheduled]))
    render_()
    expect(await screen.findByText(/A1\.01/)).toBeTruthy()
    expect(screen.getByText('Đã lên lịch')).toBeTruthy()
    expect(screen.queryByText(/Chủ tịch|Thư ký/)).toBeNull()
  })

  it('shows the cancellation reason for a cancelled session', async () => {
    mocks.getProjectDefenseSessions.mockResolvedValue(paged([{ ...scheduled, status: 'CANCELLED', cancellationReason: 'Trùng lịch phòng', canCancel: false }]))
    render_()
    expect(await screen.findByText('Đã hủy')).toBeTruthy()
    expect(screen.getByText(/Trùng lịch phòng/)).toBeTruthy()
  })

  it('shows a not-scheduled message when there are no sessions yet', async () => {
    mocks.getProjectDefenseSessions.mockResolvedValue(paged([]))
    render_()
    expect(await screen.findByText(/chưa được xếp lịch bảo vệ/)).toBeTruthy()
  })

  it('shows a distinct message when access is denied', async () => {
    mocks.getProjectDefenseSessions.mockRejectedValue(new HttpError('forbidden', 403))
    render_()
    expect((await screen.findByRole('alert')).textContent).toContain('chưa có quyền')
  })

  it('handles no active project', async () => {
    mocks.journey.project = null
    render_()
    expect(await screen.findByText(/Không tìm thấy đồ án đang hoạt động/)).toBeTruthy()
    expect(mocks.getProjectDefenseSessions).not.toHaveBeenCalled()
  })
})
