import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { RoomFloorPlan } from './RoomFloorPlan'
import type { RoomDto, RoomSchedulingExclusion } from './room-planner-api'

afterEach(cleanup)

const rooms: RoomDto[] = [
  { id: 1, code: 'A-201', building: 'Alpha', floor: 2, capacity: 40, status: 'ACTIVE', concurrencyToken: '1' },
  { id: 2, code: 'A-301', building: 'Alpha', floor: 3, capacity: 35, status: 'ACTIVE', concurrencyToken: '2' },
  { id: 3, code: 'A-401', building: 'Alpha', floor: 4, capacity: 30, status: 'MAINTENANCE', concurrencyToken: '3' },
]

describe('RoomFloorPlan', () => {
  it('shows floors 2–4 and locks a whole room for the scheduling run', () => {
    const onChange = vi.fn()
    render(<RoomFloorPlan rooms={rooms} selectedDate="2026-11-20" exclusions={[]} onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Tầng 2' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tầng 3' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tầng 4' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Phòng A-201/ }))
    fireEvent.click(screen.getByRole('button', { name: /Khóa cả phòng/ }))
    expect(onChange).toHaveBeenCalledWith([{ roomId: 1, date: null, slotNumber: null }])
  })

  it('locks only one slot on the selected date and preserves other exclusions', () => {
    const onChange = vi.fn()
    const existing: RoomSchedulingExclusion[] = [{ roomId: 2, date: null, slotNumber: null }]
    render(<RoomFloorPlan rooms={rooms} selectedDate="2026-11-20" exclusions={existing} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Phòng A-201/ }))
    fireEvent.click(screen.getByRole('button', { name: /Khóa ca 2/ }))
    expect(onChange).toHaveBeenCalledWith([...existing, { roomId: 1, date: '2026-11-20', slotNumber: 2 }])
  })

  it('does not offer lock actions for a maintenance room', () => {
    render(<RoomFloorPlan rooms={rooms} selectedDate="2026-11-20" exclusions={[]} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tầng 4' }))
    fireEvent.click(screen.getByRole('button', { name: /Phòng A-401/ }))
    expect(screen.getByText(/đang bảo trì/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Khóa cả phòng/ })).toBeNull()
  })
})
