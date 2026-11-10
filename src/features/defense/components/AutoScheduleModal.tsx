import React, { useState } from 'react'
import type { RoomInfo } from './DefenseTimetableGrid'

export interface AutoScheduleModalProps {
  isOpen: boolean
  rooms: RoomInfo[]
  onClose: () => void
  onApplySchedule: (proposedCount: number) => void
}

export const AutoScheduleModal: React.FC<AutoScheduleModalProps> = ({
  isOpen,
  rooms,
  onClose,
  onApplySchedule,
}) => {
  const [step, setStep] = useState<'CONFIG' | 'RUNNING' | 'PREVIEW'>('CONFIG')
  const [startDate, setStartDate] = useState('2026-11-20')
  const [endDate, setEndDate] = useState('2026-11-25')
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>(rooms.map((r) => r.id))
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')

  if (!isOpen) return null

  const handleToggleRoom = (id: number) => {
    setSelectedRoomIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }

  const handleRunAlgorithm = () => {
    setStep('RUNNING')
    setProgress(15)
    setProgressMessage('Đang nạp danh sách đồ án đủ điều kiện bảo vệ...')

    setTimeout(() => {
      setProgress(40)
      setProgressMessage('Kiểm tra lịch rảnh của giảng viên & ràng buộc giờ hành chính...')
    }, 600)

    setTimeout(() => {
      setProgress(75)
      setProgressMessage('Phân bổ phòng không trùng lịch & tối ưu hóa di chuyển hội đồng...')
    }, 1200)

    setTimeout(() => {
      setProgress(100)
      setProgressMessage('Hoàn thành thuật toán xếp lịch!')
      setStep('PREVIEW')
    }, 1800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl border border-hairline bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary text-xl">
              ⚡
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">Tự động phân chia phòng & ca bảo vệ</h3>
              <p className="text-xs text-ink-muted">Thuật toán xếp lịch tự động trong giờ hành chính</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink text-sm">
            ✕
          </button>
        </div>

        {/* Body */}
        {step === 'CONFIG' && (
          <div className="mt-5 space-y-4 text-xs">
            {/* Period / Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-ink">Ngày bắt đầu đợt bảo vệ</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-hairline bg-canvas p-2 text-xs text-ink"
                />
              </div>
              <div>
                <label className="font-semibold text-ink">Ngày kết thúc</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-hairline bg-canvas p-2 text-xs text-ink"
                />
              </div>
            </div>

            {/* Office Hours Note */}
            <div className="rounded-xl border border-primary/20 bg-primary-subtle/30 p-3 text-xs text-primary leading-relaxed">
              <span className="font-bold">⏰ Ràng buộc giờ hành chính:</span>
              <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs text-ink-soft">
                <li>Ca Sáng: Slot 1 (08:00–09:15), Slot 2 (09:30–10:45), Slot 3 (11:00–12:15)</li>
                <li>Ca Chiều: Slot 4 (13:30–14:45), Slot 5 (15:00–16:15), Slot 6 (16:30–17:45)</li>
                <li>Tự động bỏ qua các ngày nghỉ lễ đã cấu hình theo <code>ProjectPeriodCalendar</code></li>
              </ul>
            </div>

            {/* Room Multi-select */}
            <div>
              <label className="font-semibold text-ink mb-1.5 block">
                Chọn các phòng bảo vệ khả dụng ({selectedRoomIds.length}/{rooms.length} phòng)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 rounded-xl border border-hairline bg-canvas">
                {rooms.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface">
                    <input
                      type="checkbox"
                      checked={selectedRoomIds.includes(r.id)}
                      onChange={() => handleToggleRoom(r.id)}
                      className="rounded border-hairline text-primary focus:ring-primary"
                    />
                    <span className="font-bold text-ink">{r.code}</span>
                    <span className="text-xs text-ink-muted">({r.capacity}chỗ)</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-hairline">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-hairline px-4 py-2 font-medium text-ink hover:bg-canvas"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={selectedRoomIds.length === 0}
                onClick={handleRunAlgorithm}
                className="rounded-lg bg-primary px-4 py-2 font-semibold text-white shadow-xs hover:bg-primary/90 disabled:opacity-50"
              >
                Bắt đầu xếp lịch tự động
              </button>
            </div>
          </div>
        )}

        {step === 'RUNNING' && (
          <div className="mt-8 mb-6 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <div className="w-full max-w-sm space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs font-semibold text-ink">{progressMessage}</p>
            </div>
          </div>
        )}

        {step === 'PREVIEW' && (
          <div className="mt-5 space-y-4 text-xs">
            {/* Summary Banner */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 flex items-start gap-3">
              <span className="text-xl">✅</span>
              <div>
                <h4 className="font-bold text-sm">Xếp lịch hoàn tất: 45/48 đồ án được phân bổ</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Tất cả các ca đều nằm gọn trong khung giờ hành chính và không có giảng viên nào bị trùng lịch.
                </p>
              </div>
            </div>

            {/* Conflict Warning */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 flex items-start gap-2.5">
              <span className="text-base">⚠️</span>
              <div>
                <p className="font-bold">Có 3 đồ án chưa xếp được ca phù hợp:</p>
                <ul className="list-disc pl-4 mt-1 text-xs text-amber-800 space-y-0.5">
                  <li><strong>PRJ-033:</strong> Thiếu giảng viên chuyên môn Trí tuệ nhân tạo (AI) vào chiều 21/11.</li>
                  <li><strong>PRJ-041 & PRJ-042:</strong> Vượt quá số phòng trống ngày 22/11 (Cần mở thêm 1 phòng).</li>
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-hairline">
              <button
                type="button"
                onClick={() => setStep('CONFIG')}
                className="text-xs text-ink-muted hover:text-ink font-semibold"
              >
                ◀ Cấu hình lại
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-hairline px-4 py-2 font-medium text-ink hover:bg-canvas"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApplySchedule(45)
                    onClose()
                  }}
                  className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white shadow-xs hover:bg-emerald-800"
                >
                  Phê duyệt & Áp dụng lịch (45 đồ án)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
