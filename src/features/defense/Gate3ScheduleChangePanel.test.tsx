import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Gate3ScheduleChangePanel } from './Gate3ScheduleChangePanel'
import * as api from './room-planner-api'

vi.mock('./room-planner-api', () => ({ changeGate3Schedule: vi.fn(), getGate3Schedules: vi.fn() }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

const schedule: api.ReviewGate3ScheduleDto = {
  projectId: 12, gateInstanceId: 45, roomId: 7, roomCode: 'A-201',
  startAt: '2026-12-01T08:00:00+07:00', endAt: '2026-12-01T09:15:00+07:00',
  publishedAt: '2026-11-30T08:00:00+07:00', publishedBy: 1, concurrencyToken: 'old',
}
const rooms: api.RoomDto[] = [{ id: 7, code: 'A-201', building: 'A', floor: 2, capacity: 40, status: 'ACTIVE', concurrencyToken: 'r' }]

it('uses the persisted token and verifies the revised slot', async () => {
  vi.mocked(api.changeGate3Schedule).mockResolvedValue({ ...schedule, startAt: '2026-12-02T09:30:00+07:00' })
  vi.mocked(api.getGate3Schedules).mockResolvedValue([{ ...schedule,
    startAt: '2026-12-02T09:30:00+07:00', endAt: '2026-12-02T10:45:00+07:00' }])
  const changed = vi.fn(), close = vi.fn()
  render(<Gate3ScheduleChangePanel periodId={5} schedule={schedule} rooms={rooms} onChanged={changed} onClose={close} />)
  fireEvent.change(screen.getByLabelText('Ngày mới'), { target: { value: '2026-12-02' } })
  fireEvent.change(screen.getByLabelText('Ca mới'), { target: { value: '2' } })
  fireEvent.change(screen.getByLabelText('Lý do đổi lịch'), { target: { value: 'Phòng cũ cần bảo trì' } })
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đổi lịch' }))
  await waitFor(() => expect(api.changeGate3Schedule).toHaveBeenCalledWith(5, 45, {
    roomId: 7, startAt: '2026-12-02T09:30:00+07:00', endAt: '2026-12-02T10:45:00+07:00',
    reason: 'Phòng cũ cần bảo trì', concurrencyToken: 'old',
  }))
  await waitFor(() => expect(changed).toHaveBeenCalledOnce())
  expect(close).toHaveBeenCalledOnce()
})
