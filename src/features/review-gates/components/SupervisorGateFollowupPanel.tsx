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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Giám sát Học vụ (Supervision)</span>
          <h3 className="text-base font-bold text-slate-900">{projectName} ({projectCode})</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">{currentGateCode}</span>
          <span className="text-xs font-semibold text-slate-700">{gateTitle}</span>
          <span className="rounded-full bg-status-info-bg px-2.5 py-0.5 text-xs font-bold text-status-info-text border border-status-info-border">{gateStatusLabels[gateStatus as GateStatus] ?? 'Chưa xác định'}</span>
        </div>
      </div>

      {blockerMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <strong>Trở ngại hiện tại của nhóm:</strong> {blockerMessage}
        </div>
      )}

      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
        ℹ️ <strong>Phạm vi vai trò:</strong> Giảng viên hướng dẫn (Primary Supervisor) có thẩm quyền đôn đốc, nhận xét, định hướng hành động (follow-up action items) cho nhóm sinh viên. Quyết định duyệt đạt Gate thuộc về Hội đồng / Giảng viên thẩm định độc lập được phân công.
      </div>

      {!onSendFeedback ? (
        <p className="text-xs text-slate-600">Chế độ chỉ đọc. Mở tiến trình đồ án trong phạm vi hướng dẫn để gửi nhận xét.</p>
      ) : submitted ? (
        <div role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-3 text-xs font-semibold text-status-success-text flex flex-wrap gap-2 items-center justify-between">
          <span>✓ Đã gửi nhận xét hướng dẫn cho nhóm sinh viên thành công.</span>
          <button type="button" onClick={() => setSubmitted(false)} className="min-h-11 min-w-11 text-primary hover:underline">Gửi thêm</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <label htmlFor={fieldId} className="block text-xs font-bold text-slate-700">
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
            className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-primary focus:outline-hidden"
          />
          {error && <p id={`${fieldId}-error`} role="alert" className="text-xs text-rose-800">{error}</p>}
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
