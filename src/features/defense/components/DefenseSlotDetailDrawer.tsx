import React, { useState } from 'react'
import { DefenseRoomCanvas, type RoomPerson } from './DefenseRoomCanvas'
import type { DefenseSessionExtended } from './DefenseTimetableGrid'

export interface DefenseSlotDetailDrawerProps {
  isOpen: boolean
  session: DefenseSessionExtended | null
  onClose: () => void
  onRequestReschedule?: (session: DefenseSessionExtended) => void
  onCancelSession?: (session: DefenseSessionExtended) => void
}

export const DefenseSlotDetailDrawer: React.FC<DefenseSlotDetailDrawerProps> = ({
  isOpen,
  session,
  onClose,
  onRequestReschedule,
  onCancelSession,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ROOM_CANVAS' | 'RESCHEDULE'>('OVERVIEW')

  if (!isOpen || !session) return null

  // Mock / Default Committee data for canvas preview
  const committeeMock: RoomPerson[] = [
    { id: 1, name: 'TS. Phạm Quốc Dũng', role: 'CHAIR', title: 'Chủ tịch Hội đồng', major: 'KTPM' },
    { id: 2, name: 'ThS. Nguyễn Mai Phương', role: 'SECRETARY', title: 'Thư ký Hội đồng', major: 'KTPM' },
    { id: 3, name: 'TS. Lê Văn Tuấn', role: 'REVIEWER', title: 'Giảng viên Phản biện', major: 'HTTT' },
  ]

  const studentsMock: RoomPerson[] = [
    { id: 101, name: 'Nguyễn Văn A', role: 'STUDENT_LEADER', isPresenter: true, major: 'KTPM' },
    { id: 102, name: 'Trần Thị B', role: 'STUDENT_MEMBER', isPresenter: true, major: 'KTPM' },
    { id: 103, name: 'Lê Hoàng C', role: 'STUDENT_MEMBER', isPresenter: true, major: 'KTPM' },
  ]

  const supervisorMock: RoomPerson = {
    id: 99,
    name: 'ThS. Đỗ Hoàng Nam',
    role: 'SUPERVISOR',
    title: 'Giảng viên hướng dẫn',
    major: 'KTPM',
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="w-full max-w-2xl bg-surface shadow-2xl flex flex-col h-full border-l border-hairline animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4 bg-canvas/40">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white font-bold text-sm shadow-xs">
              {session.room}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-ink">
                  {session.projectCode || `Đồ án #${session.projectId}`}
                </h3>
                <span className="rounded-full bg-primary-subtle text-primary border border-primary/20 px-2 py-0.5 text-xs font-bold">
                  {session.status === 'SCHEDULED' ? 'Đã lên lịch' : session.status}
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Phòng {session.room} · Ca {session.slotNumber || 1} ({new Date(session.startAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} – {new Date(session.endAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ink-muted hover:bg-canvas hover:text-ink transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-hairline px-6 bg-surface text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              activeTab === 'OVERVIEW'
                ? 'border-primary text-primary'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            Thông tin ca bảo vệ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ROOM_CANVAS')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              activeTab === 'ROOM_CANVAS'
                ? 'border-primary text-primary'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            Sơ đồ phòng 2D
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RESCHEDULE')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              activeTab === 'RESCHEDULE'
                ? 'border-primary text-primary'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            Yêu cầu đổi phòng {session.hasChangeRequest && '⚠️'}
          </button>
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* Project Title Card */}
              <div className="rounded-xl border border-hairline bg-canvas/50 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Tên đề tài đồ án</span>
                <h4 className="text-sm font-bold text-ink mt-1">
                  {session.projectTitle || 'Hệ thống Quản lý Tiến độ Đồ án Tốt nghiệp Thông minh'}
                </h4>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md bg-surface border border-hairline px-2 py-0.5 text-ink-muted">
                    Mã đợt: K18 Fall 2026
                  </span>
                  <span className="rounded-md bg-surface border border-hairline px-2 py-0.5 text-ink-muted">
                    Ngành: Kỹ thuật phần mềm (SE)
                  </span>
                </div>
              </div>

              {/* Committee Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-ink">
                    Hội đồng Thẩm định & Đánh giá ({committeeMock.length} thành viên)
                  </h5>
                  <span className="text-xs text-teal-700 font-medium">HĐ #{session.committeeId}</span>
                </div>
                <div className="divide-y divide-hairline rounded-xl border border-hairline bg-surface overflow-hidden">
                  {committeeMock.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {m.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-ink">{m.name}</div>
                          <div className="text-xs text-ink-muted">{m.title}</div>
                        </div>
                      </div>
                      <span className="rounded bg-canvas px-2 py-0.5 text-xs font-semibold text-ink-soft">
                        {m.major}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Students Section */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-ink">
                  Nhóm sinh viên thực hiện ({studentsMock.length} thành viên)
                </h5>
                <div className="divide-y divide-hairline rounded-xl border border-hairline bg-surface overflow-hidden">
                  {studentsMock.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                          {s.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-ink">{s.name}</div>
                          <div className="text-xs text-ink-muted">{s.role === 'STUDENT_LEADER' ? 'Trưởng nhóm' : 'Thành viên'}</div>
                        </div>
                      </div>
                      <span className="text-ink-muted font-mono text-xs">MSSV: SE150{s.id}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supervisor Observing */}
              <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Giảng viên hướng dẫn</span>
                  <p className="font-bold text-ink">{supervisorMock.name}</p>
                  <p className="text-xs text-ink-muted">{supervisorMock.title} · (Dự thính, không tham gia chấm điểm)</p>
                </div>
                <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 text-xs font-semibold">
                  Tham dự
                </span>
              </div>
            </div>
          )}

          {activeTab === 'ROOM_CANVAS' && (
            <div className="space-y-4">
              <p className="text-xs text-ink-muted">
                Sơ đồ trực quan 2D mô phỏng không gian phòng {session.room}, bục thuyết trình của sinh viên, bàn hội đồng và hàng ghế khán giả.
              </p>
              <DefenseRoomCanvas
                roomCode={session.room}
                building="Tòa Alpha"
                floor={2}
                capacity={40}
                sessionTitle={session.projectTitle}
                projectCode={session.projectCode}
                status={session.status === 'SCHEDULED' ? 'SCHEDULED' : 'COMPLETED'}
                committee={committeeMock}
                students={studentsMock}
                supervisor={supervisorMock}
              />
            </div>
          )}

          {activeTab === 'RESCHEDULE' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-hairline bg-canvas/40 p-4">
                <h5 className="text-xs font-bold text-ink uppercase tracking-wider">Tình trạng yêu cầu đổi phòng</h5>
                {session.hasChangeRequest ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
                    <p className="font-bold">⚠️ Có yêu cầu đổi phòng đang chờ Trưởng bộ môn phê duyệt</p>
                    <p className="text-xs text-amber-700">Lý do: Phòng A-201 gặp sự cố máy chiếu, nhóm cần đổi sang phòng A-204.</p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-ink-muted">
                    Hiện chưa có yêu cầu đổi phòng hoặc đổi giờ nào cho buổi bảo vệ này.
                  </p>
                )}
              </div>

              {onRequestReschedule && (
                <button
                  type="button"
                  onClick={() => onRequestReschedule(session)}
                  className="w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors shadow-xs"
                >
                  + Tạo đơn yêu cầu đổi phòng / đổi giờ
                </button>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="flex items-center justify-between border-t border-hairline px-6 py-4 bg-canvas/60">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas transition-colors"
            >
              📄 In biên bản bảo vệ
            </button>
            {onCancelSession && session.canCancel && (
              <button
                type="button"
                onClick={() => onCancelSession(session)}
                className="rounded-lg border border-status-error-border bg-status-error-bg/30 px-3 py-1.5 text-xs font-semibold text-status-error-text hover:bg-status-error-bg transition-colors"
              >
                Hủy lịch
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-hairline bg-surface px-4 py-1.5 text-xs font-semibold text-ink hover:bg-canvas transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
