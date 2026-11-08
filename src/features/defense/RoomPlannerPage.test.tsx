import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RoomPlannerPage } from './RoomPlannerPage'
import * as api from './room-planner-api'

vi.mock('./room-planner-api', () => ({
  getPlannerRooms: vi.fn(),
  previewDefenseSchedule: vi.fn(),
  applyDefenseSchedule: vi.fn(),
  previewGate3Schedule: vi.fn(),
  applyGate3Schedule: vi.fn(),
  formatScheduleConflictReason: vi.fn((reason: string) => `Formatted: ${reason}`),
}))

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('RoomPlannerPage', () => {
  it('sends selected room and slot exclusions to preview and apply for Gate 4', async () => {
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
    fireEvent.click(screen.getByRole('button', { name: /Tự động xếp lịch R4/ }))
    await waitFor(() => expect(api.previewDefenseSchedule).toHaveBeenCalledWith(5, expect.objectContaining({
      exclusions: [{ roomId: 7, date: '2026-12-01', slotNumber: 2 }],
    })))
    fireEvent.click(await screen.findByRole('button', { name: 'Duyệt và áp dụng lịch' }))
    await waitFor(() => expect(api.applyDefenseSchedule).toHaveBeenCalledWith(5, expect.objectContaining({
      concurrencyToken: 'revision', exclusions: [{ roomId: 7, date: '2026-12-01', slotNumber: 2 }],
    })))
  })

  it('switches to Gate 3 and sends exclusions to Gate 3 preview and apply', async () => {
    vi.mocked(api.getPlannerRooms).mockResolvedValue([
      { id: 8, code: 'A-202', building: 'Alpha', floor: 2, capacity: 50, status: 'ACTIVE', concurrencyToken: 'token-b' },
    ])
    vi.mocked(api.previewGate3Schedule).mockResolvedValue({
      scheduledCount: 1,
      unscheduledCount: 1,
      conflicts: [{ projectId: 15, reason: 'REVIEW_GATE_2_NOT_PASSED' }],
      concurrencyToken: 'token-g3',
      allocations: [{ projectId: 14, gateInstanceId: 302, roomId: 8, roomCode: 'A-202', date: '2026-11-20',
        slotNumber: 2, startAt: '2026-11-20T09:30:00+07:00', endAt: '2026-11-20T10:45:00+07:00' }],
    })
    render(<MemoryRouter initialEntries={['/academic/project-periods/5/room-planner']}><Routes>
      <Route path="/academic/project-periods/:periodId/room-planner" element={<RoomPlannerPage />} />
    </Routes></MemoryRouter>)

    await screen.findByRole('button', { name: /Phòng A-202/ })
    fireEvent.click(screen.getByRole('button', { name: /Gate 3/ }))
    fireEvent.click(screen.getByRole('button', { name: /Tự động xếp lịch R3/ }))

    await waitFor(() => expect(api.previewGate3Schedule).toHaveBeenCalledWith(5, expect.objectContaining({
      roomIds: [8],
    })))

    // Formatted conflict should appear
    expect(await screen.findByText(/Formatted: REVIEW_GATE_2_NOT_PASSED/)).toBeDefined()
  })
})
