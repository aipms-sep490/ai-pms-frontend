import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProjectDefenseManagementPage, ProjectDefensePage } from './ProjectDefensePage'
import { HttpError } from '../../services/http/http-client'
import type { DefenseSession } from './defense-types'

const mocks = vi.hoisted(() => ({
  journey: { project: { id: 9 } as { id: number } | null },
  getProjectDefenseSessions: vi.fn(),
  getDefenseCommittees: vi.fn(),
  createDefenseCommittee: vi.fn(),
  scheduleDefense: vi.fn(),
  cancelDefense: vi.fn(),
}))
vi.mock('../../app/context', () => ({ useStudentJourney: () => mocks.journey }))
vi.mock('./defense-api', () => ({
  getProjectDefenseSessions: mocks.getProjectDefenseSessions,
  getDefenseCommittees: mocks.getDefenseCommittees,
  createDefenseCommittee: mocks.createDefenseCommittee,
  scheduleDefense: mocks.scheduleDefense,
  cancelDefense: mocks.cancelDefense,
}))

const scheduled: DefenseSession = {
  id: 1, projectId: 9, committeeId: 2, startAt: '2026-12-20T02:00:00Z', endAt: '2026-12-20T03:00:00Z',
  room: 'A1.01', status: 'SCHEDULED', concurrencyToken: 'defense-token', cancellationReason: null, canCancel: true,
}

const render_ = () => render(<MemoryRouter><ProjectDefensePage /></MemoryRouter>)
const renderManagement = () => render(<MemoryRouter initialEntries={['/supervisor/projects/9/defense']}><ProjectDefenseManagementPage /></MemoryRouter>)
const paged = (items: DefenseSession[]) => ({ items, page: 1, pageSize: 20, totalCount: items.length, totalPages: 1 })

beforeEach(() => {
  mocks.journey.project = { id: 9 }
  mocks.getDefenseCommittees.mockResolvedValue({ items: [], page: 1, pageSize: 50, totalCount: 0, totalPages: 0 })
})
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

  it('allows cancelling a scheduled session with cancellation reason and token', async () => {
    const { fireEvent, waitFor } = await import('@testing-library/react')
    mocks.getProjectDefenseSessions.mockResolvedValue(paged([scheduled]))
    mocks.cancelDefense.mockResolvedValue({ ...scheduled, status: 'CANCELLED', cancellationReason: 'Thay đổi phòng' })
    render_()

    expect(await screen.findByText(/A1\.01/)).toBeTruthy()
    const cancelBtn = screen.getByRole('button', { name: 'Hủy lịch' })
    fireEvent.click(cancelBtn)

    const reasonInput = screen.getByPlaceholderText(/Điều chỉnh phòng/)
    fireEvent.change(reasonInput, { target: { value: 'Thay đổi phòng' } })

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hủy lịch' }))
    await waitFor(() => {
      expect(mocks.cancelDefense).toHaveBeenCalledWith(1, {
        concurrencyToken: 'defense-token',
        reason: 'Thay đổi phòng',
      })
    })
  })

  it('allows creating a defense committee and scheduling a defense session', async () => {
    const { fireEvent, waitFor } = await import('@testing-library/react')
    mocks.getProjectDefenseSessions.mockResolvedValue(paged([]))
    mocks.getDefenseCommittees.mockResolvedValue({
      items: [{ id: 5, projectId: 9, name: 'Hội đồng KTPM 01', members: [{ userId: 10, majorId: 1 }] }],
      page: 1, pageSize: 50, totalCount: 1, totalPages: 1,
    })
    mocks.createDefenseCommittee.mockResolvedValue({
      id: 6, projectId: 9, name: 'Hội đồng mới', members: [{ userId: 11, majorId: 1 }],
    })
    mocks.scheduleDefense.mockResolvedValue({ ...scheduled, id: 2, committeeId: 5 })

    renderManagement()
    expect(await screen.findByText('Quản lý hội đồng & Lịch bảo vệ (Khoa / Quản trị)')).toBeTruthy()

    // Check loaded committee
    expect((await screen.findAllByText(/Hội đồng KTPM 01/)).length).toBeGreaterThan(0)

    // Create committee
    fireEvent.change(screen.getByPlaceholderText(/Hội đồng bảo vệ/), { target: { value: 'Hội đồng mới' } })
    fireEvent.change(screen.getByPlaceholderText(/User ID/), { target: { value: '11' } })
    fireEvent.change(screen.getByPlaceholderText(/Major ID/), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo hội đồng' }))

    await waitFor(() => {
      expect(mocks.createDefenseCommittee).toHaveBeenCalledWith(9, {
        name: 'Hội đồng mới',
        members: [{ userId: 11, majorId: 1 }],
      })
    })

    // Schedule defense
    fireEvent.change(screen.getByLabelText(/Chọn hội đồng/), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/Phòng bảo vệ/), { target: { value: 'B2.02' } })
    fireEvent.change(screen.getByLabelText(/Thời gian bắt đầu/), { target: { value: '2026-12-25T08:00' } })
    fireEvent.change(screen.getByLabelText(/Thời gian kết thúc/), { target: { value: '2026-12-25T10:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận xếp lịch bảo vệ' }))

    await waitFor(() => {
      expect(mocks.scheduleDefense).toHaveBeenCalledWith(9, {
        committeeId: 5,
        startAt: new Date('2026-12-25T08:00').toISOString(),
        endAt: new Date('2026-12-25T10:00').toISOString(),
        room: 'B2.02',
      })
    })
    expect(await screen.findByText('Xếp lịch bảo vệ thành công.')).toBeTruthy()
  })
})
