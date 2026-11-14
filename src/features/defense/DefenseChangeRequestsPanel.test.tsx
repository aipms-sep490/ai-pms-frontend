import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DefenseChangeRequestsPanel } from './DefenseChangeRequestsPanel'
import * as api from './defense-api'

vi.mock('./defense-api', () => ({
  getPeriodDefenseChangeRequests: vi.fn(), decideDefenseChangeRequest: vi.fn(), getPeriodDefenseSessions: vi.fn(),
}))
afterEach(() => { cleanup(); vi.clearAllMocks() })

const request: api.DefenseChangeRequestDto = {
  id: 8, defenseSessionId: 40, requesterId: 7, currentRoomId: 2,
  currentStartAt: '2026-12-01T08:00:00+07:00', currentEndAt: '2026-12-01T09:15:00+07:00',
  desiredRoomId: 3, desiredStartAt: '2026-12-02T09:30:00+07:00', desiredEndAt: '2026-12-02T10:45:00+07:00',
  reasonCategory: 'ROOM_FACILITY_ISSUE', reasonDetails: 'Máy chiếu hỏng', evidenceFileUrl: null,
  status: 'PENDING', reviewerId: null, reviewNote: null, reviewedAt: null,
  concurrencyToken: 'request-token', createdAt: '2026-11-30T08:00:00+07:00',
}

it('verifies the decision and the changed official session before success', async () => {
  vi.mocked(api.getPeriodDefenseChangeRequests).mockResolvedValueOnce([request]).mockResolvedValueOnce([{ ...request, status: 'APPROVED' }])
  vi.mocked(api.decideDefenseChangeRequest).mockResolvedValue({ ...request, status: 'APPROVED' })
  vi.mocked(api.getPeriodDefenseSessions).mockResolvedValue([{
    id: 40, projectId: 10, projectCode: 'P10', projectTitle: 'Project', committeeId: 5, committeeName: 'Hội đồng',
    roomId: 3, roomCode: 'B-202', slotNumber: 2, startAt: request.desiredStartAt, endAt: request.desiredEndAt,
    status: 'SCHEDULED', concurrencyToken: 'new', canCancel: true,
  }])
  const changed = vi.fn()
  render(<DefenseChangeRequestsPanel periodId={5} rooms={[{ id: 3, code: 'B-202', building: 'B', floor: 2, capacity: 40, status: 'ACTIVE', concurrencyToken: 'room' }]} onScheduleChanged={changed} />)
  fireEvent.change(await screen.findByLabelText('Ghi chú xử lý'), { target: { value: 'Đồng ý' } })
  fireEvent.click(screen.getByRole('button', { name: 'Duyệt đổi lịch' }))
  await waitFor(() => expect(api.decideDefenseChangeRequest).toHaveBeenCalledWith(8, {
    decision: 'APPROVED', reviewNote: 'Đồng ý', concurrencyToken: 'request-token',
  }))
  expect(await screen.findByText('Đã xác minh lịch bảo vệ mới.')).toBeTruthy()
  expect(changed).toHaveBeenCalledOnce()
})

it('does not claim success when the decision readback differs', async () => {
  vi.mocked(api.getPeriodDefenseChangeRequests).mockResolvedValueOnce([request]).mockResolvedValueOnce([request])
  vi.mocked(api.decideDefenseChangeRequest).mockResolvedValue({ ...request, status: 'REJECTED' })
  render(<DefenseChangeRequestsPanel periodId={5} rooms={[]} onScheduleChanged={vi.fn()} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Từ chối' }))
  expect(await screen.findByText(/Đã gửi quyết định nhưng chưa xác minh/)).toBeTruthy()
  expect(screen.queryByText('Đã xác minh quyết định từ chối.')).toBeNull()
})
