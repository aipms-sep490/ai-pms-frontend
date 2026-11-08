import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RoomPlannerPage } from './RoomPlannerPage'
import * as api from './room-planner-api'

vi.mock('./room-planner-api', () => ({
  getPlannerRooms: vi.fn(), previewDefenseSchedule: vi.fn(), applyDefenseSchedule: vi.fn(),
}))
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('RoomPlannerPage', () => {
  it('sends selected room and slot exclusions to preview and apply', async () => {
    vi.mocked(api.getPlannerRooms).mockResolvedValue([
      { id: 7, code: 'A-201', building: 'Alpha', floor: 2, capacity: 40, status: 'ACTIVE', concurrencyToken: 'token' },
    ])
    vi.mocked(api.previewDefenseSchedule).mockResolvedValue({
      scheduledCount: 1, unscheduledCount: 0, conflicts: [], concurrencyToken: 'revision',
      allocations: [{ projectId: 12, committeeId: 3, roomId: 7, roomCode: 'A-201', date: '2026-12-01',
        slotNumber: 1, startAt: '2026-12-01T08:00:00+07:00', endAt: '2026-12-01T09:15:00+07:00' }],
    })
    vi.mocked(api.applyDefenseSchedule).mockResolvedValue({ success: true, createdSessionsCount: 1 })
    render(<MemoryRouter initialEntries={['/academic/project-periods/5/room-planner']}><Routes>
      <Route path="/academic/project-periods/:periodId/room-planner" element={<RoomPlannerPage />} />
    </Routes></MemoryRouter>)

    await screen.findByRole('button', { name: /Phòng A-201/ })
    const dates = screen.getAllByLabelText(/ngày/i) as HTMLInputElement[]
    fireEvent.change(dates[0], { target: { value: '2026-12-01' } })
    fireEvent.change(dates[1], { target: { value: '2026-12-02' } })
    fireEvent.click(screen.getByRole('button', { name: /Phòng A-201/ }))
    fireEvent.click(screen.getByRole('button', { name: /Khóa ca 2/ }))
    fireEvent.click(screen.getByRole('button', { name: /Tự động xếp lịch/ }))
    await waitFor(() => expect(api.previewDefenseSchedule).toHaveBeenCalledWith(5, expect.objectContaining({
      exclusions: [{ roomId: 7, date: '2026-12-01', slotNumber: 2 }],
    })))
    fireEvent.click(await screen.findByRole('button', { name: 'Duyệt và áp dụng lịch' }))
    await waitFor(() => expect(api.applyDefenseSchedule).toHaveBeenCalledWith(5, expect.objectContaining({
      concurrencyToken: 'revision', exclusions: [{ roomId: 7, date: '2026-12-01', slotNumber: 2 }],
    })))
  })
})
