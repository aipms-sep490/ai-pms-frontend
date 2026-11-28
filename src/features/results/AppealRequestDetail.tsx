import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { ActionVerdict } from '../../components/ui/ActionVerdict'
import { ChangeDiff } from '../../components/ui/ChangeDiff'
import { displayLabel } from '../../components/ui/display-label'
import { HistoryTimeline } from '../../components/ui/HistoryTimeline'
import { ListLoading } from '../../components/ui/ListLoading'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { HttpError } from '../../services/http/http-client'
import { getProjectResultVersion, getStudentResultVersion } from '../../services/api/project-results.api'
import type { PagedResult } from '../../types/backend'
import * as api from './result-correction-api'
import { appealError, appealInputClass, AppealPaging, saveAppealDownload } from './appeal-ui'
import { AppealAssistPanel } from '../ai-suite/EvaluationAiPanels'

export function AppealRequestDetail({ projectId, requestId, onChanged }: { projectId: number; requestId: number; onChanged?: () => void }) {
  const [row, setRow] = useState<api.ResultCorrectionRequest | null>(null)
  const [history, setHistory] = useState<PagedResult<api.AppealEvent> | null>(null)
  const [page, setPage] = useState(1), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [stale, setStale] = useState(false)
  const [reviewerId, setReviewerId] = useState(''), [reason, setReason] = useState(''), [proposal, setProposal] = useState<'KEEP' | 'AMEND'>('KEEP')
  const [reviewers, setReviewers] = useState<api.EligibleAppealReviewer[]>([])
  const [context, setContext] = useState<api.AppealReviewContext | null>(null), [evidence, setEvidence] = useState<api.AppealFile[] | null>(null)
  const [amendments, setAmendments] = useState<Record<string, { score: string; reason: string }>>({})
  const [gateAmendments, setGateAmendments] = useState<Record<number, { gateNumber: number; score: string; reason: string }>>({})
  const [errataProposal, setErrataProposal] = useState<'KEEP' | 'AMEND'>('KEEP')
  const [preview, setPreview] = useState<api.AppealPreview | null>(null)
  const [currentVersions, setCurrentVersions] = useState<Record<string, { totalScore: number; outcome: string }>>({})
  const [withdrawReason, setWithdrawReason] = useState('')
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

  const canAssignReviewer = row?.allowedActions.includes('ASSIGN_REVIEWER') ?? false
  useEffect(() => {
    if (!canAssignReviewer || typeof api.getEligibleAppealReviewers !== 'function') return
    const abort = new AbortController()
    void api.getEligibleAppealReviewers(projectId, requestId, abort.signal)
      .then(result => {
        if (abort.signal.aborted) return
        setReviewers(Array.isArray(result) ? result : (result.items ?? []))
      })
      .catch(() => { if (!abort.signal.aborted) setReviewers([]) })
    return () => abort.abort()
  }, [canAssignReviewer, projectId, requestId])

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
  async function loadPreview() {
    if (!row) return
    const current = generation.current
    await run(async () => {
      setCurrentVersions({})
      const next = await api.previewAppeal(projectId, requestId)
      if (current !== generation.current) return
      const published = await Promise.allSettled(next.affectedResults.map(async item => {
        const version = item.supersedesVersion ?? row.resultVersion
        const result = item.studentId == null
          ? await getProjectResultVersion(projectId, version)
          : await getStudentResultVersion(projectId, item.studentId, version)
        if (result.projectId !== projectId || result.version !== version || (item.studentId != null && (!('studentId' in result) || result.studentId !== item.studentId))) return null
        return { key: `${item.studentId ?? 'project'}:${version}`, totalScore: result.totalScore, outcome: result.outcome }
      }))
      if (current !== generation.current) return
      setCurrentVersions(Object.fromEntries(published.flatMap(item => item.status === 'fulfilled' && item.value ? [[item.value.key, { totalScore: item.value.totalScore, outcome: item.value.outcome }]] : [])))
      setPreview(next)
    })
  }
  async function submitReview() {
    if (!row || !context || !reason.trim()) return
    const inputs: api.ScoreAmendment[] = []
    if (proposal === 'AMEND') for (const evaluation of context.evaluations) for (const criterion of evaluation.scores) {
      const draft = amendments[`${evaluation.id}:${criterion.rubricCriterionId}`]
      if (!draft || draft.score.trim() === '' || criterion.maxScore == null) continue
      const score = Number(draft.score)
      if (!Number.isFinite(score) || score < 0 || score > criterion.maxScore || !draft.reason.trim()) { setError('Mỗi tiêu chí đính chính cần điểm hợp lệ và lý do riêng.'); return }
      inputs.push({ evaluationId: evaluation.id, criterionId: criterion.rubricCriterionId, score, reason: draft.reason.trim() })
    }
    if (proposal === 'AMEND' && inputs.length === 0) { setError('Chọn ít nhất một tiêu chí cần đính chính.'); return }
    await run(() => api.reviewAppeal(projectId, requestId, { concurrencyToken: row.concurrencyToken, proposal, reason: reason.trim(), amendments: inputs }), true)
  }
  async function submitSupervisorErrataResponse() {
    if (!row || !context || !reason.trim()) return
    const inputs: api.GateProcessAmendment[] = []
    if (errataProposal === 'AMEND') {
      for (const gs of context.gateScores ?? []) {
        const draft = gateAmendments[gs.gateScoreId]
        if (!draft || draft.score.trim() === '') continue
        const score = Number(draft.score)
        if (!Number.isFinite(score) || score < 0 || score > 10 || !draft.reason.trim()) {
          setError('Mỗi Gate đính chính 20% cần điểm từ 0–10 và lý do cụ thể.')
          return
        }
        inputs.push({ gateScoreId: gs.gateScoreId, gateNumber: gs.gateNumber, score, reason: draft.reason.trim() })
      }
      if (inputs.length === 0) {
        setError('Nhập ít nhất một Gate cần đính chính điểm 20%.')
        return
      }
    }
    await run(() => api.submitSupervisorErrata(projectId, requestId, {
      concurrencyToken: row.concurrencyToken,
      proposal: errataProposal,
      reason: reason.trim(),
      gateAmendments: inputs,
    }), true)
  }
  async function withdraw() {
    if (!row || !row.concurrencyToken) return
    const token = row.concurrencyToken, current = generation.current
    await run(async () => {
      const confirmed = await requestConfirmation({
        title: 'Rút yêu cầu phúc khảo?',
        description: 'Yêu cầu ở trạng thái Đang chờ sẽ chuyển sang Đã rút (WITHDRAWN). Bạn có thể nộp yêu cầu mới nếu đợt phúc khảo vẫn còn mở.',
        confirmLabel: 'Xác nhận rút yêu cầu',
        danger: true,
      })
      if (confirmed === null || current !== generation.current) return
      await api.withdrawCorrectionRequest(projectId, requestId, {
        concurrencyToken: token,
        reason: withdrawReason.trim() || undefined,
      })
      setWithdrawReason('')
    }, true)
  }
  return <section className="workspace-surface space-y-4 p-4 sm:p-6" aria-label={`Yêu cầu #${requestId}`}>
    {confirmationDialog}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold text-ink">Chi tiết yêu cầu phúc khảo</h2>
      {row && <StatusBadge tone={row.status === 'ACCEPTED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'warning'} label={displayLabel(row.status)} />}
    </div>
    {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{error}</p>}
    {loading && <ListLoading label="Đang tải yêu cầu…" />}
    <Button variant="secondary" disabled={busy || loading} onClick={() => { setError(''); setStale(true); void load() }}>Tải lại yêu cầu</Button>
    {stale && <div role="alert" className="space-y-2 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text"><p>Nội dung nháp được giữ lại. Đối chiếu dữ liệu mới trước khi gửi lại.</p><Button disabled={busy || loading || !row} onClick={() => { setStale(false); setError('') }}>Tôi đã đối chiếu dữ liệu mới</Button></div>}
    {row && !loading && <>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>Nguồn: <strong>{displayLabel(row.source)}</strong></div>
        {row.appealKind && <div>Phạm vi xử lý: <strong>{displayLabel(row.appealKind)}</strong></div>}
        <div>Trạng thái: <strong>{displayLabel(row.status)}</strong></div>
        <div>Đối tượng: <strong>{row.studentName ?? displayLabel(row.targetType)}</strong> · v{row.resultVersion}</div>
        <div>Thành phần: <strong>{row.componentNames?.length ? row.componentNames.join(', ') : (row.componentName ?? 'Thành phần kết quả')}</strong> · {displayLabel(row.scope)}{row.majorName ? ` · ${row.majorName}` : ''}</div>
        <div>Người gửi: <strong>{row.requestedByName ?? 'Người yêu cầu'}</strong></div>
        <div>Người thẩm định: <strong>{row.reviewerName ?? (row.reviewerId ? 'Đã phân công' : 'Chưa giao')}</strong></div>
      </dl>
      <p className="whitespace-pre-wrap text-sm">{row.reason}</p>
      {row.supervisorNote && <p className="rounded-lg border border-hairline bg-canvas p-3 text-sm text-ink-soft"><strong>Phản hồi GVHD Chính (20%):</strong> {row.supervisorNote}</p>}
      {row.proposal && <p className="text-sm">Đề nghị: <strong>{displayLabel(row.proposal)}</strong>{row.reviewReason ? ` · ${row.reviewReason}` : ''}</p>}
      {row.decisionReason && <p className="text-sm">Quyết định: {row.decisionReason}</p>}
      {row.blockers.length > 0 && !allowed('ACCEPT') && !allowed('REJECT') && <ul role="alert" className="list-disc rounded-lg border border-status-warning-border bg-status-warning-bg py-3 pr-4 pl-8 text-sm text-status-warning-text">{row.blockers.map(code => <li key={code}>{displayLabel(code)}</li>)}</ul>}
      <div className="space-y-2"><h3 className="font-medium">Minh chứng đính kèm</h3>{row.files.length === 0 && <p className="text-sm text-ink-muted">Chưa có tệp đính kèm.</p>}{row.files.map(item => <Button key={item.fileId} variant="secondary" disabled={busy} onClick={() => void run(() => saveAppealDownload(() => api.downloadAppealFile(projectId, requestId, item.fileId), item.fileName))}>{item.fileName} · {(item.sizeBytes / 1024).toFixed(1)} KB</Button>)}</div>
      {allowed('UPLOAD') && <form className="space-y-2" onSubmit={event => { event.preventDefault(); if (!file || file.size <= 0 || file.size > 10 * 1024 * 1024) { setError('Chọn tệp từ 1 byte đến 10 MiB.'); return }; void run(async () => { await api.uploadAppealFile(projectId, requestId, row.concurrencyToken, file); setFile(null); if (fileInput.current) fileInput.current.value = '' }, true) }}><div><label htmlFor={`appeal-evidence-file-${requestId}`} className="block text-sm font-medium text-ink-soft">Minh chứng bổ sung (tối đa 10 MiB/tệp)</label><div className="relative mt-1 grid min-h-11 min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-hairline bg-card font-normal transition-colors hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"><span aria-hidden="true" className="flex items-center border-r border-hairline bg-primary-subtle px-3.5 text-xs font-semibold text-primary">Chọn tệp</span><span aria-hidden="true" className="flex items-center truncate px-3 text-xs font-medium text-ink-muted">{file ? file.name : 'Chưa chọn tệp'}</span><input id={`appeal-evidence-file-${requestId}`} ref={fileInput} type="file" className="absolute inset-0 cursor-pointer opacity-0" disabled={disabled} onChange={event => setFile(event.target.files?.[0] ?? null)} /></div></div><Button type="submit" disabled={disabled || !file}>Tải minh chứng lên</Button></form>}
      {allowed('WITHDRAW') && (
        <div className="rounded-lg border border-hairline bg-canvas p-3 space-y-2">
          <label className="block text-sm">
            Lý do rút yêu cầu (tùy chọn)
            <input
              maxLength={500}
              value={withdrawReason}
              disabled={disabled}
              onChange={event => setWithdrawReason(event.target.value)}
              className={appealInputClass}
              placeholder="Ví dụ: Em xin rút để kiểm tra lại minh chứng trước khi gửi đơn mới…"
            />
          </label>
          <Button variant="secondary" disabled={disabled} onClick={() => void withdraw()}>
            Rút yêu cầu phúc khảo
          </Button>
        </div>
      )}
      {allowed('ASSIGN_REVIEWER') && <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); if (Number.isSafeInteger(Number(reviewerId)) && Number(reviewerId) > 0) void run(() => api.assignAppealReviewer(projectId, requestId, row.concurrencyToken, Number(reviewerId)), true) }}>
        <label className="text-sm">Người thẩm định
          <select required value={reviewerId} disabled={disabled} onChange={event => setReviewerId(event.target.value)} className={appealInputClass}>
            <option value="">Chọn giảng viên thẩm định</option>
            {reviewers.map(item => <option key={item.userId} value={item.userId}>{item.fullName}{item.departmentName ? ` (${item.departmentName})` : ''}</option>)}
          </select>
        </label>
        <Button type="submit" disabled={disabled || !reviewerId}>Giao người thẩm định</Button>
        <p className="text-sm text-ink-muted">Hệ thống tự động kiểm tra ngành/bộ môn và tính độc lập của người thẩm định.</p>
      </form>}
      {(allowed('REVIEW') || allowed('PREVIEW') || allowed('SUPERVISOR_ERRATA')) && <Button variant="secondary" disabled={disabled} onClick={() => void run(async () => { const [next, files] = await Promise.all([api.getAppealReviewContext(projectId, requestId), api.getAppealEvidence(projectId, requestId)]); setContext(next); setEvidence(files) })}>Đọc hồ sơ thẩm định đã khóa</Button>}
      {evidence && <div className="space-y-2"><h3>Minh chứng nguồn đã khóa</h3>{evidence.length === 0 && <p className="text-sm text-ink-muted">Không có tệp nguồn được cấp trong hồ sơ này.</p>}{evidence.map(item => <Button key={item.fileId} disabled={busy} variant="secondary" onClick={() => void run(() => saveAppealDownload(() => api.downloadAppealFile(projectId, requestId, item.fileId, true), item.fileName))}>{item.fileName}</Button>)}</div>}
      {context && <div className="space-y-3"><p className="text-sm text-ink-muted">Phiên bản công thức tính: {context.calculationVersion}</p>{context.gateScores && context.gateScores.length > 0 && <fieldset className="space-y-2 rounded-lg border border-hairline p-3" disabled={disabled || !allowed('SUPERVISOR_ERRATA')}><legend className="px-1 text-sm font-medium">Điểm quá trình 20% theo Gate (G1–G3)</legend>{context.gateScores.map(gs => { const draft = gateAmendments[gs.gateScoreId] ?? { gateNumber: gs.gateNumber, score: '', reason: '' }; return <div key={gs.gateScoreId} className="grid gap-2 sm:grid-cols-3"><span className="text-sm">Gate {gs.gateNumber} (trọng số {gs.gateWeightPercent}%): {gs.score} / 10</span><label className="text-sm">Điểm đính chính Gate {gs.gateNumber}<input type="number" min="0" max="10" step="0.01" value={draft.score} onChange={event => setGateAmendments(prev => ({ ...prev, [gs.gateScoreId]: { ...draft, gateNumber: gs.gateNumber, score: event.target.value } }))} className={appealInputClass} /></label><label className="text-sm">Lý do đính chính Gate {gs.gateNumber}<input maxLength={2000} value={draft.reason} onChange={event => setGateAmendments(prev => ({ ...prev, [gs.gateScoreId]: { ...draft, gateNumber: gs.gateNumber, reason: event.target.value } }))} className={appealInputClass} /></label></div> })}</fieldset>}{context.evaluations.map(evaluation => <fieldset key={evaluation.id} className="space-y-2 rounded-lg border border-hairline p-3" disabled={disabled || !allowed('REVIEW')}><legend className="px-1 text-sm font-medium">{evaluation.rubricName} · v{evaluation.rubricVersion}{evaluation.evaluatorName ? ` · ${evaluation.evaluatorName}` : ''}</legend>{evaluation.scores.map(criterion => { const key = `${evaluation.id}:${criterion.rubricCriterionId}`, input = amendments[key] ?? { score: '', reason: '' }; return <div key={key} className="grid gap-2 sm:grid-cols-3">{criterion.maxScore == null ? <span className="text-sm">{criterion.name}: Nhóm tiêu chí, không đính chính điểm trực tiếp.</span> : <><span className="text-sm">{criterion.name}: {criterion.score ?? '—'} / {criterion.maxScore}</span><label className="text-sm">Điểm đính chính {criterion.name}<input type="number" min="0" max={criterion.maxScore} step="any" value={input.score} onChange={event => setAmendments(values => ({ ...values, [key]: { ...input, score: event.target.value } }))} className={appealInputClass} /></label><label className="text-sm">Lý do tiêu chí {criterion.name}<input maxLength={2000} value={input.reason} onChange={event => setAmendments(values => ({ ...values, [key]: { ...input, reason: event.target.value } }))} className={appealInputClass} /></label></>}</div> })}</fieldset>)}{context.amendments.length > 0 && <ul className="list-disc pl-5 text-sm">{context.amendments.map(item => <li key={`${item.evaluationId}:${item.criterionId}`}>Đã đề nghị điều chỉnh {item.criterionName ?? 'tiêu chí'}: {item.score} điểm · {item.reason}</li>)}</ul>}</div>}
      {(allowed('REVIEW') || allowed('REJECT') || allowed('ACCEPT') || allowed('ASSIGN_REVIEWER')) && (
        <AppealAssistPanel
          appealId={requestId}
          onUseDraftResponse={(draftText) => {
            setReason(draftText)
            setPreview(null)
          }}
        />
      )}
      {(allowed('REVIEW') || allowed('REJECT') || allowed('ACCEPT') || allowed('SUPERVISOR_ERRATA')) && <label className="block text-sm">Lý do thẩm định / quyết định<textarea maxLength={2000} value={reason} disabled={disabled} onChange={event => { setReason(event.target.value); setPreview(null) }} className={appealInputClass} /></label>}
      {allowed('SUPERVISOR_ERRATA') && <div className="flex flex-wrap gap-3"><label className="text-sm">Phản hồi GVHD Chính<select value={errataProposal} disabled={disabled} onChange={event => setErrataProposal(event.target.value as 'KEEP' | 'AMEND')} className={appealInputClass}><option value="KEEP">Giữ nguyên điểm 20%</option><option value="AMEND">Đính chính điểm quá trình 20%</option></select></label><Button disabled={disabled || !context || !reason.trim()} onClick={() => void submitSupervisorErrataResponse()}>Gửi phản hồi đính chính 20%</Button></div>}
      {allowed('REVIEW') && <div className="flex flex-wrap gap-3"><label className="text-sm">Đề nghị<select value={proposal} disabled={disabled} onChange={event => setProposal(event.target.value as 'KEEP' | 'AMEND')} className={appealInputClass}><option value="KEEP">Giữ nguyên</option><option value="AMEND">Đính chính tiêu chí</option></select></label><Button disabled={disabled || !context || !reason.trim()} onClick={() => void submitReview()}>Lưu đề nghị thẩm định</Button></div>}
      {allowed('PREVIEW') && <Button disabled={disabled} onClick={() => void loadPreview()}>Xem trước kết quả ảnh hưởng</Button>}
      {preview && <div className="space-y-3"><h3 className="font-medium">Kết quả ảnh hưởng theo máy chủ</h3>{preview.affectedResults.map(item => {
        const previous = currentVersions[`${item.studentId ?? 'project'}:${item.supersedesVersion ?? row.resultVersion}`]
        const targetLabel = item.studentId == null ? 'Đồ án' : (item.studentName ?? 'Sinh viên')
        return <section key={item.studentId ?? 'project'} className="space-y-2" aria-label={targetLabel}>
          <p>{targetLabel}: v{item.supersedesVersion} → v{item.version} · {item.totalScore} · {displayLabel(item.outcome)}</p>
          <ChangeDiff rows={[{ label: 'Phiên bản', before: item.supersedesVersion ?? row.resultVersion, after: item.version }, { label: 'Tổng điểm', before: previous?.totalScore, after: item.totalScore }, { label: 'Kết quả', before: previous ? displayLabel(previous.outcome) : undefined, after: displayLabel(item.outcome) }]} />
          {!previous && <p className="text-sm text-ink-muted">Chưa đọc được điểm của phiên bản hiện tại; kiểm tra lịch sử kết quả trước khi quyết định.</p>}
        </section>
      })}</div>}
      {(allowed('ACCEPT') || allowed('REJECT')) && <ActionVerdict actions={[{ code: 'ACCEPT', allowed: allowed('ACCEPT'), reasons: row.blockers }]} actionCode="ACCEPT" status="ready" okLabel="Điều kiện công bố hợp lệ" blockedLabel="Không thể công bố đính chính">
        <ActionVerdict.Decision primary={{ label: 'Chấp nhận và công bố bản đính chính', onClick: () => void decide('ACCEPTED'), disabled: disabled || !preview || !reason.trim() }}
          secondary={allowed('REJECT') ? { label: 'Từ chối yêu cầu', onClick: () => void decide('REJECTED'), disabled: disabled || !reason.trim() } : undefined} />
      </ActionVerdict>}
      {history && <section className="space-y-3"><h3 className="font-medium">Lịch sử yêu cầu</h3><HistoryTimeline items={history.items.map(item => ({ at: item.at, action: displayLabel(item.action), actor: item.actorName ?? 'Người thực hiện', note: [item.reason, item.bundleId != null ? 'Gói đính chính' : null].filter(Boolean).join(' · ') }))} emptyLabel="Chưa có sự kiện." /><AppealPaging page={page} totalCount={history.totalCount} busy={busy || loading} onChange={setPage} /></section>}
    </>}
  </section>
}
