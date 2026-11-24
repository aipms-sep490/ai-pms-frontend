import { useId, useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { reviewGateError } from '../utils/review-gate-error'
import { gateStatusLabels } from '../utils/review-gate-labels'
import type { GateStatus } from '../types/review-gates.types'

interface SupervisorGateFollowupPanelProps {
  projectId: string
  projectName: string
  projectCode: string
  currentGateCode: string
  gateTitle: string
  gateStatus: string
  blockerMessage?: string
  onSendFeedback?: (feedback: string) => Promise<void>
}

export function SupervisorGateFollowupPanel({
  projectName,
  projectCode,
  currentGateCode,
  gateTitle,
  gateStatus,
  blockerMessage,
  onSendFeedback,
}: SupervisorGateFollowupPanelProps) {
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fieldId = useId()
  const sending = useRef(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sending.current || !onSendFeedback || !feedback.trim()) return
    try {
      sending.current = true
      setBusy(true)
      setError(null)
      if (onSendFeedback) {
        await onSendFeedback(feedback.trim())
      }
      setSubmitted(true)
      setFeedback('')
    } catch (err: unknown) {
      setError(reviewGateError(err))
    } finally {
      setBusy(false)
      sending.current = false
    }
  }

  return (
    <div className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Giám sát Học vụ (Supervision)</span>
          <h3 className="text-base font-bold text-ink">{projectName} ({projectCode})</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-primary/20 bg-primary-subtle px-2 py-0.5 text-xs font-bold text-primary">{currentGateCode}</span>
          <span className="text-xs font-semibold text-ink-soft">{gateTitle}</span>
          <span className="rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 text-xs font-bold text-primary">{gateStatusLabels[gateStatus as GateStatus] ?? 'Chưa xác định'}</span>
        </div>
      </div>

      {blockerMessage && (
        <div className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-xs text-status-error-text">
          <strong>Trở ngại hiện tại của nhóm:</strong> {blockerMessage}
        </div>
      )}

      <div className="rounded-lg border border-hairline bg-canvas p-3 text-xs text-ink-soft">
        ℹ️ <strong>Phạm vi vai trò:</strong> Giảng viên hướng dẫn (Primary Supervisor) có thẩm quyền đôn đốc, nhận xét, định hướng hành động (follow-up action items) cho nhóm sinh viên. Quyết định duyệt đạt Gate thuộc về Hội đồng / Giảng viên thẩm định độc lập được phân công.
      </div>

      {!onSendFeedback ? (
        <p className="text-xs text-ink-muted">Chế độ chỉ đọc. Mở tiến trình đồ án trong phạm vi hướng dẫn để gửi nhận xét.</p>
      ) : submitted ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline border-l-4 border-l-status-success-text bg-card p-3 text-xs font-semibold text-ink shadow-2xs">
          <span className="inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
            <span>Đã gửi nhận xét hướng dẫn cho nhóm sinh viên thành công.</span>
          </span>
          <button type="button" onClick={() => setSubmitted(false)} className="min-h-11 min-w-11 text-primary hover:underline">Gửi thêm</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <label htmlFor={fieldId} className="block text-xs font-bold text-ink-soft">
            Nhận xét hướng dẫn / Gợi ý khắc phục cho nhóm sinh viên:
          </label>
          <textarea
            id={fieldId}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            disabled={busy}
            rows={2}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Ví dụ: Cần rà soát tính nhất quán giữa cơ sở dữ liệu ERD và API contract theo nhận xét của reviewer..."
            className="w-full rounded-lg border border-hairline bg-card p-2.5 text-xs text-ink focus:border-primary focus:outline-hidden"
          />
          {error && <p id={`${fieldId}-error`} role="alert" className="text-xs text-status-error-text">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" className="min-h-11" disabled={busy || !feedback.trim()}>
              {busy ? 'Đang gửi...' : 'Gửi nhận xét hướng dẫn'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
