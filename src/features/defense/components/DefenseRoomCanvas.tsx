import React, { useState } from 'react'

export interface RoomPerson {
  id: number | string
  name: string
  role: 'CHAIR' | 'SECRETARY' | 'REVIEWER' | 'SUPERVISOR' | 'STUDENT_LEADER' | 'STUDENT_MEMBER' | 'AUDIENCE'
  title?: string
  major?: string
  avatar?: string
  isPresenter?: boolean
}

export interface DefenseRoomCanvasProps {
  roomCode: string
  building: string
  floor: number
  capacity: number
  sessionTitle?: string
  projectCode?: string
  status?: 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'EMPTY'
  committee: RoomPerson[]
  students: RoomPerson[]
  supervisor?: RoomPerson
  elapsedMinutes?: number
  totalMinutes?: number
  onSeatClick?: (person: RoomPerson) => void
}

const roleBadgeColor: Record<string, { bg: string; text: string; label: string }> = {
  CHAIR: { bg: 'bg-primary text-white', text: 'text-primary', label: 'Chủ tịch HĐ' },
  SECRETARY: { bg: 'border border-tag-ai/25 bg-tag-ai-bg text-tag-ai', text: 'text-tag-ai', label: 'Thư ký HĐ' },
  REVIEWER: { bg: 'border border-tag-se/25 bg-tag-se-bg text-tag-se', text: 'text-tag-se', label: 'Ủy viên / PB' },
  SUPERVISOR: { bg: 'border border-tag-uiux/25 bg-tag-uiux-bg text-tag-uiux', text: 'text-tag-uiux', label: 'GV Hướng dẫn (Dự thính)' },
  STUDENT_LEADER: { bg: 'border border-tag-qa/25 bg-tag-qa-bg text-tag-qa', text: 'text-tag-qa', label: 'Trưởng nhóm SV' },
  STUDENT_MEMBER: { bg: 'border border-tag-is/25 bg-tag-is-bg text-tag-is', text: 'text-tag-is', label: 'Sinh viên' },
  AUDIENCE: { bg: 'border border-hairline bg-canvas text-ink-soft', text: 'text-ink-muted', label: 'Khách dự' },
}

