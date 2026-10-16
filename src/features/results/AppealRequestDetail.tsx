import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { HttpError } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'
import * as api from './result-correction-api'
import { appealError, appealInputClass, AppealPaging, saveAppealDownload } from './appeal-ui'

export function AppealRequestDetail({ projectId, requestId, onChanged }: { projectId: number; requestId: number; onChanged?: () => void }) {
  const [row, setRow] = useState<api.ResultCorrectionRequest | null>(null)
  const [history, setHistory] = useState<PagedResult<api.AppealEvent> | null>(null)
  const [page, setPage] = useState(1), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [stale, setStale] = useState(false)
  const [reviewerId, setReviewerId] = useState(''), [reason, setReason] = useState(''), [proposal, setProposal] = useState<'KEEP' | 'AMEND'>('KEEP')
  const [context, setContext] = useState<api.AppealReviewContext | null>(null), [evidence, setEvidence] = useState<api.AppealFile[] | null>(null)
  const [amendments, setAmendments] = useState<Record<string, { score: string; reason: string }>>({})
  const [preview, setPreview] = useState<api.AppealPreview | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const lock = useRef(false), generation = useRef(0), fileInput = useRef<HTMLInputElement>(null)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const load = useCallback(async () => {
    const current = ++generation.current
    setLoading(true); setPreview(null); setContext(null); setEvidence(null); setRow(null); setHistory(null)
    try {
      const [next, events] = await Promise.all([api.getCorrectionRequest(projectId, requestId), api.getAppealHistory(projectId, requestId, page)])
      if (next.id !== requestId || next.projectId !== projectId) throw new Error('Request context mismatch')
      if (current === generation.current) { setRow(next); setHistory(events) }
    } catch (cause) { if (current === generation.current) setError(appealError(cause)) }
    finally { if (current === generation.current) setLoading(false) }
  }, [projectId, requestId, page])
  useEffect(() => { void load(); return () => { generation.current++ } }, [load])

  async function run(operation: () => Promise<unknown>, mutation = false) {
    if (lock.current || loading || (mutation && stale)) return
    lock.current = true; setBusy(true); setError('')
    try { await operation(); if (mutation) { setPreview(null); await load(); onChanged?.() } }
    catch (cause) {
      setPreview(null)
      if (cause instanceof HttpError && cause.status === 409) { setStale(true); await load() }
      if (cause instanceof HttpError && (cause.status === 403 || cause.status === 404)) { setRow(null); setContext(null); setEvidence(null); setHistory(null) }
      setError(appealError(cause))
    } finally { lock.current = false; setBusy(false) }
  }
  async function decide(decision: 'ACCEPTED' | 'REJECTED') {
    if (!row || !reason.trim() || (decision === 'ACCEPTED' && !preview)) return
    const token = row.concurrencyToken, confirmationToken = preview?.confirmationToken ?? null, current = generation.current
    await run(async () => {
      const confirmed = await requestConfirmation({ title: decision === 'ACCEPTED' ? 'Công bố kết quả đính chính?' : 'Từ chối yêu cầu?', description: 'Quyết định được lưu bất biến. Hệ thống kiểm tra lại phạm vi, tính độc lập và phiên bản kết quả.', confirmLabel: 'Xác nhận quyết định', danger: true })
      if (confirmed === null || current !== generation.current) return
      await api.decideAppeal(projectId, requestId, { concurrencyToken: token, confirmationToken, decision, reason: reason.trim() })
    }, true)
  }
  const allowed = (action: string) => row?.allowedActions.includes(action) ?? false
  const disabled = loading || busy || stale
  async function submitReview() {
    if (!row || !context || !reason.trim()) return
    const inputs: api.ScoreAmendment[] = []
    if (proposal === 'AMEND') for (const evaluation of context.evaluations) for (const criterion of evaluation.scores) {
      const draft = amendments[`${evaluation.id}:${criterion.rubricCriterionId}`]
      if (!draft || draft.score.trim() === '') continue
      const score = Number(draft.score)
      if (!Number.isFinite(score) || score < 0 || score > criterion.maxScore || !draft.reason.trim()) { setError('Mỗi tiêu chí đính chính cần điểm hợp lệ và lý do riêng.'); return }
      inputs.push({ evaluationId: evaluation.id, criterionId: criterion.rubricCriterionId, score, reason: draft.reason.trim() })
    }
    if (proposal === 'AMEND' && inputs.length === 0) { setError('Chọn ít nhất một tiêu chí cần đính chính.'); return }
    await run(() => api.reviewAppeal(projectId, requestId, { concurrencyToken: row.concurrencyToken, proposal, reason: reason.trim(), amendments: inputs }), true)
  }
  return <section className="workspace-surface space-y-4 p-4 sm:p-6" aria-label={`Yêu cầu #${requestId}`}>
    {confirmationDialog}<h2 className="font-semibold">Yêu cầu #{requestId}</h2>
    {error && <p role="alert" className="text-sm text-status-error-text">{error}</p>}
    {loading && <p role="status">Đang tải yêu cầu…</p>}
    <Button variant="secondary" disabled={busy || loading} onClick={() => { setError(''); setStale(true); void load() }}>Tải lại yêu cầu</Button>
    {stale && <div role="alert" className="space-y-2"><p>Nội dung nháp được giữ lại. Đối chiếu dữ liệu mới trước khi gửi lại.</p><Button disabled={busy || loading || !row} onClick={() => { setStale(false); setError('') }}>Tôi đã đối chiếu dữ liệu mới</Button></div>}
    {row && !loading && <>
      <dl className="grid gap-2 text-sm sm:grid-cols-2"><div>Nguồn: {row.source}</div><div>Trạng thái: {row.status}</div><div>Đối tượng: {row.targetType} {row.studentId ?? ''} · v{row.resultVersion}</div><div>Thành phần #{row.componentId} · {row.scope} · Ngành {row.majorId ?? '—'}</div><div>Người gửi #{row.requestedBy}</div><div>Reviewer #{row.reviewerId ?? 'Chưa giao'}</div></dl>
      <p className="whitespace-pre-wrap text-sm">{row.reason}</p>
      {row.proposal && <p>Đề nghị: {row.proposal} · {row.reviewReason}</p>}{row.decisionReason && <p>Quyết định: {row.decisionReason}</p>}
      {row.blockers.length > 0 && <ul role="alert" className="list-disc pl-5">{row.blockers.map(code => <li key={code}>{code}</li>)}</ul>}
      <div className="space-y-2"><h3 className="font-medium">Minh chứng đính kèm</h3>{row.files.length === 0 && <p className="text-sm">Chưa có tệp đính kèm.</p>}{row.files.map(item => <Button key={item.fileId} variant="secondary" disabled={busy} onClick={() => void run(() => saveAppealDownload(() => api.downloadAppealFile(projectId, requestId, item.fileId), item.fileName))}>{item.fileName} · {item.sizeBytes} B</Button>)}</div>
      {allowed('UPLOAD') && <form className="space-y-2" onSubmit={event => { event.preventDefault(); if (!file || file.size <= 0 || file.size > 10 * 1024 * 1024) { setError('Chọn tệp từ 1 byte đến 10 MiB.'); return }; void run(async () => { await api.uploadAppealFile(projectId, requestId, row.concurrencyToken, file); setFile(null); if (fileInput.current) fileInput.current.value = '' }, true) }}><label className="block text-sm">Minh chứng bổ sung (tối đa 10 MiB/tệp)<input ref={fileInput} type="file" disabled={disabled} onChange={event => setFile(event.target.files?.[0] ?? null)} /></label><Button type="submit" disabled={disabled || !file}>Tải minh chứng lên</Button></form>}
      {allowed('ASSIGN_REVIEWER') && <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); if (Number.isSafeInteger(Number(reviewerId)) && Number(reviewerId) > 0) void run(() => api.assignAppealReviewer(projectId, requestId, row.concurrencyToken, Number(reviewerId)), true) }}><label className="text-sm">ID reviewer<input type="number" min="1" required value={reviewerId} disabled={disabled} onChange={event => setReviewerId(event.target.value)} className={appealInputClass} /></label><Button type="submit" disabled={disabled}>Giao reviewer</Button><p className="text-sm text-ink-muted">Hệ thống kiểm tra ngành/khoa và tính độc lập của reviewer.</p></form>}
      {(allowed('REVIEW') || allowed('PREVIEW')) && <Button variant="secondary" disabled={disabled} onClick={() => void run(async () => { const [next, files] = await Promise.all([api.getAppealReviewContext(projectId, requestId), api.getAppealEvidence(projectId, requestId)]); setContext(next); setEvidence(files) })}>Đọc hồ sơ review đã khóa</Button>}
      {evidence && <div className="space-y-2"><h3>Minh chứng nguồn đã khóa</h3>{evidence.length === 0 && <p>Không có tệp nguồn được cấp trong hồ sơ này.</p>}{evidence.map(item => <Button key={item.fileId} disabled={busy} variant="secondary" onClick={() => void run(() => saveAppealDownload(() => api.downloadAppealFile(projectId, requestId, item.fileId, true), item.fileName))}>{item.fileName}</Button>)}</div>}
      {context && <div className="space-y-3"><p>Calculation version: {context.calculationVersion}</p>{context.evaluations.map(evaluation => <fieldset key={evaluation.id} className="space-y-2 rounded-lg border border-hairline p-3" disabled={disabled || !allowed('REVIEW')}><legend>{evaluation.rubricName} · v{evaluation.rubricVersion} · Evaluation #{evaluation.id}</legend>{evaluation.scores.map(criterion => { const key = `${evaluation.id}:${criterion.rubricCriterionId}`, input = amendments[key] ?? { score: '', reason: '' }; return <div key={key} className="grid gap-2 sm:grid-cols-3"><span className="text-sm">{criterion.name}: {criterion.score ?? '—'} / {criterion.maxScore}</span><label className="text-sm">Điểm đính chính {criterion.name}<input type="number" min="0" max={criterion.maxScore} step="any" value={input.score} onChange={event => setAmendments(values => ({ ...values, [key]: { ...input, score: event.target.value } }))} className={appealInputClass} /></label><label className="text-sm">Lý do tiêu chí {criterion.name}<input maxLength={2000} value={input.reason} onChange={event => setAmendments(values => ({ ...values, [key]: { ...input, reason: event.target.value } }))} className={appealInputClass} /></label></div> })}</fieldset>)}{context.amendments.length > 0 && <ul>{context.amendments.map(item => <li key={`${item.evaluationId}:${item.criterionId}`}>Đã đề nghị: evaluation #{item.evaluationId}, tiêu chí #{item.criterionId}: {item.score} · {item.reason}</li>)}</ul>}</div>}
      {(allowed('REVIEW') || allowed('REJECT') || allowed('ACCEPT')) && <label className="block text-sm">Lý do review / quyết định<textarea maxLength={2000} value={reason} disabled={disabled} onChange={event => { setReason(event.target.value); setPreview(null) }} className={appealInputClass} /></label>}
      {allowed('REVIEW') && <div className="flex flex-wrap gap-3"><label>Đề nghị<select value={proposal} disabled={disabled} onChange={event => setProposal(event.target.value as 'KEEP' | 'AMEND')} className={appealInputClass}><option value="KEEP">Giữ nguyên</option><option value="AMEND">Đính chính tiêu chí</option></select></label><Button disabled={disabled || !context || !reason.trim()} onClick={() => void submitReview()}>Lưu đề nghị review</Button></div>}
      {allowed('PREVIEW') && <Button disabled={disabled} onClick={() => void run(async () => setPreview(await api.previewAppeal(projectId, requestId)))}>Xem trước kết quả ảnh hưởng</Button>}
      {preview && <div className="space-y-2"><h3 className="font-medium">Kết quả ảnh hưởng theo máy chủ</h3>{preview.affectedResults.map(item => <p key={item.studentId ?? 'project'}>{item.studentId == null ? 'Đồ án' : `Sinh viên #${item.studentId}`}: v{item.supersedesVersion} → v{item.version} · {item.totalScore} · {item.outcome}</p>)}</div>}
      <div className="flex flex-wrap gap-3">{allowed('ACCEPT') && <Button disabled={disabled || !preview || !reason.trim()} onClick={() => void decide('ACCEPTED')}>Chấp nhận và công bố revision</Button>}{allowed('REJECT') && <Button variant="danger" disabled={disabled || !reason.trim()} onClick={() => void decide('REJECTED')}>Từ chối yêu cầu</Button>}</div>
      {history && <section className="space-y-3"><h3 className="font-medium">Lịch sử yêu cầu</h3>{history.items.length === 0 && <p>Chưa có sự kiện.</p>}<ol className="space-y-2 text-sm">{history.items.map(item => <li key={item.id}>{new Date(item.at).toLocaleString('vi-VN')} · {item.action} · #{item.actorId}{item.reason && ` · ${item.reason}`}{item.bundleId != null && ` · Bundle #${item.bundleId}`}</li>)}</ol><AppealPaging page={page} totalCount={history.totalCount} busy={busy || loading} onChange={setPage} /></section>}
    </>}
  </section>
}
