import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../components/ui/Table'
import type { RoomDto, RoomSchedulingExclusion } from './room-planner-api'

const SLOTS = [
  '08:00–09:15',
  '09:30–10:45',
  '11:00–12:15',
  '13:30–14:45',
  '15:00–16:15',
  '16:30–17:45',
]

export interface RoomAllocationSummary {
  projectId: number
  date: string
  slotNumber: number
  startAt: string
  endAt: string
  roomId: number
  roomCode: string
  projectTitle?: string
  committeeName?: string
}

interface Props {
  rooms: RoomDto[]
  selectedDate: string
  exclusions: RoomSchedulingExclusion[]
  onChange: (next: RoomSchedulingExclusion[]) => void
  allocations?: RoomAllocationSummary[]
}

export function RoomFloorPlan({ rooms, selectedDate, exclusions, onChange, allocations = [] }: Props) {
  const buildings = [...new Set(rooms.map((room) => room.building))].sort()
  const [building, setBuilding] = useState(buildings[0] ?? '')
  const selectedBuilding = buildings.includes(building) ? building : buildings[0] ?? ''
  const [floor, setFloor] = useState(2)
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'canvas' | 'grid'>('canvas')

  const visibleRooms = rooms
    .filter((room) => room.building === selectedBuilding && room.floor === floor)
    .sort((a, b) => a.code.localeCompare(b.code, 'vi'))

  const selectedRoom = visibleRooms.find((room) => room.id === selectedRoomId)

  const roomLocked = (roomId: number) =>
    exclusions.some((item) => item.roomId === roomId && item.date === null && item.slotNumber === null)

  const slotLocked = (roomId: number, slotNumber: number) =>
    exclusions.some(
      (item) => item.roomId === roomId && item.date === selectedDate && item.slotNumber === slotNumber,
    )

  const toggleRoom = (roomId: number) => {
    if (roomLocked(roomId)) {
      onChange(exclusions.filter((item) => !(item.roomId === roomId && item.date === null && item.slotNumber === null)))
    } else {
      onChange([...exclusions.filter((item) => item.roomId !== roomId), { roomId, date: null, slotNumber: null }])
    }
  }

  const toggleSlot = (roomId: number, slotNumber: number) => {
    if (slotLocked(roomId, slotNumber)) {
      onChange(
        exclusions.filter(
          (item) => !(item.roomId === roomId && item.date === selectedDate && item.slotNumber === slotNumber),
        ),
      )
    } else {
      onChange([...exclusions, { roomId, date: selectedDate, slotNumber }])
    }
  }

  const getRoomAllocationsForDate = (roomId: number) =>
    allocations.filter((a) => a.roomId === roomId && a.date === selectedDate)

  const renderRoomCard = (room: RoomDto) => {
    const isLockedWhole = roomLocked(room.id)
    const lockedSlotCount = exclusions.filter(
      (item) => item.roomId === room.id && item.date === selectedDate && item.slotNumber !== null,
    ).length
    const dayAllocations = getRoomAllocationsForDate(room.id)
    const isSelected = selectedRoomId === room.id

    return (
      <button
        key={room.id}
        type="button"
        onClick={() => setSelectedRoomId(room.id)}
        aria-pressed={isSelected}
        aria-label={`Phòng ${room.code}, ${room.capacity} chỗ, ${
          room.status === 'ACTIVE'
            ? isLockedWhole
              ? 'đã khóa cả đợt'
              : lockedSlotCount
                ? `${lockedSlotCount} ca đã khóa`
                : 'sẵn sàng'
            : 'đang bảo trì hoặc ngừng dùng'
        }`}
        className={`group relative flex min-h-[5.5rem] flex-col justify-between rounded-xl border p-3 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          isSelected
            ? 'border-primary bg-primary-subtle shadow-xs ring-2 ring-primary/40'
            : room.status !== 'ACTIVE'
              ? 'border-hairline bg-canvas text-ink-muted opacity-60'
              : isLockedWhole
                ? 'border-status-warning-border bg-status-warning-bg text-status-warning-text'
                : lockedSlotCount > 0
                  ? 'border-status-warning-border bg-status-warning-bg/60 hover:border-primary'
                  : 'border-hairline bg-card hover:border-primary hover:shadow-xs'
        }`}
      >
        <div className="flex items-start justify-between gap-1">
          <span className="text-sm font-bold text-ink group-hover:text-primary">{room.code}</span>
          {room.status === 'ACTIVE' && (
            <span
              className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                isLockedWhole
                  ? 'border border-status-warning-border bg-status-warning-bg text-status-warning-text'
                  : isSelected
                    ? 'bg-primary/20 text-primary'
                    : 'border border-status-success-border bg-status-success-bg text-status-success-text'
              }`}
            >
              {isLockedWhole ? 'Khóa đợt' : isSelected ? 'Đang chọn' : 'Hoạt động'}
            </span>
          )}
        </div>
        <div className="mt-1 space-y-0.5 text-xs text-ink-muted">
          <span className="block font-medium">{room.capacity} chỗ</span>
          <span className="block text-xs">
            {room.status !== 'ACTIVE'
              ? 'Đang bảo trì'
              : isLockedWhole
                ? 'Đã khóa cả đợt'
                : dayAllocations.length > 0
                  ? `📅 ${dayAllocations.length} ca có lịch`
                  : lockedSlotCount > 0
                    ? `🔒 ${lockedSlotCount} ca khóa`
                    : 'Sẵn sàng'}
          </span>
        </div>
      </button>
    )
  }

  return (
    <section
      aria-label="Danh mục phòng tầng 2 đến 4"
      className="rounded-2xl border border-hairline bg-card p-5 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-ink">Phòng theo tòa và tầng</h2>
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">
            Chọn phòng từ danh mục thật để xem ca và loại trừ cho lần xếp lịch này. Vị trí các thẻ không thể hiện mặt bằng vật lý.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span>Tòa:</span>
            <select
              value={selectedBuilding}
              onChange={(e) => {
                setBuilding(e.target.value)
                setSelectedRoomId(null)
              }}
              className="min-h-11 rounded-lg border border-hairline bg-card px-3 font-normal text-sm text-ink focus:border-primary focus:outline-none"
            >
              {buildings.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <div role="group" aria-label="Chọn tầng" className="flex rounded-lg border border-hairline p-0.5">
            {[2, 3, 4].map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => {
                  setFloor(number)
                  setSelectedRoomId(null)
                }}
                aria-pressed={floor === number}
                className={`min-h-10 rounded-md px-3 text-xs font-bold transition-colors ${
                  floor === number
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-transparent text-ink-muted hover:bg-canvas'
                }`}
              >
                Tầng {number}
              </button>
            ))}
          </div>

          <div className="flex rounded-lg border border-hairline bg-canvas p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('canvas')}
              className={`min-h-10 rounded-md px-3 text-xs font-bold transition-colors ${
                viewMode === 'canvas' ? 'bg-card text-primary shadow-xs' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Thẻ phòng
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`min-h-10 rounded-md px-3 text-xs font-bold transition-colors ${
                viewMode === 'grid' ? 'bg-card text-primary shadow-xs' : 'text-ink-muted hover:text-ink'
              }`}
            >
              📅 Lưới thời khóa biểu
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,2.3fr)_minmax(19rem,1fr)]">
        {viewMode === 'canvas' ? (
          <div className="rounded-2xl border border-hairline bg-canvas/40 p-4">
            <p className="mb-3 text-xs font-semibold text-ink-muted">Tòa {selectedBuilding} · Tầng {floor} · {visibleRooms.length} phòng trong danh mục</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visibleRooms.map(renderRoomCard)}
            </div>

            {visibleRooms.length === 0 && (
              <p role="status" className="mt-3 rounded-lg bg-card p-4 text-center text-sm text-ink-muted">
                Chưa có phòng tầng {floor} của tòa {selectedBuilding} trong danh mục.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-hairline bg-card p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">
                Lưới thời khóa biểu tầng {floor} · Ngày {selectedDate}
              </h3>
              <span className="text-xs text-ink-muted">6 ca hành chính (75 phút/ca)</span>
            </div>
            <Table aria-label={`Lưới thời khóa biểu tầng ${floor}`}>
              <TableHead>
                <TableRow head>
                  <TableHeaderCell className="sticky left-0 bg-table-header-bg">Phòng</TableHeaderCell>
                  {SLOTS.map((time, idx) => (
                    <TableHeaderCell key={time} className="border-l border-hairline">
                      Ca {idx + 1}
                      <span className="block text-xs font-normal text-ink-muted">{time}</span>
                    </TableHeaderCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRooms.map((room) => {
                  const isWholeLocked = roomLocked(room.id)
                  const dayAllocs = getRoomAllocationsForDate(room.id)

                  return (
                    <TableRow key={room.id}>
                      <TableCell className="sticky left-0 border-r border-hairline bg-card font-bold">
                        <button
                          type="button"
                          onClick={() => setSelectedRoomId(room.id)}
                          className="text-left hover:text-primary"
                        >
                          {room.code}
                          <span className="block text-xs font-normal text-ink-muted">
                            {room.capacity} chỗ
                          </span>
                        </button>
                      </TableCell>
                      {SLOTS.map((_, slotIdx) => {
                        const slotNum = slotIdx + 1
                        const isSlotLocked = slotLocked(room.id, slotNum)
                        const alloc = dayAllocs.find((a) => a.slotNumber === slotNum)

                        if (isWholeLocked) {
                          return (
                            <TableCell key={slotNum} className="border-l border-hairline bg-canvas p-2 text-center text-ink-muted">
                              Khóa cả đợt
                            </TableCell>
                          )
                        }

                        if (alloc) {
                          return (
                            <TableCell key={slotNum} className="border-l border-hairline bg-primary-subtle p-2">
                              <div className="rounded border-l-4 border-primary bg-card p-1.5 shadow-2xs">
                                <span className="block font-bold text-primary">Đồ án #{alloc.projectId}</span>
                                <span className="block text-xs text-ink-muted">
                                  {alloc.startAt.slice(11, 16)}–{alloc.endAt.slice(11, 16)}
                                </span>
                              </div>
                            </TableCell>
                          )
                        }

                        if (isSlotLocked) {
                          return (
                            <TableCell key={slotNum} className="border-l border-hairline bg-status-warning-bg p-2">
                              <div className="flex flex-col items-center gap-1 text-xs font-semibold text-status-warning-text">
                                <span>🔒 Đã khóa</span>
                                <button
                                  type="button"
                                  onClick={() => toggleSlot(room.id, slotNum)}
                                  className="min-h-9 px-2 text-xs text-status-warning-text underline"
                                >
                                  Mở ca
                                </button>
                              </div>
                            </TableCell>
                          )
                        }

                        return (
                          <TableCell key={slotNum} className="group border-l border-hairline p-2 text-center">
                            <span className="block text-xs font-medium text-status-success-text">
                              Trống
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleSlot(room.id, slotNum)}
                              className="mt-1 min-h-11 rounded border border-hairline bg-card px-2 text-xs font-semibold text-ink shadow-2xs hover:border-primary"
                            >
                              Khóa ca
                            </button>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <aside className="rounded-2xl border border-hairline bg-card p-4 shadow-xs">
          <div className="border-b border-hairline pb-3">
            <h3 className="text-base font-bold text-ink">Danh sách phòng · Tầng {floor}</h3>
            <p className="text-xs text-ink-muted">{visibleRooms.length} phòng trong danh mục</p>
          </div>

          <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto pr-1">
            {visibleRooms.map((room) => {
              const isSelected = selectedRoomId === room.id
              const isLocked = roomLocked(room.id)
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`flex min-h-11 w-full items-center justify-between rounded-lg border px-3 text-left text-xs transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary-subtle font-semibold text-primary'
                      : 'border-hairline bg-card text-ink hover:bg-canvas'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{room.code}</span>
                    <span className="text-xs text-ink-muted">{room.status === 'ACTIVE' ? 'Hoạt động' : room.status === 'MAINTENANCE' ? 'Bảo trì' : 'Ngừng dùng'}</span>
                  </div>
                  <span className="text-xs text-ink-muted">
                    {isLocked ? 'Khóa đợt' : `${room.capacity} chỗ`}
                  </span>
                </button>
              )
            })}
          </div>

          {selectedRoom ? (
            <div className="mt-4 border-t border-hairline pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-base font-bold text-ink">Phòng {selectedRoom.code}</h4>
                  <p className="text-xs text-ink-muted">
                    {selectedRoom.building} · Tầng {floor} · {selectedRoom.capacity} chỗ
                  </p>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold ${
                    selectedRoom.status === 'ACTIVE'
                      ? 'border border-status-success-border bg-status-success-bg text-status-success-text'
                      : 'border border-hairline bg-canvas text-ink-soft'
                  }`}
                >
                  {selectedRoom.status === 'ACTIVE' ? 'Sẵn sàng' : selectedRoom.status === 'MAINTENANCE' ? 'Bảo trì' : 'Ngừng dùng'}
                </span>
              </div>

              {selectedRoom.status !== 'ACTIVE' ? (
                <p className="mt-3 rounded-lg border border-status-warning-border bg-status-warning-bg p-2.5 text-xs text-status-warning-text">
                  Phòng đang bảo trì hoặc ngừng dùng; thuật toán xếp lịch sẽ tự động bỏ qua.
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => toggleRoom(selectedRoom.id)}
                    className={`mt-3 min-h-11 w-full rounded-lg border px-3 text-xs font-bold transition-colors ${
                      roomLocked(selectedRoom.id)
                        ? 'border-status-success-border bg-status-success-bg text-status-success-text hover:opacity-90'
                        : 'border-status-warning-border bg-status-warning-bg text-status-warning-text hover:opacity-90'
                    }`}
                  >
                    {roomLocked(selectedRoom.id)
                      ? 'Mở cả phòng'
                      : 'Khóa cả phòng trong đợt này'}
                  </button>

                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink">Lịch 6 ca ngày {selectedDate}</span>
                      <span className="text-xs text-ink-muted">Chi tiết nhóm & khóa ca</span>
                    </div>

                    <div className="mt-2 space-y-2">
                      {SLOTS.map((time, index) => {
                        const slotNum = index + 1
                        const isLocked = slotLocked(selectedRoom.id, slotNum)
                        const alloc = getRoomAllocationsForDate(selectedRoom.id).find(
                          (a) => a.slotNumber === slotNum,
                        )

                        return (
                          <div
                            key={time}
                            className={`flex items-center justify-between rounded-lg border p-2 text-xs transition-colors ${
                              isLocked
                                ? 'border-status-warning-border bg-status-warning-bg text-status-warning-text'
                                : alloc
                                  ? 'border-primary/30 bg-primary-subtle text-ink'
                                  : 'border-hairline bg-card'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5 font-bold">
                                <span>Ca {slotNum}</span>
                                <span className="text-xs font-normal text-ink-muted">({time})</span>
                              </div>
                              {alloc ? (
                                <span className="mt-0.5 block font-semibold text-primary">
                                  🛡️ Đồ án #{alloc.projectId}
                                </span>
                              ) : isLocked ? (
                                <span className="mt-0.5 block text-xs text-status-warning-text">
                                  🔒 Đã khóa không xếp
                                </span>
                              ) : (
                                <span className="mt-0.5 block text-xs text-status-success-text">
                                  🟢 Trống · Sẵn sàng
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={roomLocked(selectedRoom.id)}
                              onClick={() => toggleSlot(selectedRoom.id, slotNum)}
                              aria-pressed={isLocked}
                              className={`min-h-9 rounded-md px-2.5 py-1 text-xs font-bold transition-colors disabled:opacity-50 ${
                                isLocked
                                  ? 'border border-status-warning-border bg-card text-status-warning-text hover:bg-status-warning-bg'
                                  : 'border border-hairline bg-canvas text-ink hover:border-primary'
                              }`}
                            >
                              {isLocked ? 'Mở' : 'Khóa ca'} {slotNum}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="mt-6 text-center text-xs text-ink-muted">
              Chọn một phòng học trên sơ đồ để xem chi tiết chỗ ngồi, lịch bảo vệ và khóa ca.
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
