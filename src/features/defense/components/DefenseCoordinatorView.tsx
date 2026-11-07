import React, { useState } from 'react'
import { DefenseTimetableGrid, type DefenseSessionExtended, type RoomInfo } from './DefenseTimetableGrid'
import { DefenseRoomCanvas, type RoomPerson } from './DefenseRoomCanvas'
import { DefenseSlotDetailDrawer } from './DefenseSlotDetailDrawer'
import { AutoScheduleModal } from './AutoScheduleModal'
import { RescheduleRequestModal } from './RescheduleRequestModal'

// Sample rooms for demonstration & testing
export const INITIAL_ROOMS: RoomInfo[] = [
  { id: 1, code: 'A-201', building: 'Tòa Alpha', floor: 2, capacity: 40, status: 'ACTIVE' },
  { id: 2, code: 'A-202', building: 'Tòa Alpha', floor: 2, capacity: 45, status: 'ACTIVE' },
  { id: 3, code: 'A-305', building: 'Tòa Alpha', floor: 3, capacity: 60, status: 'ACTIVE' },
  { id: 4, code: 'B-101', building: 'Tòa Beta', floor: 1, capacity: 35, status: 'ACTIVE' },
  { id: 5, code: 'B-204', building: 'Tòa Beta', floor: 2, capacity: 50, status: 'MAINTENANCE' },
  { id: 6, code: 'G-101', building: 'Tòa Gamma', floor: 1, capacity: 70, status: 'ACTIVE' },
]

// Sample sessions for demonstration & testing
export const INITIAL_SESSIONS: DefenseSessionExtended[] = [
  {
    id: 101,
    projectId: 12,
    projectCode: 'PRJ-2026-012',
    projectTitle: 'Hệ thống Quản lý Tiến độ Đồ án Tốt nghiệp Thông minh AI-PMS',
    committeeId: 1,
    committeeName: 'HĐ KTPM-01',
    room: 'A-201',
    slotNumber: 1,
    startAt: '2026-11-20T08:00:00+07:00',
    endAt: '2026-11-20T09:15:00+07:00',
    status: 'SCHEDULED',
    concurrencyToken: 'token-101',
    cancellationReason: null,
    canCancel: true,
  },
  {
    id: 102,
    projectId: 15,
    projectCode: 'PRJ-2026-015',
    projectTitle: 'Trợ lý Tư vấn Y tế Cá nhân hóa ứng dụng LLM',
    committeeId: 1,
    committeeName: 'HĐ KTPM-01',
    room: 'A-201',
    slotNumber: 2,
    startAt: '2026-11-20T09:30:00+07:00',
    endAt: '2026-11-20T10:45:00+07:00',
    status: 'SCHEDULED',
    concurrencyToken: 'token-102',
    cancellationReason: null,
    canCancel: true,
  },
  {
    id: 103,
    projectId: 28,
    projectCode: 'PRJ-2026-028',
    projectTitle: 'Nông nghiệp Thông minh IoT tối ưu hóa lượng nước tưới',
    committeeId: 2,
    committeeName: 'HĐ IoT-02',
    room: 'A-202',
    slotNumber: 1,
    startAt: '2026-11-20T08:00:00+07:00',
    endAt: '2026-11-20T09:15:00+07:00',
    status: 'SCHEDULED',
    concurrencyToken: 'token-103',
    cancellationReason: null,
    canCancel: true,
  },
  {
    id: 104,
    projectId: 31,
    projectCode: 'PRJ-2026-031',
    projectTitle: 'Hệ thống Xe tự hành nhận diện biển báo giao thông Việt Nam',
    committeeId: 2,
    committeeName: 'HĐ IoT-02',
    room: 'A-202',
    slotNumber: 2,
    startAt: '2026-11-20T09:30:00+07:00',
    endAt: '2026-11-20T10:45:00+07:00',
    status: 'SCHEDULED',
    concurrencyToken: 'token-104',
    cancellationReason: null,
    canCancel: true,
    hasChangeRequest: true,
  },
]

