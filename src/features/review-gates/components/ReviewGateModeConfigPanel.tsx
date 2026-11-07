import React, { useState } from 'react'
import type { GateDeliveryMode, GateSessionScript } from '../types/gate-session-script.types'
import { GateSessionScriptModal } from './GateSessionScriptModal'

export interface GateModeItem {
  gateCode: string
  gateTitle: string
  mode: GateDeliveryMode
  roomCode?: string
  building?: string
  floor?: number
  liveKitRoomName?: string
  scheduledDate: string
  timeRange: string
  status: 'PLANNED' | 'IN_PROGRESS' | 'PASSED' | 'REVISION_REQUIRED'
}

export const INITIAL_GATE_MODES: GateModeItem[] = [
  {
    gateCode: 'R1',
    gateTitle: 'Đề cương & Đặc tả yêu cầu (SRS)',
    mode: 'ONLINE',
    liveKitRoomName: 'livekit-gate-r1-prj012',
    scheduledDate: '2026-11-15',
    timeRange: '08:00 – 09:15',
    status: 'PASSED',
  },
  {
    gateCode: 'R2',
    gateTitle: 'Kiến trúc hệ thống & Báo cáo giữa kỳ (SDD)',
    mode: 'ONLINE',
    liveKitRoomName: 'livekit-gate-r2-prj012',
    scheduledDate: '2026-11-20',
    timeRange: '09:30 – 10:45',
    status: 'IN_PROGRESS',
  },
  {
    gateCode: 'R3',
    gateTitle: 'Tiền nghiệm thu & Kiểm thử chấp nhận (UAT)',
    mode: 'OFFLINE',
    roomCode: 'A-201',
    building: 'Tòa Alpha',
    floor: 2,
    scheduledDate: '2026-11-25',
    timeRange: '13:30 – 14:45',
    status: 'PLANNED',
  },
  {
    gateCode: 'R4',
    gateTitle: 'Bảo vệ Đồ án Tốt nghiệp chính thức',
    mode: 'OFFLINE',
    roomCode: 'A-202',
    building: 'Tòa Alpha',
    floor: 2,
    scheduledDate: '2026-11-28',
    timeRange: '08:00 – 09:15',
    status: 'PLANNED',
  },
]

export interface ReviewGateModeConfigPanelProps {
  projectId: number | string
  projectCode: string
  projectTitle: string
  onOpenRoomCanvas?: (roomCode: string) => void
  onJoinLiveKit?: (roomName: string) => void
}

