import { useEffect, useState } from 'react'
import { ListLoading } from '../../components/ui/ListLoading'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { BadgeTone } from '../../components/ui/status-badge-tone'
import {
  createCorrectionRequest, downloadCorrectionRequestFile, getAppealPolicy, getAppealWindows, getCorrectionRequests,
  hasCorrectionAction, uploadCorrectionRequestFile,
  type AppealWindow, type CorrectionRequest, type CorrectionRequestStatus,
} from './result-correction-api'
import type { ResultComponentScore } from './result-types'

const statusText: Record<string, string> = { PENDING: 'Chờ xử lý', UNDER_REVIEW: 'Đang xem xét', ACCEPTED: 'Đã chấp nhận', REJECTED: 'Đã từ chối' }
const statusTone: Record<string, BadgeTone> = { PENDING: 'neutral', UNDER_REVIEW: 'warning', ACCEPTED: 'success', REJECTED: 'danger' }
const describeStatus = (status: CorrectionRequestStatus) => statusText[status] ?? status
const toneFor = (status: CorrectionRequestStatus): BadgeTone => statusTone[status] ?? 'neutral'
const scopeLabel = (scope: string) => ({ COMMON: 'Điểm chung', MAJOR: 'Theo ngành', INDIVIDUAL: 'Cá nhân' } as Record<string, string>)[scope.toUpperCase()] ?? scope

/**
 * BE Appeals (ResultAppealsController): a request targets one scored component of one specific
 * published result version, inside an explicit lead-opened window for that exact target+version —
 * there is no open-ended "appeal anytime" path. An accepted request creates a new result version on
 * the backend; the FE only submits evidence and tracks status. Reviewer assignment/decision is a
 * separate staff/lead screen, not wired here.
 */
