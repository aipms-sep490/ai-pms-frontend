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
    { id: 2, name: 'ThS. Nguyễn Mai Phương', role: 'SECRETARY', title: 'Thư ký Hội đồng (Kế thừa Gate 1-3)', major: 'KTPM' },
    { id: 3, name: 'TS. Lê Văn Tuấn', role: 'REVIEWER', title: 'Giảng viên Phản biện 1', major: 'HTTT' },
    { id: 4, name: 'TS. Trần Đình Nam', role: 'REVIEWER', title: 'Giảng viên Phản biện 2', major: 'KTPM' },
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
    <div className="fixed inset-0 z-[var(--z-index-drawer)] flex justify-end overflow-hidden bg-brand-navy/40 backdrop-blur-xs">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-hairline bg-card shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-hairline bg-canvas/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-xs">
              {session.room}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-ink">
                  {session.projectCode || `Đồ án #${session.projectId}`}
                </h3>
                <span className="rounded-full border border-primary/20 bg-primary-subtle px-2 py-0.5 text-xs font-bold text-primary">
                  {session.status === 'SCHEDULED' ? 'Đã lên lịch' : session.status === 'CANCELLED' ? 'Đã hủy' : session.status === 'COMPLETED' ? 'Đã hoàn thành' : session.status}
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Phòng {session.room} · Ca {session.slotNumber || 1} ({new Date(session.startAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} – {new Date(session.endAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-ink-muted transition-colors hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-hairline bg-card px-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`min-h-11 border-b-2 px-3 py-3 transition-colors ${
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
            className={`min-h-11 border-b-2 px-3 py-3 transition-colors ${
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
            className={`min-h-11 border-b-2 px-3 py-3 transition-colors ${
              activeTab === 'RESCHEDULE'
                ? 'border-primary text-primary'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            Yêu cầu đổi phòng {session.hasChangeRequest && '⚠️'}
          </button>
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* Project Title Card */}
              <div className="rounded-xl border border-hairline bg-canvas/50 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Tên đề tài đồ án</span>
                <h4 className="mt-1 text-sm font-bold text-ink">
                  {session.projectTitle || 'Hệ thống Quản lý Tiến độ Đồ án Tốt nghiệp Thông minh'}
                </h4>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md border border-hairline bg-card px-2 py-0.5 text-ink-muted">
                    Mã đợt: K18 Fall 2026
                  </span>
                  <span className="rounded-md border border-hairline bg-card px-2 py-0.5 text-ink-muted">
                    Ngành: Kỹ thuật phần mềm (SE)
                  </span>
                </div>
              </div>

              {/* Evaluator & Rubrics Workflow Section */}
              <div className="space-y-3 rounded-xl border border-primary/20 bg-primary-subtle/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">fact_check</span>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-primary">Quy trình & Bộ Rubrics áp dụng</h5>
                  </div>
                  <span className="rounded-full border border-primary/20 bg-card px-2.5 py-0.5 text-xs font-bold text-primary">
                    4 Evaluators
                  </span>
                </div>
                <p className="text-xs text-ink-muted">
                  Thành viên hội đồng đóng vai trò là <strong>Evaluator</strong>, thực hiện đánh giá độc lập dựa trên quy trình bảo vệ Gate 4 và bộ Rubrics chuẩn được phê duyệt cho nhóm.
                </p>
                <div className="space-y-1 rounded-lg border border-hairline bg-card p-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Bộ Rubric:</span>
                    <span className="font-semibold text-ink">RUBRIC-DEFENSE-FA26 (100% trọng số)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Phạm vi chấm:</span>
                    <span className="font-semibold text-ink">COMMON + MAJOR-SPECIFIC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Tính kế thừa:</span>
                    <span className="font-semibold text-status-success-text">✓ 1 thành viên kế thừa từ Gate 1-3</span>
                  </div>
                </div>
                <a
                  href="/evaluator/workspace"
                  className="inline-flex min-h-11 items-center gap-1.5 pt-1 text-xs font-bold text-primary underline hover:text-primary-hover"
                >
                  <span>Mở không gian chấm điểm Rubric (Evaluator Workspace)</span>
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">open_in_new</span>
                </a>
              </div>

              {/* Committee Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-ink">
                    Hội đồng Thẩm định & Đánh giá ({committeeMock.length} thành viên)
                  </h5>
                  <span className="text-xs font-medium text-primary">HĐ #{session.committeeId}</span>
                </div>
                <div className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-card">
                  {committeeMock.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
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
                <div className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-card">
                  {studentsMock.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-tag-se-bg font-bold text-tag-se">
                          {s.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-ink">{s.name}</div>
                          <div className="text-xs text-ink-muted">{s.role === 'STUDENT_LEADER' ? 'Trưởng nhóm' : 'Thành viên'}</div>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-ink-muted">MSSV: SE150{s.id}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supervisor Observing */}
              <div className="flex items-center justify-between rounded-xl border border-dashed border-status-warning-border bg-status-warning-bg p-3.5 text-xs">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-status-warning-text">Giảng viên hướng dẫn</span>
                  <p className="font-bold text-ink">{supervisorMock.name}</p>
                  <p className="text-xs text-ink-muted">{supervisorMock.title} · (Dự thính, không tham gia chấm điểm)</p>
                </div>
                <span className="rounded-full border border-status-warning-border bg-card px-2.5 py-1 text-xs font-semibold text-status-warning-text">
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
                <h5 className="text-xs font-bold uppercase tracking-wider text-ink">Tình trạng yêu cầu đổi phòng</h5>
                {session.hasChangeRequest ? (
                  <div className="mt-3 space-y-1 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-xs text-status-warning-text">
                    <p className="font-bold">⚠️ Có yêu cầu đổi phòng đang chờ Trưởng bộ môn phê duyệt</p>
                    <p className="text-xs text-status-warning-text">Lý do: Phòng A-201 gặp sự cố máy chiếu, nhóm cần đổi sang phòng A-204.</p>
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
                  className="min-h-11 w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-primary-hover"
                >
                  + Tạo đơn yêu cầu đổi phòng / đổi giờ
                </button>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="flex items-center justify-between border-t border-hairline bg-canvas/60 px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-11 rounded-lg border border-hairline bg-card px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-canvas"
            >
              📄 In biên bản bảo vệ
            </button>
            {onCancelSession && session.canCancel && (
              <button
                type="button"
                onClick={() => onCancelSession(session)}
                className="min-h-11 rounded-lg border border-status-error-border bg-status-error-bg/30 px-3 py-1.5 text-xs font-semibold text-status-error-text transition-colors hover:bg-status-error-bg"
              >
                Hủy lịch
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-hairline bg-card px-4 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-canvas"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