export const ReviewGateModeConfigPanel: React.FC<ReviewGateModeConfigPanelProps> = ({
  projectId,
  projectCode,
  projectTitle,
  onOpenRoomCanvas,
  onJoinLiveKit,
}) => {
  const [gates, setGates] = useState<GateModeItem[]>(INITIAL_GATE_MODES)
  const [selectedScript, setSelectedScript] = useState<GateSessionScript | null>(null)
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleModeChange = (gateCode: string, newMode: GateDeliveryMode) => {
    setGates((prev) =>
      prev.map((g) => {
        if (g.gateCode !== gateCode) return g
        if (newMode === 'OFFLINE') {
          return {
            ...g,
            mode: 'OFFLINE',
            roomCode: g.roomCode || 'A-201',
            building: g.building || 'Tòa Alpha',
            floor: g.floor || 2,
          }
        }
        return {
          ...g,
          mode: 'ONLINE',
          liveKitRoomName: `livekit-gate-${gateCode.toLowerCase()}-${projectCode.toLowerCase()}`,
        }
      })
    )
    showToast(
      newMode === 'OFFLINE'
        ? `Đã chuyển Cổng ${gateCode} sang OFFLINE: Tự động phân bổ phòng họp tại trường!`
        : `Đã chuyển Cổng ${gateCode} sang ONLINE: Đã kết nối phòng LiveKit trên hệ thống!`
    )
  }

  const handleOpenScript = (gate: GateModeItem) => {
    const isOnline = gate.mode === 'ONLINE'
    const scriptData: GateSessionScript = {
      gateCode: gate.gateCode,
      gateTitle: gate.gateTitle,
      projectId,
      projectCode,
      projectTitle,
      mode: gate.mode,
      roomCode: gate.roomCode,
      building: gate.building,
      floor: gate.floor,
      liveKitRoomName: gate.liveKitRoomName,
      scheduledStartAt: `${gate.scheduledDate} ${gate.timeRange.split(' – ')[0]}`,
      scheduledEndAt: `${gate.scheduledDate} ${gate.timeRange.split(' – ')[1]}`,
      totalElapsedMinutes: isOnline ? 52 : undefined,
      presences: [
        {
          userId: 1,
          name: 'TS. Phạm Quốc Dũng',
          role: 'Chủ tịch HĐ',
          isPresent: true,
          joinedAt: '08:02',
          leftAt: '08:55',
          durationMinutes: 53,
        },
        {
          userId: 2,
          name: 'ThS. Nguyễn Mai Phương',
          role: 'Thư ký HĐ',
          isPresent: true,
          joinedAt: '08:00',
          leftAt: '08:55',
          durationMinutes: 55,
        },
        {
          userId: 3,
          name: 'TS. Lê Văn Tuấn',
          role: 'Ủy viên PB',
          isPresent: true,
          joinedAt: '08:05',
          leftAt: '08:54',
          durationMinutes: 49,
        },
        {
          userId: 101,
          name: 'Nguyễn Văn A',
          role: 'Trưởng nhóm SV',
          isPresent: true,
          joinedAt: '07:58',
          leftAt: '08:55',
          durationMinutes: 57,
        },
      ],
      agendaStages: [
        { stage: '1. Khai mạc phiên thẩm định & Điểm danh thành phần', durationMinutes: 5, status: 'COMPLETED' },
        { stage: '2. Nhóm sinh viên trình bày Slide & Demo hệ thống', durationMinutes: 25, status: 'COMPLETED' },
        { stage: '3. Giảng viên phản biện nhận xét & Hỏi đáp Q&A', durationMinutes: 20, status: 'IN_PROGRESS' },
        { stage: '4. Hội ý kín của Hội đồng & Chấm điểm Rubric', durationMinutes: 10, status: 'PENDING' },
        { stage: '5. Công bố kết luận & Nhắc thời hạn chỉnh sửa (5 ngày)', durationMinutes: 5, status: 'PENDING' },
      ],
      qaLog: [
        {
          id: 'qa-1',
          askerName: 'TS. Phạm Quốc Dũng',
          askerRole: 'CHAIR',
          question: 'Kiến trúc bảo mật token và phân quyền RBAC được triển khai ra sao khi có hai vai trò vừa là Sinh viên vừa là Trợ giảng?',
          answeredBy: 'Nguyễn Văn A',
          evaluation: 'SATISFACTORY',
        },
        {
          id: 'qa-2',
          askerName: 'TS. Lê Văn Tuấn',
          askerRole: 'REVIEWER',
          question: 'Cơ chế giải quyết xung đột lịch phòng học khi có hai hội đồng cùng đặt một phòng vào Slot 2?',
          answeredBy: 'Nguyễn Văn A',
          evaluation: 'SATISFACTORY',
        },
      ],
      remediationItems: [
        {
          id: 'rem-1',
          title: 'Bổ sung sơ đồ kiến trúc Clean Architecture vào phụ lục tài liệu SDD',
          assignee: 'Nguyễn Văn A',
          dueDate: '2026-11-25',
          required: true,
        },
      ],
      generalNotes: 'Nhóm nắm chắc kiến thức chuyên môn, demo mượt mà, trả lời thỏa đáng.',
      verdict: gate.status === 'PASSED' ? 'PASSED' : 'PENDING',
      signedBySecretary: 'ThS. Nguyễn Mai Phương',
      signedByChair: 'TS. Phạm Quốc Dũng',
    }
    setSelectedScript(scriptData)
    setIsScriptModalOpen(true)
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6 shadow-xs space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-primary/20 bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-in slide-in-from-bottom-3 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h3 className="text-base font-bold text-ink">
            Cấu hình Hình thức Tổ chức Cổng Thẩm định (Review Gates Mode)
          </h3>
          <p className="text-xs text-ink-muted">
            Chọn Online (LiveKit có ghi nhận thời gian) hoặc Offline (Tự động chia phòng họp tại trường) theo từng Cổng R1 – R4
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-canvas border border-hairline px-3 py-1 text-xs text-ink-soft">
            Đồ án: <strong className="text-ink">[{projectCode}] {projectTitle}</strong>
          </span>
        </div>
      </div>

      {/* Grid of Gates (R1 to R4) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gates.map((gate) => {
          const isOnline = gate.mode === 'ONLINE'
          return (
            <div
              key={gate.gateCode}
              className={`rounded-2xl border p-5 shadow-xs transition-all space-y-4 ${
                isOnline
                  ? 'border-sky-200 bg-sky-50/20 hover:border-sky-400'
                  : 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-400'
              }`}
            >
              {/* Gate Header & Mode Switcher */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-base shadow-xs ${
                    isOnline ? 'bg-sky-600 text-white' : 'bg-primary text-white'
                  }`}>
                    {gate.gateCode}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-ink">{gate.gateTitle}</h4>
                    <span className="text-xs text-ink-muted">
                      {gate.scheduledDate} · {gate.timeRange}
                    </span>
                  </div>
                </div>

                {/* Delivery Mode Toggle */}
                <div className="flex rounded-lg border border-hairline bg-surface p-0.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => handleModeChange(gate.gateCode, 'ONLINE')}
                    className={`rounded-md px-2.5 py-1 transition-colors ${
                      isOnline ? 'bg-sky-600 text-white shadow-xs' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    Online
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange(gate.gateCode, 'OFFLINE')}
                    className={`rounded-md px-2.5 py-1 transition-colors ${
                      !isOnline ? 'bg-primary text-white shadow-xs' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    Offline
                  </button>
                </div>
              </div>

              {/* Detail Info by Mode */}
              <div className="rounded-xl border border-hairline bg-surface/80 p-3.5 text-xs space-y-2">
                {isOnline ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sky-800 flex items-center gap-1.5">
                        <span>🌐</span>
                        <span>Họp Trực tuyến qua LiveKit</span>
                      </span>
                      <span className="text-xs text-emerald-700 font-medium">● Ghi nhận thời lượng tự động</span>
                    </div>
                    <p className="text-xs text-ink-muted">
                      Tự động ghi nhận thời gian bắt đầu/kết thúc thực tế và thời lượng có mặt của từng thành viên hội đồng.
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        {gate.liveKitRoomName}
                      </span>
                      {onJoinLiveKit && (
                        <button
                          type="button"
                          onClick={() => onJoinLiveKit(gate.liveKitRoomName || 'livekit-room')}
                          className="font-bold text-sky-700 hover:text-sky-900 underline"
                        >
                          Vào phòng LiveKit ↗
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                        <span>🏛️</span>
                        <span>Bảo vệ Trực tiếp tại trường</span>
                      </span>
                      <span className="text-xs text-emerald-700 font-bold">✓ Tự động phân chia phòng</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="font-bold text-ink text-sm mr-2">{gate.roomCode || 'A-201'}</span>
                        <span className="text-xs text-ink-muted">({gate.building || 'Tòa Alpha'} · Tầng {gate.floor || 2})</span>
                      </div>
                      {onOpenRoomCanvas && (
                        <button
                          type="button"
                          onClick={() => onOpenRoomCanvas(gate.roomCode || 'A-201')}
                          className="font-bold text-teal-700 hover:text-teal-900 underline"
                        >
                          Sơ đồ phòng 2D ↗
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Action: Open Script & Minutes */}
              <div className="flex items-center justify-between pt-1">
                <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                  gate.status === 'PASSED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : gate.status === 'IN_PROGRESS'
                    ? 'bg-primary-subtle text-primary'
                    : 'bg-canvas text-ink-muted'
                }`}>
                  Trạng thái: {gate.status === 'PASSED' ? 'Đã đạt' : gate.status === 'IN_PROGRESS' ? 'Đang thẩm định' : 'Lên kế hoạch'}
                </span>

                <button
                  type="button"
                  onClick={() => handleOpenScript(gate)}
                  className="rounded-xl border border-hairline bg-surface px-3.5 py-1.5 text-xs font-bold text-ink hover:bg-canvas transition-colors shadow-xs"
                >
                  📝 Kịch bản & Biên bản phiên {gate.gateCode}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Script Modal */}
      {selectedScript && (
        <GateSessionScriptModal
          isOpen={isScriptModalOpen}
          script={selectedScript}
          onClose={() => setIsScriptModalOpen(false)}
          onSaveScript={(updated) => {
            setSelectedScript(updated)
            showToast(`Đã lưu thành công biên bản Cổng ${updated.gateCode}!`)
          }}
          onViewRoomCanvas={onOpenRoomCanvas}
          onJoinLiveKit={onJoinLiveKit}
        />
      )}
    </div>
  )
}