export function ResultCorrectionPanel({ projectId, studentId, resultVersion, components }: {
  projectId: number
  studentId: number
  resultVersion: number
  components: ResultComponentScore[]
}) {
  const [hasPolicy, setHasPolicy] = useState(false)
  const [appealWindow, setAppealWindow] = useState<AppealWindow | null>(null)
  const [requests, setRequests] = useState<CorrectionRequest[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  const [componentId, setComponentId] = useState<number | ''>('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([
      getAppealPolicy(projectId, controller.signal),
      getAppealWindows(projectId, 1, 50, controller.signal),
      getCorrectionRequests(projectId, 1, 50, controller.signal),
    ]).then(([policy, windows, list]) => {
      if (controller.signal.aborted) return
      setHasPolicy(policy !== null)
      setAppealWindow(policy ? windows.items.find(w => w.status === 'OPEN'
        && w.targets.some(t => t.targetType === 'STUDENT' && t.studentId === studentId && t.resultVersion === resultVersion)) ?? null : null)
      setRequests(list.items)
      setError(false)
    }).catch(() => { if (!controller.signal.aborted) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, studentId, resultVersion, revision])

  const retry = () => { setLoading(true); setError(false); setRequests(null); setRevision(value => value + 1) }

  const requestList = requests ?? []
  const openForThisVersion = requestList.some(request => request.resultVersion === resultVersion && (request.status === 'PENDING' || request.status === 'UNDER_REVIEW'))

  const submit = () => {
    const value = reason.trim()
    if (componentId === '') { setFormError('Hãy chọn phần điểm bạn muốn phúc khảo.'); return }
    if (value.length < 10) { setFormError('Hãy nêu lý do phúc khảo (tối thiểu 10 ký tự).'); return }
    if (!appealWindow) return
    setSubmitting(true); setFormError(null)
    void createCorrectionRequest(projectId, {
      policyId: appealWindow.policyId, windowId: appealWindow.id, studentId, resultVersion, componentId, reason: value,
    })
      .then(() => { setReason(''); setComponentId(''); setRevision(value_ => value_ + 1) })
      .catch(() => setFormError('Chưa gửi được yêu cầu. Hãy thử lại.'))
      .finally(() => setSubmitting(false))
  }

  const upload = (request: CorrectionRequest, file: File) => {
    setUploadingId(request.id); setFormError(null)
    void uploadCorrectionRequestFile(projectId, request.id, file, request.concurrencyToken)
      .then(() => setRevision(value => value + 1))
      .catch(() => setFormError('Chưa tải lên được minh chứng. Hãy thử lại.'))
      .finally(() => setUploadingId(null))
  }

  const download = async (request: CorrectionRequest, file: { fileId: number; fileName: string }) => {
    try {
      const blob = await downloadCorrectionRequestFile(projectId, request.id, file.fileId)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = file.fileName
      anchor.click()
      URL.revokeObjectURL(url)
    } catch { setFormError('Chưa tải được tệp minh chứng.') }
  }

  return <section className="space-y-3 rounded-2xl border border-hairline bg-card p-5 shadow-xs">
    <div>
      <h2 className="text-base font-bold text-slate-950">Phúc khảo / đính chính kết quả</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">Yêu cầu nhắm vào một thành phần điểm cụ thể của phiên bản kết quả hiện tại. Yêu cầu được chấp nhận sẽ tạo một phiên bản kết quả mới.</p>
    </div>

    {loading && <ListLoading label="Đang tải thông tin phúc khảo…" />}
    {!loading && error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text"><span>Chưa tải được thông tin phúc khảo.</span><button type="button" className="min-h-11 font-semibold underline" onClick={retry}>Tải lại</button></div>}
    {!loading && !error && formError && <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-2 text-sm text-status-error-text">{formError}</div>}

    {!loading && !error && !hasPolicy && <p className="text-sm text-slate-600">Phúc khảo chưa được kích hoạt cho đồ án này.</p>}

    {!loading && !error && hasPolicy && requestList.length > 0 && <ul className="space-y-2">
      {requestList.map(request => <li key={request.id} className="rounded-xl border border-hairline bg-card p-4 text-sm shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-500">{scopeLabel(request.scope)} · phiên bản {request.resultVersion}</span>
          <StatusBadge tone={toneFor(request.status)} label={describeStatus(request.status)} />
        </div>
        <p className="mt-2 leading-6 text-slate-700">{request.reason}</p>
        {request.proposal && <p className="mt-2 rounded-lg border border-hairline bg-slate-50 p-2 text-slate-600"><span className="font-semibold">Đề xuất của người thẩm định:</span> {request.proposal}{request.reviewReason && ` — ${request.reviewReason}`}</p>}
        {request.decisionReason && <p className="mt-2 rounded-lg border border-hairline bg-slate-50 p-2 text-slate-600"><span className="font-semibold">Quyết định:</span> {request.decisionReason}</p>}
        {request.files.length > 0 && <ul className="mt-2 space-y-1">
          {request.files.map(file => <li key={file.fileId}><button type="button" className="text-primary underline" onClick={() => void download(request, file)}>{file.fileName}</button></li>)}
        </ul>}
        {hasCorrectionAction(request, 'UPLOAD') && <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-hairline px-3 text-xs font-semibold text-primary">
          {uploadingId === request.id ? 'Đang tải lên…' : 'Đính kèm minh chứng'}
          <input type="file" className="sr-only" disabled={uploadingId === request.id} onChange={event => { const file = event.target.files?.[0]; if (file) upload(request, file); event.target.value = '' }} />
        </label>}
      </li>)}
    </ul>}

    {!loading && !error && hasPolicy && !appealWindow && <p className="text-sm text-slate-500">Hiện không có đợt phúc khảo nào đang mở cho kết quả phiên bản {resultVersion} của bạn.</p>}

    {!loading && !error && hasPolicy && appealWindow && !openForThisVersion && <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-800">Phần điểm muốn phúc khảo
        <select className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-2" value={componentId}
          onChange={event => setComponentId(event.target.value ? Number(event.target.value) : '')}>
          <option value="">Chọn phần điểm</option>
          {components.map(component => <option key={component.componentId} value={component.componentId}>{component.name} ({scopeLabel(component.scope)})</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-800">Lý do phúc khảo
        <textarea rows={3} value={reason} onChange={event => setReason(event.target.value)} maxLength={2000}
          className="mt-1 w-full rounded-lg border border-hairline bg-card p-2 text-slate-950" placeholder="Nêu rõ phần điểm bạn muốn xem lại và lý do." />
      </label>
      <button type="button" onClick={submit} disabled={submitting} className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-white disabled:opacity-60">{submitting ? 'Đang gửi…' : 'Gửi yêu cầu phúc khảo'}</button>
    </div>}
    {!loading && !error && hasPolicy && appealWindow && openForThisVersion && <p className="text-sm text-slate-500">Bạn đang có một yêu cầu phúc khảo chờ xử lý cho phiên bản này. Vui lòng chờ kết quả trước khi gửi yêu cầu mới.</p>}
  </section>
}
