import { useState } from 'react'
import type { TaskDto } from '../../../types/backend'

interface TaskReviewCalloutProps {
  task: TaskDto
  canUpdateStatus: boolean
  busy: boolean
  onAccept: (reason?: string) => Promise<boolean>
  onRequestChanges: (reason: string) => Promise<boolean>
}

export function TaskReviewCallout({
  task,
  canUpdateStatus,
  busy,
  onAccept,
  onRequestChanges,
}: TaskReviewCalloutProps) {
  const [showRevisionForm, setShowRevisionForm] = useState(false)
  const [revisionReason, setRevisionReason] = useState('')
  const [reasonError, setReasonError] = useState('')

  if (task.status === 'DONE') {
    return (
      <div className="mb-6 rounded-xl border border-status-success-border bg-status-success-bg p-4 text-status-success-text">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg" aria-hidden="true">verified</span>
          <span className="text-sm font-semibold">Công việc đang được ghi nhận hoàn thành. Kiểm tra thêm cảnh báo ảnh hưởng từ công việc tiền nhiệm, nếu có.</span>
        </div>
      </div>
    )
  }

  if (task.status !== 'IN_REVIEW') {
    return null
  }

  const handleRequestChanges = async () => {
    if (!revisionReason.trim()) {
      setReasonError('Vui lòng nhập lý do hoặc nội dung cần chỉnh sửa.')
      return
    }
    setReasonError('')
    const ok = await onRequestChanges(revisionReason.trim())
    if (ok) {
      setShowRevisionForm(false)
      setRevisionReason('')
    }
  }

  return (
    <section
      aria-label="Khung nghiệm thu và chấm task"
      className="task-review-callout mb-6 rounded-xl border border-primary/30 bg-primary-subtle/50 p-5 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-xs">
            <span className="material-symbols-outlined text-base" aria-hidden="true">rate_review</span>
          </span>
          <div>
            <h3 className="text-sm font-bold text-ink">Nghiệm thu công việc &amp; Chấm task</h3>
            <p className="text-xs text-ink-muted">Giai đoạn kiểm tra chất lượng kết quả và minh chứng đã nộp</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-subtle px-3 py-1 text-xs font-bold text-primary">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
          ĐANG CHỜ NGHIỆM THU
        </span>
      </div>

      <div className="mt-3 text-xs leading-relaxed text-ink-soft">
        <p>
          Thành viên thực hiện đã nộp kết quả và đánh dấu công việc cần nghiệm thu.
          {canUpdateStatus
            ? ' Với vai trò phụ trách hoặc giảng viên hướng dẫn, bạn có thể kiểm tra minh chứng bên dưới và đưa ra quyết định nghiệm thu hoặc yêu cầu bổ sung.'
            : ' Vui lòng chờ Giảng viên hướng dẫn hoặc Nhóm trưởng kiểm tra kết quả và phê duyệt.'}
        </p>
      </div>

      {canUpdateStatus && (
        <div className="mt-4 border-t border-hairline pt-3">
          {!showRevisionForm ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void onAccept('Nghiệm thu đạt yêu cầu.')}
                className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">check_circle</span>
                <span>Nghiệm thu đạt (Hoàn thành)</span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => setShowRevisionForm(true)}
                className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg border border-status-warning-border bg-status-warning-bg px-4 text-xs font-semibold text-status-warning-text transition-colors hover:border-status-warning-text disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">replay</span>
                <span>Yêu cầu chỉnh sửa lại</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-status-warning-border bg-status-warning-bg p-3.5">
              <label className="block text-xs font-semibold text-status-warning-text">
                Lý do yêu cầu chỉnh sửa / Nội dung cần bổ sung:
                <textarea
                  value={revisionReason}
                  onChange={(e) => {
                    setRevisionReason(e.target.value)
                    if (reasonError) setReasonError('')
                  }}
                  rows={2}
                  maxLength={1000}
                  placeholder="Ghi rõ các điểm chưa đạt, lỗi cần sửa hoặc tài liệu còn thiếu…"
                  className="mt-1 block w-full rounded-md border border-hairline bg-card p-2.5 text-xs font-normal text-ink shadow-xs focus:border-primary focus:outline-none"
                />
              </label>
              {reasonError && (
                <p role="alert" className="text-xs font-medium text-status-error-text">
                  {reasonError}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleRequestChanges()}
                  className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-3.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  {busy ? 'Đang gửi…' : 'Gửi yêu cầu chỉnh sửa'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setShowRevisionForm(false)
                    setRevisionReason('')
                    setReasonError('')
                  }}
                  className="inline-flex min-h-11 items-center rounded-md border border-hairline bg-card px-3.5 text-xs font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