export const DefenseCoordinatorView: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<'GRID' | 'ROOM_CANVAS' | 'CHANGE_REQUESTS'>('GRID')
  const [currentDate, setCurrentDate] = useState('2026-11-20')
  const [rooms] = useState<RoomInfo[]>(INITIAL_ROOMS)
  const [sessions, setSessions] = useState<DefenseSessionExtended[]>(INITIAL_SESSIONS)
  const [selectedSession, setSelectedSession] = useState<DefenseSessionExtended | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isAutoScheduleOpen, setIsAutoScheduleOpen] = useState(false)
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false)
  const [canvasRoomCode, setCanvasRoomCode] = useState('A-201')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleSelectSession = (s: DefenseSessionExtended) => {
    setSelectedSession(s)
    setIsDrawerOpen(true)
  }

  const handleEmptySlotClick = (roomId: number, slotNumber: number) => {
    const room = rooms.find((r) => r.id === roomId)
    showToast(`Đang mở biểu mẫu xếp lịch cho phòng ${room?.code || ''} vào Slot ${slotNumber}`)
  }

  const handleApplyAutoSchedule = (count: number) => {
    showToast(`Đã áp dụng thành công lịch bảo vệ tự động cho ${count} đồ án!`)
  }

  const handleRescheduleSuccess = (_data: unknown) => {
    showToast('Đã gửi yêu cầu đổi phòng thành công! Đang chờ Trưởng bộ môn phê duyệt.')
    setIsDrawerOpen(false)
  }

  // Sample data for room canvas view
  const currentCanvasRoom = rooms.find((r) => r.code === canvasRoomCode) || rooms[0]
  const currentCanvasSession = sessions.find((s) => s.room === currentCanvasRoom.code)

  const committeeMembers: RoomPerson[] = [
    { id: 1, name: 'TS. Phạm Quốc Dũng', role: 'CHAIR', title: 'Chủ tịch Hội đồng', major: 'KTPM' },
    { id: 2, name: 'ThS. Nguyễn Mai Phương', role: 'SECRETARY', title: 'Thư ký Hội đồng', major: 'KTPM' },
    { id: 3, name: 'TS. Lê Văn Tuấn', role: 'REVIEWER', title: 'Giảng viên Phản biện', major: 'HTTT' },
  ]

  const studentsMembers: RoomPerson[] = [
    { id: 101, name: 'Nguyễn Văn A', role: 'STUDENT_LEADER', major: 'KTPM' },
    { id: 102, name: 'Trần Thị B', role: 'STUDENT_MEMBER', major: 'KTPM' },
    { id: 103, name: 'Lê Hoàng C', role: 'STUDENT_MEMBER', major: 'KTPM' },
  ]

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-primary/20 bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-in slide-in-from-bottom-3 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Main Mode Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
        <div className="flex items-center gap-1 rounded-xl border border-hairline bg-canvas p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveMainTab('GRID')}
            className={`rounded-lg px-4 py-2 font-bold transition-all ${
              activeMainTab === 'GRID'
                ? 'bg-surface text-primary shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            📅 Lưới lịch bảo vệ (Timetable Grid)
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('ROOM_CANVAS')}
            className={`rounded-lg px-4 py-2 font-bold transition-all ${
              activeMainTab === 'ROOM_CANVAS'
                ? 'bg-surface text-primary shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            🏛️ Sơ đồ bố trí phòng 2D (Room Canvas)
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('CHANGE_REQUESTS')}
            className={`rounded-lg px-4 py-2 font-bold transition-all ${
              activeMainTab === 'CHANGE_REQUESTS'
                ? 'bg-surface text-primary shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            📑 Quản lý đơn đổi phòng (1 đơn chờ duyệt)
          </button>
        </div>

        <div className="text-xs text-ink-muted">
          Đợt đồ án: <strong className="text-ink">K18 Fall 2026</strong> · Khung giờ: <strong>Hành chính (08:00 – 17:45)</strong>
        </div>
      </div>

      {/* TAB 1: Timetable Grid */}
      {activeMainTab === 'GRID' && (
        <DefenseTimetableGrid
          currentDate={currentDate}
          rooms={rooms}
          sessions={sessions}
          onDateChange={setCurrentDate}
          onSelectSession={handleSelectSession}
          onEmptySlotClick={handleEmptySlotClick}
          onAutoScheduleClick={() => setIsAutoScheduleOpen(true)}
          onExportExcelClick={() => showToast('Đang xuất file Excel thời khóa biểu bảo vệ toàn đợt…')}
        />
      )}

      {/* TAB 2: Room Canvas Interactive 2D */}
      {activeMainTab === 'ROOM_CANVAS' && (
        <div className="space-y-4">
          {/* Room Selector Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-canvas/60 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink">Chọn phòng xem sơ đồ:</span>
              <div className="flex flex-wrap gap-1.5">
                {rooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setCanvasRoomCode(r.code)}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                      canvasRoomCode === r.code
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-surface border border-hairline text-ink hover:bg-canvas'
                    }`}
                  >
                    {r.code}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-ink-muted">
              {currentCanvasRoom.building} · Tầng {currentCanvasRoom.floor} · {currentCanvasRoom.capacity} chỗ ngồi
            </div>
          </div>

          {/* Render 2D Room Canvas */}
          <DefenseRoomCanvas
            roomCode={currentCanvasRoom.code}
            building={currentCanvasRoom.building}
            floor={currentCanvasRoom.floor}
            capacity={currentCanvasRoom.capacity}
            sessionTitle={currentCanvasSession?.projectTitle || 'Phiên bảo vệ Đồ án K18'}
            projectCode={currentCanvasSession?.projectCode || 'PRJ-2026-012'}
            status={currentCanvasSession ? 'ONGOING' : 'EMPTY'}
            committee={committeeMembers}
            students={studentsMembers}
            supervisor={{
              id: 99,
              name: 'ThS. Đỗ Hoàng Nam',
              role: 'SUPERVISOR',
              title: 'GV Hướng dẫn (Dự thính)',
              major: 'KTPM',
            }}
            elapsedMinutes={25}
            totalMinutes={45}
          />
        </div>
      )}

      {/* TAB 3: Change Requests Table */}
      {activeMainTab === 'CHANGE_REQUESTS' && (
        <div className="rounded-2xl border border-hairline bg-surface p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-ink">Danh sách Đơn yêu cầu đổi phòng & đổi lịch</h4>
              <p className="text-xs text-ink-muted">Trưởng bộ môn & Ban Đào tạo xem xét phê duyệt</p>
            </div>
            <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold">
              1 đơn chờ duyệt
            </span>
          </div>

          <div className="divide-y divide-hairline rounded-xl border border-hairline overflow-hidden">
            <div className="p-4 bg-canvas/30 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink text-sm">PRJ-2026-031</span>
                  <span className="rounded bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5">
                    CHỜ DUYỆT (PENDING)
                  </span>
                </div>
                <p className="text-ink-soft">Hệ thống Xe tự hành nhận diện biển báo giao thông Việt Nam</p>
                <div className="flex flex-wrap gap-4 text-[11px] text-ink-muted pt-1">
                  <span>Phòng cũ: <strong>A-202 (Slot 2, 20/11)</strong></span>
                  <span>➜ Mong muốn đổi sang: <strong className="text-primary">A-305 (Slot 4, 21/11)</strong></span>
                  <span>Lý do: <em>Cần không gian lớn hơn để demo mô hình xe chạy thực tế</em></span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => showToast('Đã từ chối đơn đổi phòng của PRJ-2026-031')}
                  className="rounded-lg border border-hairline px-3 py-1.5 font-semibold text-ink hover:bg-canvas transition-colors"
                >
                  Từ chối
                </button>
                <button
                  type="button"
                  onClick={() => showToast('Đã phê duyệt đổi sang phòng A-305 thành công!')}
                  className="rounded-lg bg-emerald-700 px-3.5 py-1.5 font-semibold text-white hover:bg-emerald-800 transition-colors shadow-xs"
                >
                  Phê duyệt đổi phòng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Drawer for Slot Details */}
      <DefenseSlotDetailDrawer
        isOpen={isDrawerOpen}
        session={selectedSession}
        onClose={() => setIsDrawerOpen(false)}
        onRequestReschedule={(_s) => {
          setIsRescheduleOpen(true)
        }}
        onCancelSession={(s) => {
          setSessions((prev) =>
            prev.map((item) => (item.id === s.id ? { ...item, status: 'CANCELLED' } : item))
          )
          showToast(`Đã hủy lịch bảo vệ của ${s.projectCode || s.projectId}`)
          setIsDrawerOpen(false)
        }}
      />

      {/* Auto Schedule Modal */}
      <AutoScheduleModal
        isOpen={isAutoScheduleOpen}
        rooms={rooms}
        onClose={() => setIsAutoScheduleOpen(false)}
        onApplySchedule={handleApplyAutoSchedule}
      />

      {/* Reschedule Request Modal */}
      <RescheduleRequestModal
        isOpen={isRescheduleOpen}
        session={selectedSession}
        rooms={rooms}
        onClose={() => setIsRescheduleOpen(false)}
        onSubmitSuccess={handleRescheduleSuccess}
      />
    </div>
  )
}
