import React, { useState } from 'react'
import type { DefenseSessionExtended, RoomInfo } from './DefenseTimetableGrid'
import { DEFENSE_OFFICE_SLOTS } from './DefenseTimetableGrid'

export interface RescheduleRequestModalProps {
  isOpen: boolean
  session: DefenseSessionExtended | null
  rooms: RoomInfo[]
  onClose: () => void
  onSubmitSuccess: (data: unknown) => void
}

export const RescheduleRequestModal: React.FC<RescheduleRequestModalProps> = ({
  isOpen,
  session,
  rooms,
  onClose,
  onSubmitSuccess,
}) => {
  const [newDate, setNewDate] = useState('2026-11-22')
  const [newSlotNumber, setNewSlotNumber] = useState<number>(2)
  const [targetRoomId, setTargetRoomId] = useState<string>('')
  const [reasonCategory, setReasonCategory] = useState('FACILITY_ISSUE')
  const [reasonDetails, setReasonDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !session) return null

  // Simulate Conflict Check (learned from FAMS 3.14.4 Step 7)
  const isSlotConflicted = newDate === '2026-11-20' && newSlotNumber === 1
  const availableRoomsForSlot = rooms.filter(
    (r) => r.status === 'ACTIVE' && r.code !== session.room
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetRoomId || !reasonDetails.trim() || isSlotConflicted) return

    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      onSubmitSuccess({
        sessionId: session.id,
        newDate,
        newSlotNumber,
        targetRoomId,
        reasonCategory,
        reasonDetails,
      })
      onClose()
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl border border-hairline bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <div>
            <h3 className="text-base font-bold text-ink">Tạo yêu cầu đổi phòng / đổi giờ bảo vệ</h3>
            <p className="text-xs text-ink-muted">
              Đơn sẽ được gửi trực tiếp đến Trưởng bộ môn & Ban Đào tạo xem xét
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink text-sm">
            ✕
          </button>
        </div>

        {/* Notice Banner (FAMS style) */}
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 flex items-start gap-2.5">
          <span className="text-base">ℹ️</span>
          <p className="text-[11px] leading-relaxed">
            Vui lòng kiểm tra kỹ thông tin trước khi gửi. Yêu cầu của bạn sẽ được xem xét và xử lý trong vòng <strong>24h làm việc</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* 1. Current Schedule Info */}
          <div className="rounded-xl border border-hairline bg-canvas/50 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Lịch bảo vệ hiện tại</span>
            <div className="font-bold text-ink text-sm">
              {session.projectCode || `Đồ án #${session.projectId}`} — {session.projectTitle || 'Bảo vệ ĐATN'}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-ink-muted mt-1">
              <span>Phòng: <strong className="text-ink">{session.room}</strong></span>
              <span>Ca hiện tại: <strong className="text-ink">Slot {session.slotNumber || 1}</strong></span>
            </div>
          </div>

          {/* 2. Target Date & Slot */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-ink">Ngày mong muốn đổi sang *</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-hairline bg-canvas p-2 text-xs text-ink focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-ink">Ca bảo vệ mong muốn *</label>
              <select
                value={newSlotNumber}
                onChange={(e) => setNewSlotNumber(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-hairline bg-canvas p-2 text-xs text-ink focus:outline-none focus:border-primary"
              >
                {DEFENSE_OFFICE_SLOTS.map((slot) => (
                  <option key={slot.slotNumber} value={slot.slotNumber}>
                    Slot {slot.slotNumber} ({slot.timeRange})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conflict Checker Banner */}
          {isSlotConflicted ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-[11px]">
              <strong>❌ Xung đột lịch:</strong> Giảng viên phản biện của nhóm đã có lịch chấm hội đồng khác trong khung giờ này. Vui lòng chọn ca khác.
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-800 text-[11px] flex items-center gap-2">
              <span>✓ Khung giờ hợp lệ: Hội đồng và nhóm sinh viên đều rảnh trong ca này.</span>
            </div>
          )}

          {/* Target Room Selection */}
          {!isSlotConflicted && (
            <div>
              <label className="font-semibold text-ink">Chọn phòng mới còn trống *</label>
              <select
                required
                value={targetRoomId}
                onChange={(e) => setTargetRoomId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-hairline bg-canvas p-2 text-xs text-ink focus:outline-none focus:border-primary"
              >
                <option value="">-- Chọn phòng trống --</option>
                {availableRoomsForSlot.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} ({r.building} · Tầng {r.floor} · {r.capacity} chỗ)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reason Category */}
          <div>
            <label className="font-semibold text-ink">Lý do xin đổi phòng / đổi giờ *</label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-hairline bg-canvas p-2 text-xs text-ink focus:outline-none focus:border-primary"
            >
              <option value="FACILITY_ISSUE">Thiết bị phòng gặp sự cố (Máy chiếu, âm thanh, mạng)</option>
              <option value="DEMO_SPACE_NEED">Cần không gian lớn hơn để demo mô hình / phần cứng</option>
              <option value="LECTURER_CLASH">Giảng viên hội đồng có lịch công tác đột xuất</option>
              <option value="EMERGENCY">Lý do sức khỏe / Bất khả kháng của thành viên</option>
              <option value="OTHER">Lý do khác</option>
            </select>
          </div>

          {/* Reason Text */}
          <div>
            <label className="font-semibold text-ink">Giải trình chi tiết *</label>
            <textarea
              rows={3}
              required
              placeholder="Nhập lý do cụ thể và đề xuất hướng xử lý..."
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-hairline bg-canvas p-2.5 text-xs text-ink focus:outline-none focus:border-primary"
            />
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
              type="submit"
              disabled={isSubmitting || !targetRoomId || !reasonDetails.trim() || isSlotConflicted}
              className="rounded-lg bg-primary px-4 py-2 font-semibold text-white shadow-xs hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Đang gửi…' : 'Gửi yêu cầu đổi phòng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
