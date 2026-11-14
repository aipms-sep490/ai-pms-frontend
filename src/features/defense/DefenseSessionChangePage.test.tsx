import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HttpError } from '../../services/http/http-client'
import { DefenseSessionChangePage } from './DefenseSessionChangePage'
import * as api from './defense-api'

vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { user: { id: 7 } } }) }))
vi.mock('./defense-api', () => ({
  getDefenseSession: vi.fn(), getSessionDefenseChangeRequests: vi.fn(), getSessionChangeRooms: vi.fn(),
  createDefenseChangeRequest: vi.fn(), withdrawDefenseChangeRequest: vi.fn(),
}))
afterEach(() => { cleanup(); vi.clearAllMocks() })
beforeEach(() => {
  vi.mocked(api.getDefenseSession).mockResolvedValue({
    id: 40, projectId: 12, committeeId: 5, startAt: '2027-01-01T08:00:00+07:00',
    endAt: '2027-01-01T09:15:00+07:00', room: 'A-201', status: 'SCHEDULED',
    concurrencyToken: 'session', cancellationReason: null, canCancel: false,
  })
  vi.mocked(api.getSessionDefenseChangeRequests).mockResolvedValue([])
  vi.mocked(api.getSessionChangeRooms).mockResolvedValue([{ id: 8, code: 'B-202', building: 'B', floor: 2, capacity: 40, status: 'ACTIVE', concurrencyToken: 'room' }])
})

function page() {
  return render(<MemoryRouter initialEntries={['/lecturer/defense-sessions/40']}><Routes>
    <Route path="/lecturer/defense-sessions/:sessionId" element={<DefenseSessionChangePage />} />
  </Routes></MemoryRouter>)
}

it('shows an authorized supervisor the session as read-only when officer scope is denied', async () => {
  vi.mocked(api.getSessionDefenseChangeRequests).mockRejectedValue(new HttpError('Forbidden', 403))
  page()
  expect(await screen.findByText(/Chỉ chủ tọa hoặc thư ký/)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Gửi yêu cầu đổi lịch' })).toBeNull()
})

it('creates and reads back the chair request before claiming success', async () => {
  const created: api.DefenseChangeRequestDto = {
    id: 6, defenseSessionId: 40, requesterId: 7, currentRoomId: 2,
    currentStartAt: '2027-01-01T08:00:00+07:00', currentEndAt: '2027-01-01T09:15:00+07:00',
    desiredRoomId: 8, desiredStartAt: '2027-01-02T09:30:00+07:00', desiredEndAt: '2027-01-02T10:45:00+07:00',
    reasonCategory: 'ROOM_FACILITY_ISSUE', reasonDetails: 'Máy chiếu hỏng', evidenceFileUrl: null,
    status: 'PENDING', reviewerId: null, reviewNote: null, reviewedAt: null,
    concurrencyToken: 'request', createdAt: '2026-12-30T08:00:00+07:00',
  }
  vi.mocked(api.createDefenseChangeRequest).mockResolvedValue(created)
  vi.mocked(api.getSessionDefenseChangeRequests).mockResolvedValueOnce([]).mockResolvedValueOnce([created])
  page()
  fireEvent.change(await screen.findByLabelText('Phòng đề xuất'), { target: { value: '8' } })
  fireEvent.change(screen.getByLabelText('Ngày đề xuất'), { target: { value: '2027-01-02' } })
  fireEvent.change(screen.getByLabelText('Ca đề xuất'), { target: { value: '2' } })
  fireEvent.change(screen.getByLabelText('Lý do chi tiết'), { target: { value: 'Máy chiếu hỏng' } })
  fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu đổi lịch' }))
  await waitFor(() => expect(api.createDefenseChangeRequest).toHaveBeenCalledWith(40, expect.objectContaining({
    desiredRoomId: 8, desiredStartAt: '2027-01-02T09:30:00+07:00', desiredEndAt: '2027-01-02T10:45:00+07:00',
  })))
  expect(await screen.findByText(/Đã xác minh yêu cầu đổi lịch/)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Rút yêu cầu' })).toBeTruthy()
})
