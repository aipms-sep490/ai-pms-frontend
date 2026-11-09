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
      <div className="rounded-xl border border-status-success-border bg-status-success-bg/30 p-4 text-status-success-text mb-6">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg" aria-hidden="true">verified</span>
          <span className="text-sm font-semibold">Công việc đã được nghiệm thu và hoàn thành đạt yêu cầu.</span>
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
      className="task-review-callout rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 p-5 shadow-xs mb-6 dark:border-indigo-900/50 dark:from-indigo-950/20 dark:via-card dark:to-purple-950/20"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-3 dark:border-indigo-900/40">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
            <span className="material-symbols-outlined text-base" aria-hidden="true">rate_review</span>
          </span>
          <div>
            <h3 className="text-sm font-bold text-ink">Nghiệm thu công việc &amp; Chấm task</h3>
            <p className="text-xs text-ink-muted">Giai đoạn kiểm tra chất lượng kết quả và minh chứng đã nộp</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
          <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" aria-hidden="true" />
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
        <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-900/40">
          {!showRevisionForm ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void onAccept('Nghiệm thu đạt yêu cầu.')}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">check_circle</span>
                <span>Nghiệm thu đạt (Hoàn thành)</span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => setShowRevisionForm(true)}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">replay</span>
                <span>Yêu cầu chỉnh sửa lại</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3.5 dark:border-amber-800/60 dark:bg-amber-950/30">
              <label className="block text-xs font-semibold text-amber-900 dark:text-amber-200">
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
                  className="mt-1 block w-full rounded-md border border-amber-300 bg-white p-2 text-xs text-ink shadow-xs focus:border-amber-500 focus:outline-none dark:border-amber-700 dark:bg-card"
                />
              </label>
              {reasonError && (
                <p role="alert" className="text-xs font-medium text-status-danger-text">
                  {reasonError}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleRequestChanges()}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
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
                  className="inline-flex min-h-9 items-center rounded-md px-3 text-xs font-medium text-ink-muted hover:text-ink"
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
