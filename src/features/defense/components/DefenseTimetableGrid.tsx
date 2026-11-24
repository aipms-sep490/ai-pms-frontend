import React, { useState } from 'react'
import type { DefenseSession } from '../defense-types'

export interface RoomInfo {
  id: number
  code: string
  building: string
  floor: number
  capacity: number
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
}

export interface GridSlotItem {
  slotNumber: number
  timeRange: string
  isMorning: boolean
}

export const DEFENSE_OFFICE_SLOTS: GridSlotItem[] = [
  { slotNumber: 1, timeRange: '08:00 – 09:15', isMorning: true },
  { slotNumber: 2, timeRange: '09:30 – 10:45', isMorning: true },
  { slotNumber: 3, timeRange: '11:00 – 12:15', isMorning: true },
  { slotNumber: 4, timeRange: '13:30 – 14:45', isMorning: false },
  { slotNumber: 5, timeRange: '15:00 – 16:15', isMorning: false },
  { slotNumber: 6, timeRange: '16:30 – 17:45', isMorning: false },
]

export interface DefenseSessionExtended extends DefenseSession {
  projectCode?: string
  projectTitle?: string
  committeeName?: string
  slotNumber?: number
  hasChangeRequest?: boolean
}

export interface DefenseTimetableGridProps {
  currentDate: string // YYYY-MM-DD
  rooms: RoomInfo[]
  sessions: DefenseSessionExtended[]
  onDateChange?: (newDate: string) => void
  onSelectSession?: (session: DefenseSessionExtended) => void
  onEmptySlotClick?: (roomId: number, slotNumber: number) => void
  onAutoScheduleClick?: () => void
  onExportExcelClick?: () => void
}

