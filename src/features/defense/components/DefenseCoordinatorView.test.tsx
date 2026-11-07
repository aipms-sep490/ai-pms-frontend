import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DefenseRoomCanvas, type RoomPerson } from './DefenseRoomCanvas'
import { DefenseTimetableGrid, type RoomInfo, type DefenseSessionExtended } from './DefenseTimetableGrid'
import { DefenseCoordinatorView } from './DefenseCoordinatorView'

afterEach(() => {
  cleanup()
})

describe('DefenseRoomCanvas', () => {
  const committeeMock: RoomPerson[] = [
    { id: 1, name: 'TS. Phạm Quốc Dũng', role: 'CHAIR', title: 'Chủ tịch HĐ', major: 'KTPM' },
    { id: 2, name: 'ThS. Nguyễn Mai Phương', role: 'SECRETARY', title: 'Thư ký HĐ', major: 'KTPM' },
  ]
  const studentsMock: RoomPerson[] = [
    { id: 101, name: 'Nguyễn Văn A', role: 'STUDENT_LEADER', isPresenter: true },
    { id: 102, name: 'Trần Thị B', role: 'STUDENT_MEMBER' },
  ]
  const supervisorMock: RoomPerson = {
    id: 99,
    name: 'ThS. Đỗ Hoàng Nam',
    role: 'SUPERVISOR',
    title: 'GVHD',
  }

  it('renders room code, title, committee and stage areas', () => {
    render(
      <DefenseRoomCanvas
        roomCode="A-201"
        building="Tòa Alpha"
        floor={2}
        capacity={40}
        sessionTitle="AI-PMS Demo"
        committee={committeeMock}
        students={studentsMock}
        supervisor={supervisorMock}
      />
    )

    expect(screen.getByText(/Phòng A-201 — Sơ đồ bảo vệ trực quan/)).toBeTruthy()
    expect(screen.getByText(/Khu vực Thuyết trình & Trình chiếu Demo/)).toBeTruthy()
    expect(screen.getByText(/Bàn Hội đồng Thẩm định & Đánh giá/)).toBeTruthy()
    expect(screen.getByText('TS. Phạm Quốc Dũng')).toBeTruthy()
    expect(screen.getByText('ThS. Nguyễn Mai Phương')).toBeTruthy()
    expect(screen.getByText('ThS. Đỗ Hoàng Nam')).toBeTruthy()
  })

  it('allows switching to seating list mode', () => {
    render(
      <DefenseRoomCanvas
        roomCode="A-201"
        building="Tòa Alpha"
        floor={2}
        capacity={40}
        committee={committeeMock}
        students={studentsMock}
      />
    )

    fireEvent.click(screen.getByText('Danh sách chỗ ngồi'))
    expect(screen.getByText(/Hội đồng thẩm định \(2\)/)).toBeTruthy()
    expect(screen.getByText(/Nhóm sinh viên bảo vệ \(2\)/)).toBeTruthy()
  })
})

describe('DefenseTimetableGrid', () => {
  const rooms: RoomInfo[] = [
    { id: 1, code: 'A-201', building: 'Tòa Alpha', floor: 2, capacity: 40, status: 'ACTIVE' },
    { id: 2, code: 'B-101', building: 'Tòa Beta', floor: 1, capacity: 30, status: 'ACTIVE' },
  ]
  const sessions: DefenseSessionExtended[] = [
    {
      id: 101,
      projectId: 12,
      projectCode: 'PRJ-012',
      projectTitle: 'Hệ thống Quản lý ĐATN',
      committeeId: 1,
      room: 'A-201',
      slotNumber: 1,
      startAt: '2026-11-20T08:00:00+07:00',
      endAt: '2026-11-20T09:15:00+07:00',
      status: 'SCHEDULED',
      concurrencyToken: 'token-1',
      cancellationReason: null,
      canCancel: true,
    },
  ]

  it('renders rooms and slot columns with office hours', () => {
    const handleSelect = vi.fn()
    render(
      <DefenseTimetableGrid
        currentDate="2026-11-20"
        rooms={rooms}
        sessions={sessions}
        onSelectSession={handleSelect}
      />
    )

    expect(screen.getByText('SLOT 1')).toBeTruthy()
    expect(screen.getByText('SLOT 6')).toBeTruthy()
    expect(screen.getByText('08:00 – 09:15')).toBeTruthy()
    expect(screen.getByText('PRJ-012')).toBeTruthy()

    fireEvent.click(screen.getByText('PRJ-012'))
    expect(handleSelect).toHaveBeenCalledWith(sessions[0])
  })

  it('filters by shift when clicking Ca Sáng', () => {
    render(
      <DefenseTimetableGrid
        currentDate="2026-11-20"
        rooms={rooms}
        sessions={sessions}
      />
    )

    fireEvent.click(screen.getByText('Ca Sáng'))
    expect(screen.getByText('SLOT 1')).toBeTruthy()
    expect(screen.queryByText('SLOT 4')).toBeNull()
  })
})

describe('DefenseCoordinatorView', () => {
  it('renders coordinator tabs and switches between Grid, Room Canvas, and Change Requests', () => {
    render(<DefenseCoordinatorView />)

    expect(screen.getByText(/Lưới lịch bảo vệ \(Timetable Grid\)/)).toBeTruthy()
    expect(screen.getByText(/Sơ đồ bố trí phòng 2D/)).toBeTruthy()
    expect(screen.getByText(/Quản lý đơn đổi phòng/)).toBeTruthy()

    // Switch to Room Canvas
    fireEvent.click(screen.getByText(/Sơ đồ bố trí phòng 2D/))
    expect(screen.getByText(/Chọn phòng xem sơ đồ:/)).toBeTruthy()

    // Switch to Change Requests
    fireEvent.click(screen.getByText(/Quản lý đơn đổi phòng/))
    expect(screen.getByText(/Danh sách Đơn yêu cầu đổi phòng & đổi lịch/)).toBeTruthy()
    expect(screen.getByText('Phê duyệt đổi phòng')).toBeTruthy()
  })
})
