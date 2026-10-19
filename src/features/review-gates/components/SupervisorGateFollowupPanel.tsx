import { useState } from 'react'
import { Button } from '../../../components/ui/Button'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedback.trim()) return
    try {
      setBusy(true)
      setError(null)
      if (onSendFeedback) {
        await onSendFeedback(feedback.trim())
      }
      setSubmitted(true)
      setFeedback('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể lưu nhận xét hướng dẫn.')
    } finally {
      setBusy(false)
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
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">{gateStatus}</span>
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

      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 flex items-center justify-between">
          <span>✕ {error}</span>
          <button type="button" onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">✕</button>
        </div>
      )}

      {submitted ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 flex items-center justify-between">
          <span>✓ Đã gửi nhận xét hướng dẫn cho nhóm sinh viên thành công.</span>
          <button type="button" onClick={() => setSubmitted(false)} className="text-primary hover:underline">Gửi thêm</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs font-bold text-slate-700">
            Nhận xét hướng dẫn / Gợi ý khắc phục cho nhóm sinh viên:
          </label>
          <textarea
            rows={2}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Ví dụ: Cần rà soát tính nhất quán giữa cơ sở dữ liệu ERD và API contract theo nhận xét của reviewer..."
            className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-primary focus:outline-hidden"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={busy || !feedback.trim()}>
              {busy ? 'Đang gửi...' : 'Gửi nhận xét hướng dẫn'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
