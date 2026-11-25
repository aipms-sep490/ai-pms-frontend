import React, { useState } from 'react'
import { displayLabel } from '../../../components/ui/display-label'
import { GateScriptAiPanel } from '../../ai-suite/DefenseMockPanel'
import type {
  GateSessionScript,
  ScriptQaEntry,
  ScriptRemediationItem,
} from '../types/gate-session-script.types'

function formatSessionTime(value?: string | null): string {
  if (!value) return '—'
  if (/^\d{2}:\d{2}/.test(value)) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }).format(parsed)
}

export interface GateSessionScriptModalProps {
  isOpen: boolean
  script: GateSessionScript
  gateInstanceId?: number
  onClose: () => void
  onSaveScript: (updatedScript: GateSessionScript) => void
  onViewRoomCanvas?: (roomCode: string) => void
  onJoinLiveKit?: (roomName: string) => void
}

export const GateSessionScriptModal: React.FC<GateSessionScriptModalProps> = ({
  isOpen,
  script: initialScript,
  gateInstanceId,
  onClose,
  onSaveScript,
  onViewRoomCanvas,
  onJoinLiveKit,
}) => {
  const [script, setScript] = useState<GateSessionScript>(initialScript)
  const [activeTab, setActiveTab] = useState<'AGENDA' | 'ATTENDANCE' | 'QA_LOG' | 'REMEDIATION' | 'VERDICT'>('AGENDA')
  const [newQuestion, setNewQuestion] = useState('')
  const [newAsker, setNewAsker] = useState('TS. Phạm Quốc Dũng')
  const [newAnswerer, setNewAnswerer] = useState('Nguyễn Văn A')
  const [newEval, setNewEval] = useState<'SATISFACTORY' | 'ACCEPTABLE' | 'NEEDS_REVISION'>('SATISFACTORY')
  const [newRemediationTitle, setNewRemediationTitle] = useState('')
  const [newRemediationAssignee, setNewRemediationAssignee] = useState('Nguyễn Văn A')
  const [isSaved, setIsSaved] = useState(false)

  if (!isOpen) return null

  const isOnline = script.mode === 'ONLINE'

  const handleAddQa = () => {
    if (!newQuestion.trim()) return
    const newEntry: ScriptQaEntry = {
      id: `qa-${Date.now()}`,
      askerName: newAsker,
      askerRole: 'REVIEWER',
      question: newQuestion.trim(),
      answeredBy: newAnswerer,
      evaluation: newEval,
    }
    setScript((prev) => ({
      ...prev,
      qaLog: [...prev.qaLog, newEntry],
    }))
    setNewQuestion('')
  }

  const handleRemoveQa = (id: string) => {
    setScript((prev) => ({
      ...prev,
      qaLog: prev.qaLog.filter((q) => q.id !== id),
    }))
  }

  const handleAddRemediation = () => {
    if (!newRemediationTitle.trim()) return
    const newItem: ScriptRemediationItem = {
      id: `rem-${Date.now()}`,
      title: newRemediationTitle.trim(),
      assignee: newRemediationAssignee,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 5 business days
      required: true,
    }
    setScript((prev) => ({
      ...prev,
      remediationItems: [...prev.remediationItems, newItem],
    }))
    setNewRemediationTitle('')
  }

  const handleRemoveRemediation = (id: string) => {
    setScript((prev) => ({
      ...prev,
      remediationItems: prev.remediationItems.filter((item) => item.id !== id),
    }))
  }

  const handleToggleAttendance = (userId: number | string) => {
    setScript((prev) => ({
      ...prev,
      presences: prev.presences.map((p) =>
        p.userId === userId ? { ...p, isPresent: !p.isPresent } : p
      ),
    }))
  }

  const handleSave = () => {
    const updated = {
      ...script,
      savedAt: new Date().toISOString(),
    }
    onSaveScript(updated)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2500)
  }

  const handleExportText = () => {
    const lines = [
      `BIÊN BẢN VÀ KỊCH BẢN PHIÊN BẢO VỆ / THẨM ĐỊNH - ${script.gateCode}`,
      `Đồ án: [${script.projectCode}] ${script.projectTitle}`,
      `Hình thức: ${isOnline ? 'ONLINE (LiveKit)' : `OFFLINE (Phòng ${script.roomCode || 'A-201'})`}`,
      `Thời gian: ${script.scheduledStartAt} - ${script.scheduledEndAt}`,
      `Kết luận: ${displayLabel(script.verdict)}`,
      `-----------------------------------------`,
      `DANH SÁCH CÂU HỎI VẤN ĐÁP (Q&A):`,
      ...script.qaLog.map((q, i) => `${i + 1}. Người hỏi: ${q.askerName} -> Câu hỏi: ${q.question} | Trả lời: ${q.answeredBy} (${displayLabel(q.evaluation)})`),
      `-----------------------------------------`,
      `DANH MỤC YÊU CẦU SỬA ĐỔI:`,
      ...script.remediationItems.map((r, i) => `${i + 1}. ${r.title} (Giao cho: ${r.assignee}, Hạn: ${r.dueDate})`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `BienBan_${script.gateCode}_${script.projectCode}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl border border-hairline bg-card shadow-2xl flex flex-col max-h-[90vh] overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold shadow-xs ${
              isOnline ? 'bg-tag-se text-white' : 'bg-primary text-white'
            }`}>
              {script.gateCode}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-ink">
                  Kịch bản & Biên bản thẩm định {script.gateCode} — {script.gateTitle}
                </h3>
                {isOnline ? (
                  <span className="rounded-full bg-tag-se-bg text-tag-se border border-tag-se/25 px-2.5 py-0.5 text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">public</span>
                    <span>ONLINE (LiveKit)</span>
                  </span>
                ) : (
                  <span className="rounded-full bg-status-success-bg text-status-success-text border border-status-success-border px-2.5 py-0.5 text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">apartment</span>
                    <span>OFFLINE (Tại trường)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-muted">
                [{script.projectCode}] {script.projectTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOnline && onJoinLiveKit && (
              <button
                type="button"
                onClick={() => onJoinLiveKit(script.liveKitRoomName || `livekit-gate-${script.gateCode}`)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">videocam</span>
                <span>Vào phòng LiveKit</span>
              </button>
            )}

            {!isOnline && onViewRoomCanvas && script.roomCode && (
              <button
                type="button"
                onClick={() => onViewRoomCanvas(script.roomCode!)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-hairline bg-card px-3 py-1.5 text-xs font-bold text-ink hover:bg-canvas transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">map</span>
                <span>Sơ đồ phòng {script.roomCode}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng kịch bản phiên"
              className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas hover:text-ink text-sm ml-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Mode & Timing Sub-bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-card px-6 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-ink-soft">
            {isOnline ? (
              <>
                <span>Phòng LiveKit: <strong className="text-primary font-mono">{script.liveKitRoomName || 'livekit-pms-room-01'}</strong></span>
                <span>Thời lượng ghi nhận: <strong className="text-ink">{script.totalElapsedMinutes || 52} phút</strong></span>
                <span className="flex items-center gap-1 text-status-success-text font-medium">
                  <span className="h-2 w-2 rounded-full bg-status-success-text motion-safe:animate-pulse" />
                  Đang theo dõi hiện diện
                </span>
              </>
            ) : (
              <>
                <span>Phòng họp tại trường: <strong className="text-primary font-bold">{script.roomCode || 'A-201'}</strong> ({script.building || 'Tòa Alpha'} · Tầng {script.floor || 2})</span>
                <span className="text-status-success-text font-medium">✓ Đã tự động phân chia phòng chống trùng</span>
              </>
            )}
          </div>

          <div className="text-xs text-ink-muted">
            Khung giờ: <strong>{script.scheduledStartAt} – {script.scheduledEndAt}</strong>
          </div>
        </div>

        {gateInstanceId && gateInstanceId > 0 && (
          <div className="border-b border-hairline bg-canvas/40 px-6 py-3">
            <GateScriptAiPanel
              gateInstanceId={gateInstanceId}
              onApplyToScript={(draft) => {
                setScript((prev) => ({
                  ...prev,
                  agendaStages: draft.agendaStages.length > 0
                    ? draft.agendaStages.map((s) => ({ stage: s.stage, durationMinutes: s.durationMinutes, status: 'PENDING' }))
                    : prev.agendaStages,
                  qaLog: [
                    ...prev.qaLog,
                    ...draft.suggestedQuestions.map((q, idx) => ({
                      id: `ai-qa-${Date.now()}-${idx}`,
                      askerName: q.askerRole === 'CHAIR' ? 'Chủ tịch Hội đồng' : q.askerRole === 'SECRETARY' ? 'Thư ký' : 'Phản biện',
                      askerRole: (q.askerRole === 'CHAIR' ? 'CHAIR' : 'REVIEWER') as 'CHAIR' | 'REVIEWER' | 'MEMBER',
                      question: q.question,
                      answeredBy: q.targetMemberName || newAnswerer,
                      evaluation: 'ACCEPTABLE' as const,
                      notes: q.verificationGoal,
                    })),
                  ],
                  remediationItems: [
                    ...prev.remediationItems,
                    ...draft.remediationWatchlist.map((title, idx) => ({
                      id: `ai-rem-${Date.now()}-${idx}`,
                      title,
                      assignee: newRemediationAssignee,
                      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                      required: true,
                    })),
                  ],
                  generalNotes: draft.generalNotesDraft || prev.generalNotes,
                }))
              }}
            />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-hairline px-6 bg-card text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('AGENDA')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'AGENDA' ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            1. Kịch bản phiên làm việc ({script.agendaStages.length} bước)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'ATTENDANCE' ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            2. Thành phần & Điểm danh ({script.presences.filter((p) => p.isPresent).length}/{script.presences.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('QA_LOG')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'QA_LOG' ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            3. Sổ ghi chép Vấn đáp Q&A ({script.qaLog.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('REMEDIATION')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'REMEDIATION' ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            4. Yêu cầu chỉnh sửa ({script.remediationItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('VERDICT')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'VERDICT' ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            5. Kết luận & Chữ ký ({displayLabel(script.verdict)})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs space-y-4">
          {/* TAB 1: AGENDA */}
          {activeTab === 'AGENDA' && (
            <div className="space-y-3">
              <p className="text-xs text-ink-muted">
                Tiến trình kịch bản chuẩn cho phiên thẩm định {script.gateCode} ({isOnline ? 'Trực tuyến trên LiveKit' : 'Trực tiếp tại phòng bảo vệ'}):
              </p>
              <div className="space-y-2.5">
                {script.agendaStages.map((stage, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      stage.status === 'COMPLETED'
                        ? 'border-hairline border-l-4 border-l-status-success-text bg-card'
                        : stage.status === 'IN_PROGRESS'
                        ? 'border-hairline border-l-4 border-l-primary bg-card shadow-xs ring-1 ring-primary/30'
                        : 'border-hairline bg-canvas/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        stage.status === 'COMPLETED'
                          ? 'bg-status-success-text text-white'
                          : stage.status === 'IN_PROGRESS'
                          ? 'bg-primary text-white motion-safe:animate-pulse'
                          : 'border border-hairline bg-canvas text-ink-soft'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-ink text-xs">{stage.stage}</div>
                        <div className="text-xs text-ink-muted mt-0.5">Thời lượng quy định: {stage.durationMinutes} phút</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                        stage.status === 'COMPLETED'
                          ? 'border border-status-success-border bg-status-success-bg text-status-success-text'
                          : stage.status === 'IN_PROGRESS'
                          ? 'bg-primary-subtle text-primary font-bold'
                          : 'bg-canvas text-ink-muted'
                      }`}>
                        {stage.status === 'COMPLETED' ? '✓ Đã hoàn thành' : stage.status === 'IN_PROGRESS' ? '▶ Đang diễn ra' : 'Chưa bắt đầu'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: ATTENDANCE & PRESENCE */}
          {activeTab === 'ATTENDANCE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-ink text-xs">
                    {isOnline ? 'Nhật ký kết nối LiveKit (Presence Recording)' : 'Điểm danh trực tiếp tại phòng họp'}
                  </h4>
                  <p className="text-xs text-ink-muted">
                    {isOnline
                      ? 'Hệ thống tự động ghi nhận thời gian vào/ra từ máy chủ LiveKit'
                      : 'Thư ký hội đồng xác nhận sự hiện diện thực tế của sinh viên và giảng viên'}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-hairline rounded-xl border border-hairline bg-card overflow-hidden">
                {script.presences.map((p) => (
                  <div key={p.userId} className="flex items-center justify-between p-3 text-xs">
                    <div className="flex items-center gap-3">
                      {!isOnline ? (
                        <input
                          type="checkbox"
                          checked={p.isPresent}
                          onChange={() => handleToggleAttendance(p.userId)}
                          className="rounded border-hairline text-primary focus:ring-primary h-4 w-4"
                        />
                      ) : (
                        <span className={`h-2.5 w-2.5 rounded-full ${p.isPresent ? 'bg-status-success-text' : 'bg-hairline'}`} />
                      )}
                      <div>
                        <span className="font-bold text-ink mr-2">{p.name}</span>
                        <span className="rounded bg-canvas border border-hairline px-1.5 py-0.5 text-xs font-semibold text-ink-muted">
                          {displayLabel(p.role)}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-ink-muted">
                      {isOnline ? (
                        p.isPresent ? (
                          <span className="text-status-success-text font-medium">
                            Đã tham gia{p.durationMinutes ? `: ${p.durationMinutes} phút` : ''}
                            {p.joinedAt || p.leftAt ? ` (${formatSessionTime(p.joinedAt)} – ${formatSessionTime(p.leftAt)})` : ''}
                          </span>
                        ) : (
                          <span className="text-ink-muted">Chưa vào phòng</span>
                        )
                      ) : (
                        <span className={p.isPresent ? 'text-status-success-text font-bold' : 'text-ink-muted'}>
                          {p.isPresent ? 'Có mặt tại phòng' : 'Vắng mặt'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: QA LOG */}
          {activeTab === 'QA_LOG' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-hairline bg-canvas/50 p-3.5 space-y-3">
                <span className="font-bold text-ink text-xs uppercase tracking-wider">+ Ghi nhận câu hỏi phản biện mới</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newAsker}
                    onChange={(e) => setNewAsker(e.target.value)}
                    placeholder="Giảng viên đặt câu hỏi"
                    className="min-h-10 rounded-lg border border-hairline bg-card p-2 text-xs text-ink"
                  />
                  <input
                    type="text"
                    value={newAnswerer}
                    onChange={(e) => setNewAnswerer(e.target.value)}
                    placeholder="Sinh viên trả lời"
                    className="min-h-10 rounded-lg border border-hairline bg-card p-2 text-xs text-ink"
                  />
                  <select
                    value={newEval}
                    onChange={(e) => setNewEval(e.target.value as 'SATISFACTORY' | 'ACCEPTABLE' | 'NEEDS_REVISION')}
                    className="min-h-10 rounded-lg border border-hairline bg-card p-2 text-xs text-ink"
                  >
                    <option value="SATISFACTORY">Đạt (Thỏa đáng)</option>
                    <option value="ACCEPTABLE">Chấp nhận được</option>
                    <option value="NEEDS_REVISION">Cần bổ sung / Sửa lại</option>
                  </select>
                </div>
                <textarea
                  rows={2}
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Nội dung câu hỏi và ghi chú câu trả lời..."
                  className="w-full rounded-lg border border-hairline bg-card p-2.5 text-xs text-ink"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddQa}
                    className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-white hover:bg-primary-hover"
                  >
                    Lưu câu hỏi vào biên bản
                  </button>
                </div>
              </div>

              {/* QA List */}
              <div className="space-y-2.5">
                {script.qaLog.length === 0 ? (
                  <p className="text-center text-ink-muted py-4">Chưa có câu hỏi vấn đáp nào được ghi nhận.</p>
                ) : (
                  script.qaLog.map((qa, i) => (
                    <div key={qa.id} className="rounded-xl border border-hairline bg-card p-3.5 shadow-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">#{i + 1}</span>
                          <span className="font-bold text-ink">{qa.askerName}</span>
                          <span className="text-ink-muted">hỏi sinh viên:</span>
                          <span className="font-semibold text-ink">{qa.answeredBy}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                            qa.evaluation === 'SATISFACTORY'
                              ? 'border-status-success-border bg-status-success-bg text-status-success-text'
                              : qa.evaluation === 'ACCEPTABLE'
                              ? 'border-primary/20 bg-primary-subtle text-primary'
                              : 'border-status-warning-border bg-status-warning-bg text-status-warning-text'
                          }`}>
                            {qa.evaluation === 'SATISFACTORY' ? 'Thỏa đáng' : qa.evaluation === 'ACCEPTABLE' ? 'Chấp nhận được' : 'Cần sửa đổi'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveQa(qa.id)}
                            className="text-ink-muted hover:text-status-error-text text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-ink-soft bg-canvas/50 p-2 rounded-lg font-medium">
                        "{qa.question}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: REMEDIATION ITEMS */}
          {activeTab === 'REMEDIATION' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-hairline bg-canvas/50 p-3.5 space-y-3">
                <span className="font-bold text-ink text-xs uppercase tracking-wider">+ Thêm yêu cầu chỉnh sửa bắt buộc</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newRemediationTitle}
                    onChange={(e) => setNewRemediationTitle(e.target.value)}
                    placeholder="Tên đầu việc cần sửa (ví dụ: Bổ sung sơ đồ Database ERD)..."
                    className="min-h-10 rounded-lg border border-hairline bg-card p-2 text-xs text-ink"
                  />
                  <input
                    type="text"
                    value={newRemediationAssignee}
                    onChange={(e) => setNewRemediationAssignee(e.target.value)}
                    placeholder="Sinh viên phụ trách"
                    className="min-h-10 rounded-lg border border-hairline bg-card p-2 text-xs text-ink"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-muted">Hạn chót mặc định: <strong>5 ngày làm việc</strong> theo lịch trường</span>
                  <button
                    type="button"
                    onClick={handleAddRemediation}
                    className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-white hover:bg-primary-hover"
                  >
                    Thêm yêu cầu sửa đổi
                  </button>
                </div>
              </div>

              {/* Remediation List */}
              <div className="space-y-2">
                {script.remediationItems.length === 0 ? (
                  <p className="text-center text-ink-muted py-4">Không có yêu cầu chỉnh sửa bắt buộc nào.</p>
                ) : (
                  script.remediationItems.map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-hairline bg-card shadow-xs text-xs">
                      <div className="flex items-center gap-3">
                        <span className="h-6 w-6 rounded-full border border-status-warning-border bg-status-warning-bg text-status-warning-text flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-ink">{item.title}</div>
                          <div className="text-xs text-ink-muted">Giao cho: <strong>{item.assignee}</strong> · Hạn chót: <strong>{item.dueDate}</strong></div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRemediation(item.id)}
                        className="text-ink-muted hover:text-status-error-text text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: VERDICT & SIGN-OFF */}
          {activeTab === 'VERDICT' && (
            <div className="space-y-5">
              <div>
                <label className="font-bold text-ink text-xs uppercase tracking-wider block mb-2">
                  Phán quyết của Hội đồng thẩm định Cổng {script.gateCode}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setScript((prev) => ({ ...prev, verdict: 'PASSED' }))}
                    className={`rounded-xl border p-3 text-center transition-all ${
                      script.verdict === 'PASSED'
                        ? 'border-status-success-border bg-status-success-bg text-status-success-text font-bold ring-2 ring-status-success-border'
                        : 'border-hairline bg-card text-ink hover:bg-canvas'
                    }`}
                  >
                    <div className="flex justify-center"><span className="material-symbols-outlined text-[20px] text-status-success-text" aria-hidden="true">check_circle</span></div>
                    <div className="mt-1 font-bold text-xs">ĐẠT (PASSED)</div>
                    <div className="text-xs text-ink-muted mt-0.5">Cho phép qua cổng</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScript((prev) => ({ ...prev, verdict: 'REVISION_REQUIRED' }))}
                    className={`rounded-xl border p-3 text-center transition-all ${
                      script.verdict === 'REVISION_REQUIRED'
                        ? 'border-status-warning-border bg-status-warning-bg text-status-warning-text font-bold ring-2 ring-status-warning-border'
                        : 'border-hairline bg-card text-ink hover:bg-canvas'
                    }`}
                  >
                    <div className="flex justify-center"><span className="material-symbols-outlined text-[20px] text-status-warning-text" aria-hidden="true">warning</span></div>
                    <div className="mt-1 font-bold text-xs">SỬA ĐỔI (REVISION)</div>
                    <div className="text-xs text-ink-muted mt-0.5">Hạn sửa 5 ngày làm việc</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScript((prev) => ({ ...prev, verdict: 'FAILED' }))}
                    className={`rounded-xl border p-3 text-center transition-all ${
                      script.verdict === 'FAILED'
                        ? 'border-status-error-border bg-status-error-bg text-status-error-text font-bold ring-2 ring-status-error-border'
                        : 'border-hairline bg-card text-ink hover:bg-canvas'
                    }`}
                  >
                    <div className="flex justify-center"><span className="material-symbols-outlined text-[20px] text-status-error-text" aria-hidden="true">cancel</span></div>
                    <div className="mt-1 font-bold text-xs">KHÔNG ĐẠT (FAILED)</div>
                    <div className="text-xs text-ink-muted mt-0.5">Dừng tiến trình đồ án</div>
                  </button>
                </div>
              </div>

              {/* Digital Sign-off Confirmation */}
              <div className="rounded-xl border border-hairline bg-canvas/40 p-4 space-y-3">
                <span className="font-bold text-ink text-xs uppercase tracking-wider">Xác nhận chữ ký điện tử</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-hairline bg-card p-3">
                    <span className="text-xs text-ink-muted">Thư ký hội đồng ghi biên bản:</span>
                    <p className="font-bold text-ink mt-0.5">{script.signedBySecretary || 'ThS. Nguyễn Mai Phương'}</p>
                    <span className="text-xs text-status-success-text font-medium">✓ Đã ký điện tử</span>
                  </div>
                  <div className="rounded-lg border border-hairline bg-card p-3">
                    <span className="text-xs text-ink-muted">Chủ tịch hội đồng phê duyệt:</span>
                    <p className="font-bold text-ink mt-0.5">{script.signedByChair || 'TS. Phạm Quốc Dũng'}</p>
                    <span className="text-xs text-status-success-text font-medium">✓ Đã ký điện tử</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline bg-canvas/60 px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportText}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-hairline bg-card px-3 py-1.5 text-xs font-bold text-ink hover:bg-canvas transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">description</span>
              <span>Xuất biên bản (.TXT / PDF)</span>
            </button>
            {isSaved && (
              <span className="text-xs font-bold text-status-success-text">✓ Đã lưu biên bản thành công!</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-lg border border-hairline bg-card px-4 py-1.5 text-xs font-semibold text-ink hover:bg-canvas"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="min-h-10 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-white hover:bg-primary-hover shadow-xs"
            >
              Lưu biên bản & Phán quyết
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
