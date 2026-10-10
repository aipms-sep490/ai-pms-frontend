import { useEffect, useState } from 'react'
import { HttpError } from '../../services/http/http-client'
import { getResultCorrectionRequests, submitResultCorrectionRequest, type CorrectionStatus, type ResultCorrectionRequest } from './result-correction-api'

const statusText: Record<string, string> = { PENDING: 'Chờ xử lý', UNDER_REVIEW: 'Đang xem xét', ACCEPTED: 'Đã chấp nhận', REJECTED: 'Đã từ chối' }
const statusTone: Record<string, string> = {
  PENDING: 'border-hairline bg-slate-50 text-slate-600',
  UNDER_REVIEW: 'border-status-warning-border bg-status-warning-bg text-status-warning-text',
  ACCEPTED: 'border-status-success-border bg-status-success-bg text-status-success-text',
  REJECTED: 'border-status-error-border bg-status-error-bg text-status-error-text',
}
const describeStatus = (status: CorrectionStatus) => statusText[status] ?? status
const toneFor = (status: CorrectionStatus) => statusTone[status] ?? 'border-hairline bg-slate-50 text-slate-600'
const formatDateTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

/** BE-19b: appeal / correction requests on a published result. An accepted
 * request creates a new result version on the backend; the FE only submits and
 * tracks status. */
export function ResultCorrectionPanel({ projectId }: { projectId: number }) {
  const [requests, setRequests] = useState<ResultCorrectionRequest[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void getResultCorrectionRequests(projectId, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setRequests(data); setError(false) } })
      .catch(reason_ => {
        if (controller.signal.aborted) return
        if (reason_ instanceof HttpError && reason_.status === 404) { setRequests([]); setError(false) }
        else setError(true)
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, revision])

  const retry = () => { setLoading(true); setError(false); setRequests(null); setRevision(value => value + 1) }

  const submit = () => {
    const value = reason.trim()
    if (value.length < 10) { setFormError('Hãy nêu lý do phúc khảo (tối thiểu 10 ký tự).'); return }
    setSubmitting(true); setFormError(null)
    void submitResultCorrectionRequest(projectId, value)
      .then(() => { setReason(''); setRevision(revision_ => revision_ + 1) })
      .catch(() => setFormError('Chưa gửi được yêu cầu. Hãy thử lại.'))
      .finally(() => setSubmitting(false))
  }

  const requestList = requests ?? []
  const hasOpenRequest = requestList.some(request => request.status === 'PENDING' || request.status === 'UNDER_REVIEW')

  return <section className="space-y-3 rounded-2xl border border-hairline bg-card p-5 shadow-xs">
    <div>
      <h2 className="text-base font-bold text-slate-950">Phúc khảo / đính chính kết quả</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">Nếu bạn cho rằng kết quả cần xem lại, hãy gửi yêu cầu kèm lý do. Yêu cầu được chấp nhận sẽ tạo một phiên bản kết quả mới.</p>
    </div>

    {loading && <p role="status" className="text-sm text-slate-500">Đang tải yêu cầu…</p>}
    {!loading && error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text"><span>Chưa tải được yêu cầu phúc khảo.</span><button type="button" className="min-h-11 font-semibold underline" onClick={retry}>Tải lại</button></div>}

    {!loading && !error && requestList.length > 0 && <ul className="space-y-2">
      {requestList.map(request => <li key={request.id} className="rounded-xl border border-hairline bg-card p-4 text-sm shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-500">Gửi lúc {formatDateTime(request.createdAt)}</span>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneFor(request.status)}`}>{describeStatus(request.status)}</span>
        </div>
        <p className="mt-2 leading-6 text-slate-700">{request.reason}</p>
        {request.responseNote?.trim() && <p className="mt-2 rounded-lg border border-hairline bg-slate-50 p-2 text-slate-600"><span className="font-semibold">Phản hồi:</span> {request.responseNote}</p>}
        {typeof request.newResultVersion === 'number' && <p className="mt-2 text-xs font-semibold text-status-success-text">Đã tạo kết quả phiên bản {request.newResultVersion}.</p>}
      </li>)}
    </ul>}

    {!loading && !error && !hasOpenRequest && <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-800">Lý do phúc khảo
        <textarea rows={3} value={reason} onChange={event => setReason(event.target.value)} maxLength={1000}
          className="mt-1 w-full rounded-lg border border-hairline bg-card p-2 text-slate-950" placeholder="Nêu rõ phần điểm hoặc kết luận bạn muốn xem lại và lý do." />
      </label>
      {formError && <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-2 text-sm text-status-error-text">{formError}</div>}
      <button type="button" onClick={submit} disabled={submitting} className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-white disabled:opacity-60">{submitting ? 'Đang gửi…' : 'Gửi yêu cầu phúc khảo'}</button>
    </div>}
    {!loading && !error && hasOpenRequest && <p className="text-sm text-slate-500">Bạn đang có một yêu cầu phúc khảo chờ xử lý. Vui lòng chờ kết quả trước khi gửi yêu cầu mới.</p>}
  </section>
}