export const DefenseRoomCanvas: React.FC<DefenseRoomCanvasProps> = ({
  roomCode,
  building,
  floor,
  capacity,
  sessionTitle = 'Phiên bảo vệ Đồ án Tốt nghiệp',
  projectCode,
  status = 'SCHEDULED',
  committee,
  students,
  supervisor,
  elapsedMinutes = 25,
  totalMinutes = 45,
  onSeatClick,
}) => {
  const [selectedPerson, setSelectedPerson] = useState<RoomPerson | null>(null)
  const [viewMode, setViewMode] = useState<'2D_CANVAS' | 'SEATING_LIST'>('2D_CANVAS')

  const handleSelect = (person: RoomPerson) => {
    setSelectedPerson(person)
    onSeatClick?.(person)
  }

  const progressPercent = Math.min(100, Math.round((elapsedMinutes / totalMinutes) * 100))

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs">
      {/* Canvas Header / Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas/60 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
            {roomCode}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-ink">Phòng {roomCode} — Sơ đồ bảo vệ trực quan</h4>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                status === 'ONGOING'
                  ? 'border border-status-success-border bg-status-success-bg text-status-success-text motion-safe:animate-pulse'
                  : status === 'SCHEDULED'
                  ? 'bg-primary-subtle text-primary'
                  : 'bg-canvas text-ink-muted'
              }`}>
                {status === 'ONGOING' ? '● Đang bảo vệ' : status === 'SCHEDULED' ? 'Đã lên lịch' : 'Trống'}
              </span>
            </div>
            <p className="text-xs text-ink-muted">
              {building} · Tầng {floor} · Sức chứa {capacity} chỗ ngồi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === 'ONGOING' && (
            <div className="flex items-center gap-2 rounded-lg border border-status-success-border bg-status-success-bg px-3 py-1.5 text-xs text-status-success-text">
              <span className="font-semibold">Thời gian Q&A:</span>
              <span>{elapsedMinutes}/{totalMinutes} phút</span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-canvas">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}

          <div className="flex rounded-lg border border-hairline bg-canvas p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('2D_CANVAS')}
              className={`min-h-9 rounded-md px-3 py-1 font-medium transition-colors ${
                viewMode === '2D_CANVAS' ? 'bg-card font-semibold text-primary shadow-xs' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Sơ đồ 2D
            </button>
            <button
              type="button"
              onClick={() => setViewMode('SEATING_LIST')}
              className={`min-h-9 rounded-md px-3 py-1 font-medium transition-colors ${
                viewMode === 'SEATING_LIST' ? 'bg-card font-semibold text-primary shadow-xs' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Danh sách chỗ ngồi
            </button>
          </div>
        </div>
      </div>

      {/* Main Body */}
      {viewMode === '2D_CANVAS' ? (
        <div className="relative flex flex-col items-center bg-canvas/50 p-6">
          {/* 2D Interactive SVG Room Canvas */}
          <div className="w-full max-w-4xl rounded-2xl border border-hairline bg-card p-6 shadow-sm">
            {/* Top Area: Stage / Projector / Whiteboards / Presentation */}
            <div className="relative mb-8 border-b-2 border-dashed border-hairline pb-8">
              <div className="mb-4 text-center">
                <span className="inline-block rounded-md border border-hairline bg-canvas px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Khu vực Thuyết trình & Trình chiếu Demo
                </span>
              </div>

              <div className="grid grid-cols-12 items-center gap-4">
                {/* Left Whiteboard */}
                <div className="col-span-3 flex h-20 flex-col items-center justify-center rounded-xl border-2 border-hairline bg-card text-xs font-medium text-ink-muted shadow-inner">
                  <span>Bảng viết 01</span>
                </div>

                {/* Center Projector Screen (FAMS / PMS Presentation) */}
                <div className="group relative col-span-6 flex h-28 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-primary/30 bg-primary-subtle/40 p-3 text-center text-ink shadow-xs">
                  <div className="absolute top-2 left-3 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-status-success-text motion-safe:animate-pulse" />
                    <span className="font-mono text-xs font-semibold text-primary">PROJECTOR ON</span>
                  </div>
                  <p className="mt-2 line-clamp-1 text-xs font-bold text-ink">{projectCode ? `[${projectCode}]` : ''} {sessionTitle}</p>
                  <p className="mt-1 text-xs text-ink-soft">Trình chiếu Slide & Demo trực tiếp</p>
                </div>

                {/* Right Presentation Podium & Student Presenters */}
                <div className="col-span-3 flex flex-col items-center justify-center">
                  <div className="mb-2 flex h-14 w-full items-center justify-center rounded-lg border border-status-warning-border bg-status-warning-bg text-xs font-bold text-status-warning-text shadow-xs">
                    Bục phát biểu & Demo
                  </div>
                  <div className="flex items-center gap-1.5">
                    {students.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handleSelect(student)}
                        title={`${student.name} (${roleBadgeColor[student.role]?.label || 'SV'})`}
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-transform hover:scale-110 focus:ring-2 focus:ring-primary ${
                          student.role === 'STUDENT_LEADER'
                            ? 'border border-tag-qa/25 bg-tag-qa-bg text-tag-qa ring-2 ring-primary/30'
                            : 'border border-tag-is/25 bg-tag-is-bg text-tag-is'
                        }`}
                      >
                        {student.name.slice(0, 1).toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <span className="mt-1 text-xs font-medium text-ink-muted">Nhóm sinh viên ({students.length})</span>
                </div>
              </div>
            </div>

            {/* Middle Area: Committee Desk (Hội đồng chấm điểm) */}
            <div className="mb-8">
              <div className="mb-3 text-center">
                <span className="inline-block rounded-md border border-primary/20 bg-primary-subtle px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                  Bàn Hội đồng Thẩm định & Đánh giá
                </span>
              </div>

              {/* Committee Table Surface */}
              <div className="rounded-xl border-2 border-primary/30 bg-primary-subtle/20 p-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-around gap-4">
                  {committee.map((member) => {
                    const badge = roleBadgeColor[member.role] || roleBadgeColor.REVIEWER
                    const isSelected = selectedPerson?.id === member.id
                    return (
                      <div
                        key={member.id}
                        onClick={() => handleSelect(member)}
                        className={`flex cursor-pointer flex-col items-center rounded-xl p-2.5 transition-all ${
                          isSelected ? 'scale-105 bg-card shadow-md ring-2 ring-primary' : 'hover:bg-card/80'
                        }`}
                      >
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold shadow-xs ${badge.bg}`}>
                          {member.name.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="mt-2 line-clamp-1 max-w-[120px] text-center text-xs font-bold text-ink">
                          {member.name}
                        </span>
                        <span className="line-clamp-1 text-xs text-ink-muted">{badge.label}</span>
                        {member.major && <span className="text-xs font-medium text-primary">[{member.major}]</span>}
                      </div>
                    )
                  })}

                  {/* Supervisor Desk (Adjacent / Observing) */}
                  {supervisor && (
                    <div
                      onClick={() => handleSelect(supervisor)}
                      className={`flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-status-warning-border p-2.5 transition-all ${
                        selectedPerson?.id === supervisor.id ? 'scale-105 bg-card shadow-md ring-2 ring-primary' : 'hover:bg-status-warning-bg/50'
                      }`}
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-tag-uiux/25 bg-tag-uiux-bg text-sm font-bold text-tag-uiux shadow-xs">
                        {supervisor.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="mt-2 line-clamp-1 max-w-[120px] text-center text-xs font-bold text-ink">
                        {supervisor.name}
                      </span>
                      <span className="text-xs font-medium text-tag-uiux">GV Hướng dẫn</span>
                      <span className="text-xs text-ink-muted">(Dự thính)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Area: Audience / Guest Seating Rows */}
            <div>
              <div className="mb-3 flex items-center justify-between px-2">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Khu vực Khán giả & Sinh viên dự thính ({capacity - committee.length - students.length - (supervisor ? 1 : 0)} ghế trống)
                </span>
                <span className="text-xs text-ink-muted">Dãy ghế A – D</span>
              </div>

              {/* Grid of Seats */}
              <div className="grid grid-cols-8 gap-2 rounded-xl border border-hairline bg-canvas p-4">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    title={`Ghế #${i + 1}`}
                    className="flex h-8 cursor-pointer items-center justify-center rounded-md border border-hairline bg-card text-xs font-medium text-ink-muted transition-colors hover:border-primary hover:text-primary"
                  >
                    G{i + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Seat Pop-over / Details */}
          {selectedPerson && (
            <div className="mt-4 flex w-full max-w-4xl items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary-subtle/30 p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${roleBadgeColor[selectedPerson.role]?.bg || 'border border-hairline bg-canvas text-ink-soft'}`}>
                  {selectedPerson.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-bold text-ink">{selectedPerson.name}</h5>
                    <span className="rounded-full border border-hairline bg-card px-2 py-0.5 text-xs font-bold text-ink-muted">
                      {roleBadgeColor[selectedPerson.role]?.label || 'Thành viên'}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    {selectedPerson.title || 'Hội đồng chuyên môn'} {selectedPerson.major ? `· Chuyên ngành: ${selectedPerson.major}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPerson(null)}
                className="min-h-11 px-2 py-1 text-xs font-semibold text-ink-muted hover:text-ink"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Seating List Tab */
        <div className="space-y-4 p-5">
          <div>
            <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Hội đồng thẩm định ({committee.length})</h5>
            <div className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-card">
              {committee.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${roleBadgeColor[member.role]?.bg || 'border border-hairline bg-canvas text-ink-soft'}`}>
                      {roleBadgeColor[member.role]?.label}
                    </span>
                    <span className="font-bold text-ink">{member.name}</span>
                    <span className="text-ink-muted">{member.title}</span>
                  </div>
                  {member.major && <span className="font-medium text-primary">Ngành {member.major}</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-tag-qa">Nhóm sinh viên bảo vệ ({students.length})</h5>
            <div className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-card">
              {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${roleBadgeColor[student.role]?.bg || 'border border-hairline bg-canvas text-ink-soft'}`}>
                      {roleBadgeColor[student.role]?.label}
                    </span>
                    <span className="font-bold text-ink">{student.name}</span>
                  </div>
                  <span className="font-mono text-ink-muted">{student.major || 'CNTT'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
