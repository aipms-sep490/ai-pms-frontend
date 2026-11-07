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
  SECRETARY: { bg: 'bg-teal-600 text-white', text: 'text-teal-700', label: 'Thư ký HĐ' },
  REVIEWER: { bg: 'bg-sky-600 text-white', text: 'text-sky-700', label: 'Ủy viên / PB' },
  SUPERVISOR: { bg: 'bg-amber-600 text-white', text: 'text-amber-700', label: 'GV Hướng dẫn (Dự thính)' },
  STUDENT_LEADER: { bg: 'bg-indigo-600 text-white', text: 'text-indigo-700', label: 'Trưởng nhóm SV' },
  STUDENT_MEMBER: { bg: 'bg-slate-700 text-white', text: 'text-slate-800', label: 'Sinh viên' },
  AUDIENCE: { bg: 'bg-slate-400 text-white', text: 'text-slate-600', label: 'Khách dự' },
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
    <div className="flex flex-col rounded-2xl border border-hairline bg-surface shadow-xs overflow-hidden">
      {/* Canvas Header / Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas/60 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
            {roomCode}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-ink">Phòng {roomCode} — Sơ đồ bảo vệ trực quan</h4>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                status === 'ONGOING'
                  ? 'bg-emerald-100 text-emerald-800 animate-pulse'
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
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
              <span className="font-semibold">Thời gian Q&A:</span>
              <span>{elapsedMinutes}/{totalMinutes} phút</span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-emerald-200">
                <div className="h-full bg-emerald-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}

          <div className="flex rounded-lg border border-hairline bg-canvas p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('2D_CANVAS')}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                viewMode === '2D_CANVAS' ? 'bg-surface text-primary shadow-xs font-semibold' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Sơ đồ 2D
            </button>
            <button
              type="button"
              onClick={() => setViewMode('SEATING_LIST')}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                viewMode === 'SEATING_LIST' ? 'bg-surface text-primary shadow-xs font-semibold' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Danh sách chỗ ngồi
            </button>
          </div>
        </div>
      </div>

      {/* Main Body */}
      {viewMode === '2D_CANVAS' ? (
        <div className="relative p-6 bg-slate-50/50 flex flex-col items-center">
          {/* 2D Interactive SVG Room Canvas */}
          <div className="w-full max-w-4xl bg-surface rounded-2xl border border-slate-200 p-6 shadow-sm">
            {/* Top Area: Stage / Projector / Whiteboards / Presentation */}
            <div className="relative border-b-2 border-dashed border-slate-200 pb-8 mb-8">
              <div className="text-center mb-4">
                <span className="inline-block rounded-md bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 tracking-wider uppercase">
                  Khu vực Thuyết trình & Trình chiếu Demo
                </span>
              </div>

              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Left Whiteboard */}
                <div className="col-span-3 h-20 rounded-xl border-2 border-slate-300 bg-white shadow-inner flex flex-col items-center justify-center text-xs text-slate-400 font-medium">
                  <span>Bảng viết 01</span>
                </div>

                {/* Center Projector Screen (FAMS / AI-PMS Presentation) */}
                <div className="col-span-6 h-28 rounded-xl bg-slate-900 border-4 border-slate-800 shadow-md flex flex-col items-center justify-center p-3 text-center text-white relative overflow-hidden group">
                  <div className="absolute top-2 left-3 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-[10px] text-slate-400 font-mono">PROJECTOR ON</span>
                  </div>
                  <p className="text-xs font-bold text-teal-300 line-clamp-1">{projectCode ? `[${projectCode}]` : ''} {sessionTitle}</p>
                  <p className="text-[11px] text-slate-300 mt-1">Trình chiếu Slide & Demo trực tiếp</p>
                </div>

                {/* Right Presentation Podium & Student Presenters */}
                <div className="col-span-3 flex flex-col items-center justify-center">
                  <div className="w-full h-14 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-xs font-bold text-amber-800 shadow-xs mb-2">
                    Bục phát biểu & Demo
                  </div>
                  <div className="flex items-center gap-1.5">
                    {students.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handleSelect(student)}
                        title={`${student.name} (${roleBadgeColor[student.role]?.label || 'SV'})`}
                        className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-transform hover:scale-110 focus:ring-2 focus:ring-primary ${
                          student.role === 'STUDENT_LEADER'
                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                            : 'bg-slate-700 text-white'
                        }`}
                      >
                        {student.name.slice(0, 1).toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 font-medium">Nhóm sinh viên ({students.length})</span>
                </div>
              </div>
            </div>

            {/* Middle Area: Committee Desk (Hội đồng chấm điểm) */}
            <div className="mb-8">
              <div className="text-center mb-3">
                <span className="inline-block rounded-md bg-teal-50 border border-teal-200 px-3 py-1 text-[11px] font-bold text-teal-800 tracking-wider uppercase">
                  Bàn Hội đồng Thẩm định & Đánh giá
                </span>
              </div>

              {/* Committee Table Surface */}
              <div className="rounded-xl border-2 border-teal-500/40 bg-teal-50/30 p-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-around gap-4">
                  {committee.map((member) => {
                    const badge = roleBadgeColor[member.role] || roleBadgeColor.REVIEWER
                    const isSelected = selectedPerson?.id === member.id
                    return (
                      <div
                        key={member.id}
                        onClick={() => handleSelect(member)}
                        className={`cursor-pointer flex flex-col items-center rounded-xl p-2.5 transition-all ${
                          isSelected ? 'bg-white shadow-md ring-2 ring-primary scale-105' : 'hover:bg-white/70'
                        }`}
                      >
                        <div className={`h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold shadow-xs ${badge.bg}`}>
                          {member.name.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="mt-2 text-xs font-bold text-slate-800 line-clamp-1 max-w-[120px] text-center">
                          {member.name}
                        </span>
                        <span className="text-[10px] text-slate-500 line-clamp-1">{badge.label}</span>
                        {member.major && <span className="text-[9px] text-teal-700 font-medium">[{member.major}]</span>}
                      </div>
                    )
                  })}

                  {/* Supervisor Desk (Adjacent / Observing) */}
                  {supervisor && (
                    <div
                      onClick={() => handleSelect(supervisor)}
                      className={`cursor-pointer flex flex-col items-center rounded-xl p-2.5 border border-dashed border-amber-300 transition-all ${
                        selectedPerson?.id === supervisor.id ? 'bg-white shadow-md ring-2 ring-amber-500 scale-105' : 'hover:bg-amber-50/50'
                      }`}
                    >
                      <div className="h-11 w-11 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                        {supervisor.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="mt-2 text-xs font-bold text-slate-800 line-clamp-1 max-w-[120px] text-center">
                        {supervisor.name}
                      </span>
                      <span className="text-[10px] text-amber-700 font-medium">GV Hướng dẫn</span>
                      <span className="text-[9px] text-slate-400">(Dự thính)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Area: Audience / Guest Seating Rows */}
            <div>
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Khu vực Khán giả & Sinh viên dự thính ({capacity - committee.length - students.length - (supervisor ? 1 : 0)} ghế trống)
                </span>
                <span className="text-[11px] text-slate-400">Dãy ghế A – D</span>
              </div>

              {/* Grid of Seats */}
              <div className="grid grid-cols-8 gap-2 bg-slate-100/70 p-4 rounded-xl border border-slate-200">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    title={`Ghế #${i + 1}`}
                    className="h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center text-[10px] font-medium text-slate-400 hover:border-primary hover:text-primary transition-colors cursor-pointer"
                  >
                    G{i + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Seat Pop-over / Details */}
          {selectedPerson && (
            <div className="mt-4 w-full max-w-4xl rounded-xl border border-primary/20 bg-primary-subtle/30 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${roleBadgeColor[selectedPerson.role]?.bg || 'bg-slate-700 text-white'}`}>
                  {selectedPerson.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-bold text-ink">{selectedPerson.name}</h5>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-ink-muted border border-hairline">
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
                className="text-xs text-ink-muted hover:text-ink font-semibold px-2 py-1"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Seating List Tab */
        <div className="p-5 space-y-4">
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-teal-800 mb-2">Hội đồng thẩm định ({committee.length})</h5>
            <div className="divide-y divide-hairline rounded-xl border border-hairline bg-surface overflow-hidden">
              {committee.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${roleBadgeColor[member.role]?.bg || 'bg-slate-700 text-white'}`}>
                      {roleBadgeColor[member.role]?.label}
                    </span>
                    <span className="font-bold text-ink">{member.name}</span>
                    <span className="text-ink-muted">{member.title}</span>
                  </div>
                  {member.major && <span className="font-medium text-teal-700">Ngành {member.major}</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-800 mb-2">Nhóm sinh viên bảo vệ ({students.length})</h5>
            <div className="divide-y divide-hairline rounded-xl border border-hairline bg-surface overflow-hidden">
              {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${roleBadgeColor[student.role]?.bg || 'bg-slate-700 text-white'}`}>
                      {roleBadgeColor[student.role]?.label}
                    </span>
                    <span className="font-bold text-ink">{student.name}</span>
                  </div>
                  <span className="text-ink-muted font-mono">{student.major || 'CNTT'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