export const DefenseTimetableGrid: React.FC<DefenseTimetableGridProps> = ({
  currentDate,
  rooms,
  sessions,
  onDateChange,
  onSelectSession,
  onEmptySlotClick,
  onAutoScheduleClick,
  onExportExcelClick,
}) => {
  const [selectedBuilding, setSelectedBuilding] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showOnlyFreeRooms, setShowOnlyFreeRooms] = useState<boolean>(false)
  const [selectedShift, setSelectedShift] = useState<'ALL' | 'MORNING' | 'AFTERNOON'>('ALL')

  // Helper date navigation
  const handlePrevDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - 1)
    onDateChange?.(d.toISOString().slice(0, 10))
  }

  const handleNextDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + 1)
    onDateChange?.(d.toISOString().slice(0, 10))
  }

  const handleToday = () => {
    onDateChange?.(new Date().toISOString().slice(0, 10))
  }

  // Filter slots by shift
  const visibleSlots = DEFENSE_OFFICE_SLOTS.filter((s) => {
    if (selectedShift === 'MORNING') return s.isMorning
    if (selectedShift === 'AFTERNOON') return !s.isMorning
    return true
  })

  // Buildings list
  const buildings = Array.from(new Set(rooms.map((r) => r.building)))

  // Filter rooms
  const filteredRooms = rooms.filter((r) => {
    if (selectedBuilding !== 'ALL' && r.building !== selectedBuilding) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchRoom = r.code.toLowerCase().includes(q)
      const hasMatchingSession = sessions.some(
        (s) => s.room === r.code && (s.projectCode?.toLowerCase().includes(q) || s.projectTitle?.toLowerCase().includes(q))
      )
      if (!matchRoom && !hasMatchingSession) return false
    }
    if (showOnlyFreeRooms) {
      // Check if room has any session today
      const hasSessionToday = sessions.some((s) => s.room === r.code && s.status === 'SCHEDULED')
      if (hasSessionToday) return false
    }
    return true
  })

  const occupiedRoomsCount = new Set(
    sessions.filter((s) => s.status === 'SCHEDULED').map((s) => s.room)
  ).size

  const formattedDate = (() => {
    const d = new Date(currentDate)
    if (Number.isNaN(d.getTime())) return currentDate
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d)
  })()

  return (
    <div className="flex flex-col space-y-4">
      {/* 1. Header Toolbar (Learned from FAMS 3.13.2) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-card p-4 shadow-xs">
        {/* Date Navigator */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-h-11 items-center rounded-lg border border-hairline bg-canvas p-1 text-xs">
            <button
              type="button"
              onClick={handlePrevDay}
              className="rounded p-1.5 text-ink-muted transition-colors hover:bg-card hover:text-ink"
              title="Ngày trước"
            >
              ◀
            </button>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => onDateChange?.(e.target.value)}
              className="border-0 bg-transparent px-2 py-0.5 text-xs font-semibold text-ink focus:outline-none"
            />
            <button
              type="button"
              onClick={handleNextDay}
              className="rounded p-1.5 text-ink-muted transition-colors hover:bg-card hover:text-ink"
              title="Ngày tiếp theo"
            >
              ▶
            </button>
          </div>
          <button
            type="button"
            onClick={handleToday}
            className="min-h-11 rounded-lg border border-hairline bg-card px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-canvas"
          >
            Hôm nay
          </button>
          <span className="ml-1 text-sm font-bold text-ink capitalize">{formattedDate}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="mr-2 hidden items-center text-xs text-ink-muted sm:flex">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-status-success-text" />
            Đang dùng: <strong className="ml-1 text-ink">{occupiedRoomsCount}/{rooms.length} phòng</strong>
          </div>
          {onAutoScheduleClick && (
            <button
              type="button"
              onClick={onAutoScheduleClick}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-primary-hover"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">bolt</span>
              <span>Tự động chia lịch</span>
            </button>
          )}
          {onExportExcelClick && (
            <button
              type="button"
              onClick={onExportExcelClick}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-hairline bg-card px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-canvas"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">table_view</span>
              <span>Xuất Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Secondary Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-canvas/60 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm đồ án, hội đồng, phòng…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-11 w-56 rounded-lg border border-hairline bg-card px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-xs text-ink-muted hover:text-ink"
              >
                ✕
              </button>
            )}
          </div>

          {/* Building Select */}
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="min-h-11 rounded-lg border border-hairline bg-card px-3 py-1.5 font-normal text-xs text-ink focus:outline-none"
          >
            <option value="ALL">Tất cả tòa nhà</option>
            {buildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Shift Select */}
          <div className="flex rounded-lg border border-hairline bg-card p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSelectedShift('ALL')}
              className={`min-h-9 rounded-md px-2.5 py-1 font-medium ${
                selectedShift === 'ALL' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Cả ngày
            </button>
            <button
              type="button"
              onClick={() => setSelectedShift('MORNING')}
              className={`min-h-9 rounded-md px-2.5 py-1 font-medium ${
                selectedShift === 'MORNING' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Ca Sáng
            </button>
            <button
              type="button"
              onClick={() => setSelectedShift('AFTERNOON')}
              className={`min-h-9 rounded-md px-2.5 py-1 font-medium ${
                selectedShift === 'AFTERNOON' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Ca Chiều
            </button>
          </div>
        </div>

        {/* Free Room Toggle */}
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-ink-soft">
          <input
            type="checkbox"
            checked={showOnlyFreeRooms}
            onChange={(e) => setShowOnlyFreeRooms(e.target.checked)}
            className="rounded border-hairline text-primary focus:ring-primary"
          />
          <span>Chỉ hiện phòng còn trống</span>
        </label>
      </div>

      {/* 3. Timetable Grid Matrix */}
      <div className="overflow-x-auto rounded-2xl border border-hairline bg-card shadow-xs">
        <div role="table" aria-label="Ma trận lịch bảo vệ theo phòng và ca" className="w-full min-w-[900px] text-left text-xs">
          {/* Table Header: Slots */}
          <div role="rowgroup" className="border-b border-hairline bg-canvas/80 text-ink-muted">
            <div role="row" className="flex">
              <div role="columnheader" className="w-48 shrink-0 p-3.5 text-xs font-bold uppercase tracking-wider text-ink">
                Phòng bảo vệ
              </div>
              {visibleSlots.map((slot) => (
                <div role="columnheader" key={slot.slotNumber} className="min-w-[160px] flex-1 border-l border-hairline p-3.5 text-center font-bold">
                  <div className="text-xs font-semibold text-ink">SLOT {slot.slotNumber}</div>
                  <div className="mt-0.5 text-xs font-normal text-ink-muted">{slot.timeRange}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Table Body: Rooms & Assigned Sessions */}
          <div role="rowgroup" className="divide-y divide-hairline">
            {filteredRooms.length === 0 ? (
              <div role="row" className="p-8 text-center text-ink-muted">
                Không tìm thấy phòng bảo vệ nào phù hợp với bộ lọc.
              </div>
            ) : (
              filteredRooms.map((room) => {
                return (
                  <div role="row" key={room.id} className="flex transition-colors hover:bg-canvas/30">
                    {/* Room Specs Column */}
                    <div role="cell" className="w-48 shrink-0 p-3.5 align-top">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
                        <span>{room.code}</span>
                        {room.status === 'MAINTENANCE' && (
                          <span className="rounded border border-status-warning-border bg-status-warning-bg px-1.5 py-0.5 text-xs text-status-warning-text">Bảo trì</span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-ink-muted">
                        {room.building} · Tầng {room.floor}
                      </div>
                      <div className="mt-1 text-xs font-medium text-primary">
                        Sức chứa: {room.capacity} chỗ
                      </div>
                    </div>

                    {/* Slot Cells */}
                    {visibleSlots.map((slot) => {
                      // Find session in this room at this slot
                      const session = sessions.find(
                        (s) => s.room === room.code && s.slotNumber === slot.slotNumber
                      )

                      return (
                        <div role="cell" key={slot.slotNumber} className="min-h-24 min-w-[160px] flex-1 border-l border-hairline p-2 align-top">
                          {session ? (
                            /* Occupied Slot Card (FAMS style with Primary Orange tone) */
                            <div
                              onClick={() => onSelectSession?.(session)}
                              className={`cursor-pointer rounded-xl border p-2.5 shadow-xs transition-all hover:scale-[1.02] hover:shadow-md ${
                                session.status === 'SCHEDULED'
                                  ? 'border-hairline border-l-4 border-l-primary bg-primary-subtle/20'
                                  : session.status === 'CANCELLED'
                                  ? 'border-hairline border-l-4 border-l-status-error-border bg-status-error-bg/30'
                                  : 'border-hairline bg-canvas'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="line-clamp-1 text-xs font-bold text-primary">
                                  {session.projectCode || `Đồ án #${session.projectId}`}
                                </span>
                                {session.hasChangeRequest && (
                                  <span className="inline-flex items-center text-status-warning-text" title="Đang có yêu cầu đổi phòng">
                                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">warning</span>
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs leading-tight font-medium text-ink">
                                {session.projectTitle || 'Bảo vệ Đồ án Tốt nghiệp'}
                              </p>
                              <div className="mt-2 flex items-center justify-between text-xs text-ink-muted">
                                <span className="max-w-[90px] truncate">{session.committeeName || 'HĐ Thẩm định'}</span>
                                <span className="rounded border border-hairline bg-card px-1.5 py-0.5 text-xs font-semibold">
                                  {session.status === 'SCHEDULED' ? 'Đã xếp' : session.status}
                                </span>
                              </div>
                            </div>
                          ) : (
                            /* Empty Slot */
                            <div
                              onClick={() => onEmptySlotClick?.(room.id, slot.slotNumber)}
                              className="group flex h-full min-h-[70px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-hairline p-2 text-center transition-colors hover:border-primary/50 hover:bg-primary-subtle/10"
                            >
                              <span className="text-xs font-medium text-ink-muted transition-colors group-hover:text-primary">
                                + Xếp lịch
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
