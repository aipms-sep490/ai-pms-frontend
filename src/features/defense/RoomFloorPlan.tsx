import { useState } from 'react'
import type { RoomDto, RoomSchedulingExclusion } from './room-planner-api'

const SLOTS = ['08:00–09:15', '09:30–10:45', '11:00–12:15', '13:30–14:45', '15:00–16:15', '16:30–17:45']

interface Props {
  rooms: RoomDto[]
  selectedDate: string
  exclusions: RoomSchedulingExclusion[]
  onChange: (next: RoomSchedulingExclusion[]) => void
}

export function RoomFloorPlan({ rooms, selectedDate, exclusions, onChange }: Props) {
  const buildings = [...new Set(rooms.map((room) => room.building))].sort()
  const [building, setBuilding] = useState(buildings[0] ?? '')
  const [floor, setFloor] = useState(2)
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const visibleRooms = rooms.filter((room) => room.building === building && room.floor === floor)
    .sort((a, b) => a.code.localeCompare(b.code, 'vi'))
  const selectedRoom = visibleRooms.find((room) => room.id === selectedRoomId)
  const roomLocked = (roomId: number) => exclusions.some((item) => item.roomId === roomId && item.date === null && item.slotNumber === null)
  const slotLocked = (roomId: number, slotNumber: number) => exclusions.some((item) => item.roomId === roomId && item.date === selectedDate && item.slotNumber === slotNumber)

  const toggleRoom = (roomId: number) => {
    if (roomLocked(roomId)) onChange(exclusions.filter((item) => !(item.roomId === roomId && item.date === null && item.slotNumber === null)))
    else onChange([...exclusions.filter((item) => item.roomId !== roomId), { roomId, date: null, slotNumber: null }])
  }
  const toggleSlot = (roomId: number, slotNumber: number) => {
    if (slotLocked(roomId, slotNumber)) onChange(exclusions.filter((item) => !(item.roomId === roomId && item.date === selectedDate && item.slotNumber === slotNumber)))
    else onChange([...exclusions, { roomId, date: selectedDate, slotNumber }])
  }

  const roomCard = (room: RoomDto) => {
    const locked = roomLocked(room.id)
    const lockedSlotCount = exclusions.filter((item) => item.roomId === room.id && item.date === selectedDate && item.slotNumber !== null).length
    return <button key={room.id} type="button" onClick={() => setSelectedRoomId(room.id)}
      aria-pressed={selectedRoomId === room.id}
      aria-label={`Phòng ${room.code}, ${room.capacity} chỗ, ${room.status === 'ACTIVE' ? locked ? 'đã khóa' : 'sẵn sàng' : 'đang bảo trì hoặc ngừng dùng'}`}
      className={`min-h-20 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        selectedRoomId === room.id ? 'border-primary bg-primary-subtle' : room.status !== 'ACTIVE'
          ? 'border-hairline bg-canvas text-ink-muted' : locked ? 'border-amber-300 bg-amber-50' : 'border-amber-200 bg-amber-50/70 hover:border-primary'
      }`}>
      <span className="block text-sm font-bold text-ink">{room.code}</span>
      <span className="block text-xs text-ink-muted">{room.capacity} chỗ · {room.status !== 'ACTIVE' ? 'Không khả dụng' : locked ? 'Khóa cả đợt' : lockedSlotCount ? `${lockedSlotCount} ca đã khóa` : 'Sẵn sàng'}</span>
    </button>
  }

  return <section aria-label="Sơ đồ phòng tầng 2 đến 4" className="rounded-2xl border border-hairline bg-surface p-4 shadow-xs">
    <div className="flex flex-wrap items-end gap-4 border-b border-hairline pb-4">
      <div>
        <h2 className="text-lg font-bold text-ink">Sơ đồ phòng học</h2>
        <p className="text-sm text-ink-muted">Bố cục tham khảo FAMS · vị trí phòng hiển thị theo danh mục, chưa phải bản vẽ kiến trúc của trường</p>
      </div>
      <label className="ml-auto flex flex-col gap-1 text-sm font-semibold text-ink">Tòa nhà
        <select value={building} onChange={(event) => { setBuilding(event.target.value); setSelectedRoomId(null) }}
          className="min-h-11 rounded-lg border border-hairline bg-surface px-3">
          {buildings.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      <div role="group" aria-label="Chọn tầng" className="flex gap-2">
        {[2, 3, 4].map((number) => <button key={number} type="button" onClick={() => { setFloor(number); setSelectedRoomId(null) }}
          aria-pressed={floor === number}
          className={`min-h-11 rounded-lg border px-3 text-sm font-semibold ${floor === number ? 'border-primary bg-primary text-white' : 'border-hairline bg-surface text-ink'}`}>
          Tầng {number}
        </button>)}
      </div>
    </div>

    <p className="mt-3 text-xs text-ink-muted">Màu vàng: phòng có thể chọn · màu xanh: phòng đang xem · phòng bảo trì/đóng không tham gia xếp lịch. Khóa ca áp dụng cho ngày đang chọn.</p>

    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <div className="rounded-2xl border border-hairline bg-canvas/60 p-3">
        <div className="grid min-h-80 grid-cols-[minmax(0,1fr)_minmax(7rem,0.8fr)_minmax(0,1fr)] gap-3">
          <div className="flex flex-col gap-3">{visibleRooms.filter((_, index) => index % 2 === 0).map(roomCard)}</div>
          <div className="flex flex-col justify-between gap-3 text-center text-xs font-semibold text-ink-muted">
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">WC · Thang máy</div>
            <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3">Hành lang · Tầng {floor}</div>
            <div className="rounded-xl border border-hairline bg-surface p-3">Cầu thang</div>
          </div>
          <div className="flex flex-col gap-3">{visibleRooms.filter((_, index) => index % 2 === 1).map(roomCard)}</div>
        </div>
        {visibleRooms.length === 0 && <p role="status" className="mt-3 rounded-lg bg-surface p-3 text-sm text-ink-muted">Chưa có phòng tầng {floor} của tòa {building} trong danh mục.</p>}
      </div>

      <aside className="rounded-2xl border border-hairline bg-surface p-4">
        <h3 className="font-bold text-ink">Danh sách phòng · Tầng {floor}</h3>
        <p className="mb-3 text-sm text-ink-muted">{visibleRooms.length} phòng trong danh mục</p>
        <div className="max-h-52 space-y-2 overflow-y-auto">
          {visibleRooms.map((room) => <button key={room.id} type="button" onClick={() => setSelectedRoomId(room.id)}
            className="flex min-h-11 w-full items-center justify-between rounded-lg border border-hairline px-3 text-left text-sm hover:bg-canvas">
            <strong>{room.code}</strong><span>{room.capacity} chỗ</span>
          </button>)}
        </div>
        {selectedRoom && <div className="mt-4 border-t border-hairline pt-4">
          <h4 className="font-bold text-ink">Phòng {selectedRoom.code}</h4>
          <p className="text-sm text-ink-muted">{selectedRoom.building} · Tầng {floor} · {selectedRoom.capacity} chỗ</p>
          {selectedRoom.status !== 'ACTIVE' ? <p className="mt-3 text-sm text-amber-800">Phòng đang bảo trì hoặc ngừng dùng; thuật toán sẽ không chọn.</p> : <>
            <button type="button" onClick={() => toggleRoom(selectedRoom.id)}
              className="mt-3 min-h-11 w-full rounded-lg border border-amber-400 bg-amber-50 px-3 text-sm font-semibold text-amber-900">
              {roomLocked(selectedRoom.id) ? 'Mở cả phòng' : 'Khóa cả phòng trong đợt này'}
            </button>
            <p className="mt-4 text-sm font-semibold text-ink">Khóa ca ngày {selectedDate}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {SLOTS.map((time, index) => <button key={time} type="button" disabled={roomLocked(selectedRoom.id)}
                onClick={() => toggleSlot(selectedRoom.id, index + 1)}
                aria-pressed={slotLocked(selectedRoom.id, index + 1)}
                className={`min-h-11 rounded-lg border p-2 text-left text-xs font-semibold disabled:opacity-50 ${slotLocked(selectedRoom.id, index + 1) ? 'border-amber-400 bg-amber-100' : 'border-hairline bg-surface'}`}>
                {slotLocked(selectedRoom.id, index + 1) ? 'Mở' : 'Khóa'} ca {index + 1}<span className="block font-normal">{time}</span>
              </button>)}
            </div>
          </>}
        </div>}
      </aside>
    </div>
  </section>
}
