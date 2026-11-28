import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { HttpError } from '../../../services/http/http-client'
import * as api from '../../academic/api/academic-blueprints-api'
import { toUtcDateTime } from '../../execution/execution-utils'

interface GateOption {
  code: string
  title: string
}

interface GateDeadlineChangePanelProps {
  projectId: number
  gates?: GateOption[]
  canRequest?: boolean
  canReview?: boolean
  onChanged?: () => void
}

export function GateDeadlineChangePanel({
  projectId,
  gates = [],
  canRequest = false,
  canReview = false,
  onChanged,
}: GateDeadlineChangePanelProps) {
  const [requests, setRequests] = useState<api.GateDeadlineChangeRequestDto[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const [gateCode, setGateCode] = useState(gates[0]?.code ?? 'G1')
  const [submissionDue, setSubmissionDue] = useState('')
  const [reviewEnd, setReviewEnd] = useState('')
  const [revisionDue, setRevisionDue] = useState('')
  const [reason, setReason] = useState('')
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({})

  const load = useCallback(async () => {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      setLoading(false)
      return
    }
    try {
      const list = await api.listGateDeadlineChangeRequests(projectId)
      setRequests(Array.isArray(list) ? list : [])
      setError(null)
    } catch {
      // Non-blocking in views where blueprint deadline changes have not been initialized or are mocked
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (gates.length > 0 && !gates.some(g => g.code === gateCode)) {
      setGateCode(gates[0].code)
    }
  }, [gates, gateCode])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    const subIso = toUtcDateTime(submissionDue)
    const revIso = toUtcDateTime(reviewEnd)
    const fixIso = toUtcDateTime(revisionDue)
    if (!subIso || !revIso || !fixIso) {
      setError('Vui lòng nhập đầy đủ cả 3 mốc hạn mới.')
      return
    }
    if (subIso > revIso || revIso > fixIso) {
      setError('Thứ tự mốc hạn không hợp lệ: Hạn nộp ≤ Hạn chấm ≤ Hạn sửa (INVALID_GATE_DEADLINE_ORDER).')
      return
    }
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do đề nghị dời hạn cổng.')
      return
    }
    setBusy(true)
    try {
      await api.createGateDeadlineChangeRequest(projectId, gateCode, {
        requestedSubmissionDueAt: subIso,
        requestedReviewEndAt: revIso,
        requestedRevisionDueAt: fixIso,
        reason: reason.trim(),
      })
      setReason('')
      setSubmissionDue('')
      setReviewEnd('')
      setRevisionDue('')
      setFormOpen(false)
      setNotice(`Đã gửi đề nghị dời hạn cổng ${gateCode} tới Khoa chủ trì.`)
      await load()
      onChanged?.()
    } catch (err) {
      if (err instanceof HttpError) {
        setError(err.problem?.detail || err.message || `Lỗi ${err.status}`)
      } else {
        setError(err instanceof Error ? err.message : 'Không thể gửi đề nghị dời hạn.')
      }
    } finally {
      setBusy(false)
    }
  }

  const handleReview = async (req: api.GateDeadlineChangeRequestDto, decision: 'APPROVED' | 'REJECTED') => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await api.reviewGateDeadlineChangeRequest(projectId, req.id, {
        decision,
        reviewNotes: reviewNotes[req.id]?.trim() || undefined,
        concurrencyToken: req.concurrencyToken,
      })
      setNotice(decision === 'APPROVED' ? `Đã chấp thuận dời hạn cổng ${req.gateCode}.` : `Đã từ chối đề nghị dời hạn cổng ${req.gateCode}.`)
      await load()
      onChanged?.()
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        await load()
        setError('Đơn đề nghị vừa được cập nhật đồng thời. Danh sách mới đã được tải lại.')
      } else if (err instanceof HttpError) {
        setError(err.problem?.detail || err.message || `Lỗi ${err.status}`)
      } else {
        setError('Không thể xử lý đơn đề nghị dời hạn.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (!canRequest && !canReview && requests.length === 0) return null

  return (
    <section aria-label="Đề nghị dời hạn Review Gate" className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">Đề nghị dời hạn Review Gate (Q-X-18)</h2>
          <p className="text-xs text-ink-muted">
            Blueprint đã công bố là bất biến; điều chỉnh 3 mốc hạn của từng đồ án thực hiện qua quy trình đề nghị và Khoa chủ trì phê duyệt.
          </p>
        </div>
        {canRequest && gates.length > 0 && (
          <Button size="sm" variant="secondary" onClick={() => setFormOpen(v => !v)}>
            {formOpen ? 'Đóng biểu mẫu' : 'Đề nghị dời hạn Gate'}
          </Button>
        )}
      </div>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</div>}

      {canRequest && formOpen && (
        <form onSubmit={e => void handleSubmit(e)} className="grid gap-3 rounded-lg border border-hairline bg-canvas p-4 text-xs sm:grid-cols-3">
          <label className="sm:col-span-3">
            <span className="font-semibold text-ink">Cổng kiểm duyệt</span>
            <select
              value={gateCode}
              disabled={busy}
              onChange={e => setGateCode(e.target.value)}
              className="mt-1 block w-full min-h-10 rounded-lg border border-hairline bg-card px-3 text-sm"
            >
              {gates.map(g => <option key={g.code} value={g.code}>{g.code} — {g.title}</option>)}
            </select>
          </label>
          <label>
            <span className="font-semibold text-ink">Hạn nộp mới (giờ VN)</span>
            <input type="datetime-local" required value={submissionDue} disabled={busy} onChange={e => setSubmissionDue(e.target.value)} className="mt-1 block w-full min-h-10 rounded-lg border border-hairline bg-card px-2.5 text-sm" />
          </label>
          <label>
            <span className="font-semibold text-ink">Hạn chấm mới (giờ VN)</span>
            <input type="datetime-local" required value={reviewEnd} disabled={busy} onChange={e => setReviewEnd(e.target.value)} className="mt-1 block w-full min-h-10 rounded-lg border border-hairline bg-card px-2.5 text-sm" />
          </label>
          <label>
            <span className="font-semibold text-ink">Hạn sửa mới (giờ VN)</span>
            <input type="datetime-local" required value={revisionDue} disabled={busy} onChange={e => setRevisionDue(e.target.value)} className="mt-1 block w-full min-h-10 rounded-lg border border-hairline bg-card px-2.5 text-sm" />
          </label>
          <label className="sm:col-span-3">
            <span className="font-semibold text-ink">Lý do đề nghị</span>
            <textarea rows={2} required value={reason} disabled={busy} onChange={e => setReason(e.target.value)} placeholder="Nêu rõ lý do bất khả kháng cần dời mốc cổng..." className="mt-1 block w-full rounded-lg border border-hairline bg-card p-2.5 text-sm" />
          </label>
          <div className="sm:col-span-3 flex justify-end gap-2">
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => setFormOpen(false)}>Hủy</Button>
            <Button type="submit" size="sm" disabled={busy}>Gửi đề nghị</Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-ink-muted">Đang tải danh sách đề nghị dời hạn…</p>
      ) : requests.length === 0 ? (
        <p className="text-xs text-ink-muted">Chưa có đề nghị dời hạn cổng nào cho đồ án này.</p>
      ) : (
        <ul className="divide-y divide-hairline text-xs">
          {requests.map(req => (
            <li key={req.id} className="py-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <strong className="text-sm text-ink">Cổng {req.gateCode}</strong>
                  <StatusBadge
                    tone={req.status === 'APPROVED' ? 'success' : req.status === 'REJECTED' ? 'danger' : 'warning'}
                    label={req.status === 'APPROVED' ? 'Đã chấp thuận' : req.status === 'REJECTED' ? 'Từ chối' : 'Chờ Khoa duyệt'}
                  />
                </div>
                <span className="text-ink-muted">
                  Nộp: {req.requestedSubmissionDueAt.slice(0, 10)} · Chấm: {req.requestedReviewEndAt.slice(0, 10)} · Sửa: {req.requestedRevisionDueAt.slice(0, 10)}
                </span>
              </div>
              <p className="text-ink-soft">Lý do: {req.reason}</p>
              {req.reviewNotes && <p className="text-ink-muted">Ghi chú Khoa: {req.reviewNotes}</p>}
              {canReview && req.status === 'PENDING' && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Ghi chú duyệt / từ chối (tùy chọn)"
                    value={reviewNotes[req.id] ?? ''}
                    disabled={busy}
                    onChange={e => setReviewNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                    className="min-h-9 flex-1 rounded-lg border border-hairline bg-canvas px-2.5 text-xs"
                  />
                  <Button size="sm" disabled={busy} onClick={() => void handleReview(req, 'APPROVED')}>Chấp thuận</Button>
                  <Button size="sm" variant="danger" disabled={busy} onClick={() => void handleReview(req, 'REJECTED')}>Từ chối</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
