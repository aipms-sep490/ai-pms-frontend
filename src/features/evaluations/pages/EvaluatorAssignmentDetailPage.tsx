import { readAllPages } from '../../../services/api/paged-read'
import { UnsavedChangesNotice } from '../../../components/ui/UnsavedChangesNotice'
import { dateTimeLabel } from '../../execution/execution-utils'
import './evaluator-detail.css'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import * as api from '../../../services/api/evaluations.api'
import { HttpError } from '../../../services/http/http-client'
import { evaluationError, isConflict } from '../evaluation-errors'
import type { EvaluationDraft, EvaluationScore } from '../evaluation-types'
import type { EvaluationAssignmentEvidence } from '../../../services/api/evaluations.api'
import { useEvaluatorAssignment } from '../hooks/useEvaluatorAssignment'
import { ReportPreviewPanel } from './ReportPreviewPanel'
import { formatCount, formatPercent, formatScore } from '../../../components/ui/format'

type FieldValues = Record<number, { score: string; comments: string }>

function valuesFor(draft: EvaluationDraft): FieldValues {
  return Object.fromEntries(draft.scores.map((criterion) => [criterion.rubricCriterionId, {
    score: criterion.score === null ? '' : String(criterion.score), comments: criterion.comments ?? '',
  }]))
}

function scopeDescription(scope: string, majorName: string | null | undefined, studentName: string | null | undefined): string {
  if (scope === 'COMMON') return 'Thành phần chung của đồ án; không thể chuyển sang ngành hoặc sinh viên khác.'
  if (scope === 'MAJOR_SPECIFIC') return `Ngành: ${majorName ?? 'Chưa tải được tên ngành'}; không thể đổi ngành trong giao diện.`
  if (scope === 'INDIVIDUAL') return `Sinh viên: ${studentName ?? 'Chưa tải được tên sinh viên'}; không thể đổi người được đánh giá.`
  return 'Phạm vi phân công chưa hợp lệ; không có thao tác chấm điểm.'
}

export function EvaluatorAssignmentDetailPage() {
  const { assignment, detail } = useEvaluatorAssignment()
  const [draft, setDraft] = useState<EvaluationDraft | null>(null)
  const [values, setValues] = useState<FieldValues>({})
  const [overallComment, setOverallComment] = useState('')
  const [state, setState] = useState<'loading' | 'empty' | 'ready' | 'unavailable'>('loading')
  const [busy, setBusy] = useState(false)
  const [conflicted, setConflicted] = useState(false), [permissionLost, setPermissionLost] = useState(false)
  const mutationLock = useRef(false)
  const [message, setMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<number, string>>({})
  const [evidence, setEvidence] = useState<EvaluationAssignmentEvidence | null>(null)
  const [evidenceState, setEvidenceState] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()

  const load = useCallback(async (preserveLocal = false) => {
    setState('loading')
    try {
      const result = await readAllPages(page => api.getProjectEvaluations(assignment.projectId, undefined, page))
      const next = result.find((item) => item.assignmentId === assignment.id) ?? null
      setDraft(next)
      if (next && !preserveLocal) { setValues(valuesFor(next)); setOverallComment(next.comments ?? ''); setFieldErrors({}) }
      setState(next ? 'ready' : 'empty')
    } catch (reason) {
      setMessage(evaluationError(reason))
      setState('unavailable')
    }
  }, [assignment.id, assignment.projectId])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    let active = true
    setEvidence(null); setEvidenceState('loading')
    void api.getEvaluationAssignmentEvidence(assignment.id).then((result) => {
      if (!active) return
      setEvidence(result); setEvidenceState('ready')
    }).catch(() => { if (active) setEvidenceState('unavailable') })
    return () => { active = false }
  }, [assignment.id])

  const scoringAllowed = detail.canScore && !detail.legacyReadOnly && !permissionLost && assignment.status === 'ACTIVE'
  const dirty = Boolean(draft && (overallComment.trim() !== (draft.comments ?? '').trim() || draft.scores.some(criterion => {
    const row = values[criterion.rubricCriterionId]
    const raw = row?.score.trim() ?? ''
    const score = raw === '' ? null : Number(raw)
    return score !== criterion.score || (row?.comments.trim() ?? '') !== (criterion.comments ?? '').trim()
  })))
  const canFinalize = Boolean(scoringAllowed && !conflicted && draft?.status === 'DRAFT' && !dirty && draft.totalScore !== null && draft.missingCriterionIds.length === 0)


  const updateCriterion = (criterion: EvaluationScore, patch: Partial<FieldValues[number]>) => {
    setValues((current) => ({ ...current, [criterion.rubricCriterionId]: { ...(current[criterion.rubricCriterionId] ?? { score: '', comments: '' }), ...patch } }))
    setFieldErrors((current) => { const next = { ...current }; delete next[criterion.rubricCriterionId]; return next })
  }

  const validate = () => {
    if (!draft) return false
    const errors: Record<number, string> = {}
    for (const criterion of draft.scores) {
      const raw = values[criterion.rubricCriterionId]?.score.trim() ?? ''
      if (!raw) continue
      const score = Number(raw)
      if (!Number.isFinite(score) || score < 0 || score > criterion.maxScore) errors[criterion.rubricCriterionId] = `Nhập điểm từ 0 đến ${criterion.maxScore}.`
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function startDraft() {
    if (!scoringAllowed || mutationLock.current || conflicted) return
    mutationLock.current = true
    setBusy(true); setMessage(null)
    try {
      const next = await api.createEvaluationDraft(assignment.id)
      setDraft(next); setValues(valuesFor(next)); setOverallComment(next.comments ?? ''); setState('ready')
    } catch (reason) {
      setMessage(evaluationError(reason))
      if (isConflict(reason) || (reason instanceof HttpError && reason.status === 403)) await load(true)
    } finally { mutationLock.current = false; setBusy(false) }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!scoringAllowed || !draft || mutationLock.current || conflicted || !validate()) return
    mutationLock.current = true
    const scores = draft.scores.flatMap((criterion) => {
      const row = values[criterion.rubricCriterionId]
      const raw = row?.score.trim() ?? ''
      return raw ? [{ rubricCriterionId: criterion.rubricCriterionId, score: Number(raw), comments: row?.comments.trim() || null }] : []
    })
    setBusy(true); setMessage(null)
    try {
      const next = await api.saveEvaluationDraft(draft.id, { concurrencyToken: draft.concurrencyToken, comments: overallComment.trim() || null, scores })
      setDraft(next); setValues(valuesFor(next)); setOverallComment(next.comments ?? ''); setMessage('Đã lưu bản nháp theo dữ liệu máy chủ.')
    } catch (reason) {
      if (isConflict(reason)) { setConflicted(true); await load(true) }
      if (reason instanceof HttpError && (reason.status === 403 || reason.status === 404)) { setPermissionLost(true); setEvidence(null); setDraft(null) }
      setMessage(evaluationError(reason))
    } finally { mutationLock.current = false; setBusy(false) }
  }

  async function finalize() {
    if (!canFinalize || !draft || busy || mutationLock.current) return
    mutationLock.current = true; setBusy(true)
    const confirmed = await requestConfirmation({ title: 'Chốt đánh giá?', description: 'Chốt bản điểm đã lưu. Sau khi chốt, bạn không thể sửa điểm hoặc nhận xét. Hệ thống kiểm tra lại phân công và thời hạn đánh giá.', confirmLabel: 'Yêu cầu chốt đánh giá', danger: true })
    if (confirmed === null) { mutationLock.current = false; setBusy(false); return }
    setBusy(true); setMessage(null)
    try {
      const next = await api.finalizeEvaluation(draft.id, draft.concurrencyToken)
      setDraft(next); setValues(valuesFor(next)); setOverallComment(next.comments ?? ''); setMessage('Máy chủ đã chốt đánh giá.')
    } catch (reason) {
      if (isConflict(reason)) { setConflicted(true); await load(true) }
      if (reason instanceof HttpError && (reason.status === 403 || reason.status === 404)) { setPermissionLost(true); setEvidence(null); setDraft(null) }
      setMessage(evaluationError(reason))
    } finally { mutationLock.current = false; setBusy(false) }
  }

  const editable = draft?.status === 'DRAFT'
  const previewFiles = api.evaluationEvidenceFiles(evidence)
  const hasPreview = evidenceState === 'ready' && previewFiles.length > 0
  const rubricSummary = useMemo(() => draft ? `${draft.rubricName} · phiên bản ${draft.rubricVersion}` : (assignment.rubricName ?? 'Chưa tải được tên bộ tiêu chí'), [assignment.rubricName, draft])
  return <WorkspacePage title="Chấm điểm theo phạm vi được phân công" eyebrow={assignment.componentName ?? 'Bài chấm được phân công'} description="Đối chiếu minh chứng, ghi điểm và nhận xét cho từng tiêu chí." backTo="/evaluator/workspace" className="evaluation-workspace evaluator-detail space-y-6 pb-12">
    <header className="rounded-xl border border-hairline bg-card p-5 sm:p-6">
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm text-ink-muted sm:grid-cols-2"><div><dt className="inline font-semibold text-ink-soft">Đồ án: </dt><dd className="inline">{assignment.projectTitle ?? 'Chưa tải được tên đồ án'}</dd></div><div><dt className="inline font-semibold text-ink-soft">Bộ tiêu chí: </dt><dd className="inline">{rubricSummary}</dd></div><div className="sm:col-span-2"><dt className="inline font-semibold text-ink-soft">Phạm vi: </dt><dd className="inline">{scopeDescription(assignment.scope, assignment.majorName, assignment.studentName)}</dd></div></dl>
    </header>

    {message ? <section role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text">{message}</section> : null}
    {conflicted && <section role="alert" className="workspace-surface p-4"><p>Điểm nháp được giữ để đối chiếu. Hãy kiểm tra dữ liệu máy chủ vừa tải trước khi lưu/chốt lại.</p><button type="button" disabled={busy || state !== 'ready'} className="min-h-11 text-primary underline" onClick={() => setConflicted(false)}>Tôi đã đối chiếu bản điểm mới</button></section>}
    <div className="evaluator-cold-layout">
    {hasPreview ? <aside className="evaluator-cold-aside"><ReportPreviewPanel assignmentId={assignment.id} files={previewFiles} /></aside> : null}
    <div className="evaluator-cold-main">
      <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-semibold text-ink">Tóm tắt gói bàn giao</h2>{evidenceState === 'loading' ? <p role="status" className="mt-1 text-sm leading-6 text-ink-muted">Đang tải thông tin gói bàn giao theo phân công…</p> : null}{evidenceState === 'unavailable' ? <p role="alert" className="mt-1 text-sm leading-6 text-status-warning-text">Chưa tải được thông tin gói bàn giao theo phân công. Các phần chấm điểm khác vẫn giữ nguyên.</p> : null}{evidenceState === 'ready' && evidence ? <div className="mt-2 space-y-1 text-sm leading-6 text-ink-muted"><p>Giai đoạn: {({ DEFENSE: 'Bảo vệ', COLD: 'Chấm báo cáo', ON_GOING: 'Đánh giá quá trình' } as Record<string, string>)[evidence.stage ?? ''] ?? 'Chưa xác định'}</p>{evidence.stage === 'COLD' ? <p>Gói báo cáo: {evidence.coldPackageId ? 'Đã khóa' : 'Chưa có'}</p> : null}<p>Gói bàn giao: {evidence.finalSubmissionId ? 'Bản nộp đã khóa của đồ án' : 'Chưa có'}</p><p>Thời điểm nộp: {evidence.submittedAt ? dateTimeLabel(evidence.submittedAt) : 'Chưa có'}</p><p>Số hạng mục bàn giao: {evidence.itemCount}</p>{evidence.itemCount === 0 ? <p role="status" className="text-status-warning-text">Không có tài liệu trong gói đã khóa khớp phạm vi bài chấm này. Minh chứng ngành/cá nhân phải được khai báo đúng ngành và sinh viên trước khi khóa gói. Liên hệ khoa để kiểm tra bộ bàn giao; tài liệu chung không tự trở thành minh chứng cá nhân.</p> : <p>Tài liệu được hiển thị tại mục Báo cáo của sinh viên, có thể xem trước hoặc tải xuống.</p>}</div> : null}<p className="mt-3 text-sm text-ink-muted">Chỉ xem và tải các tệp trong phạm vi phân công này.</p></section>
    {state === 'loading' ? <p role="status" className="rounded-xl border border-hairline bg-card p-4 text-sm text-ink-muted">Đang tải bản nháp và tiêu chí chấm…</p> : null}
    {state === 'unavailable' ? <section className="rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text">Chưa tải được bản nháp đánh giá. <button type="button" className="min-h-11 font-semibold underline" onClick={() => void load(true)}>Tải lại</button></section> : null}
    {!scoringAllowed ? <section role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-5 text-sm text-status-warning-text"><h2 className="font-semibold">Phân công chỉ đọc</h2><p className="mt-1 leading-6">{detail.denialReason === 'LEGACY_SCOPE_UNKNOWN' ? 'Hệ thống đánh dấu phạm vi phân công cũ hoặc không xác định; không có thao tác chấm điểm.' : 'Hệ thống không cấp quyền chấm điểm cho phân công này. Các thao tác tạo, lưu và chốt được ẩn.'}</p></section> : null}
    {state === 'empty' ? <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-semibold text-ink">Chưa có bản nháp đánh giá</h2><p className="mt-1 text-sm leading-6 text-ink-muted">Bạn có thể yêu cầu máy chủ tạo bản nháp cho đúng phân công này. Máy chủ sẽ kiểm tra cửa sổ đánh giá, gói bàn giao đã khóa và phạm vi hiện tại.</p>{scoringAllowed ? <button type="button" disabled={busy} onClick={() => void startDraft()} className="mt-4 min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang tạo…' : 'Tạo bản nháp đánh giá'}</button> : null}</section> : null}

    {state === 'ready' && draft ? <>
      <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-semibold text-ink">Bộ tiêu chí áp dụng</h2><p className="mt-1 text-sm leading-6 text-ink-muted">Nhập điểm và nhận xét cho từng tiêu chí trong bộ đánh giá đã được công bố.</p></section>
      <form className="evaluator-scoring-form" onSubmit={(event) => void save(event)} noValidate>
        {[...draft.scores].sort((a, b) => a.sortOrder - b.sortOrder).map((criterion) => <section key={criterion.rubricCriterionId} className="rounded-xl border border-hairline bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]"><div className="min-w-0"><h2 className="break-words font-semibold text-ink">{criterion.name}{criterion.isRequired ? <span aria-label="bắt buộc" className="ml-1 text-status-error-text">*</span> : null}</h2><p className="mt-1 break-words text-sm leading-6 text-ink-muted">{criterion.description || 'Không có mô tả.'} · trọng số {formatPercent(criterion.weightPercent)} · tối đa {formatScore(criterion.maxScore)}</p></div><label className="text-sm font-semibold text-ink-soft">Điểm<input aria-label={`Điểm ${criterion.name}`} aria-describedby={fieldErrors[criterion.rubricCriterionId] ? `score-error-${criterion.rubricCriterionId}` : undefined} value={values[criterion.rubricCriterionId]?.score ?? ''} onChange={(event) => updateCriterion(criterion, { score: event.target.value })} disabled={!scoringAllowed || !editable || busy} inputMode="decimal" type="number" min="0" max={criterion.maxScore} step="0.01" className="mt-1 block w-full rounded-lg border border-hairline bg-card px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50" /></label></div>
          {fieldErrors[criterion.rubricCriterionId] ? <p id={`score-error-${criterion.rubricCriterionId}`} className="mt-2 text-sm text-status-error-text">{fieldErrors[criterion.rubricCriterionId]}</p> : null}
          <label className="mt-3 block text-sm font-semibold text-ink-soft">Nhận xét tiêu chí<textarea aria-label={`Nhận xét ${criterion.name}`} value={values[criterion.rubricCriterionId]?.comments ?? ''} onChange={(event) => updateCriterion(criterion, { comments: event.target.value })} disabled={!scoringAllowed || !editable || busy} maxLength={2000} className="mt-1 block min-h-24 w-full rounded-lg border border-hairline bg-card px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50" /></label>
        </section>)}
        <section className="rounded-xl border border-hairline bg-card p-5"><label className="block text-sm font-semibold text-ink-soft">Nhận xét tổng thể<textarea aria-label="Nhận xét tổng thể" value={overallComment} onChange={(event) => setOverallComment(event.target.value)} disabled={!scoringAllowed || !editable || busy} maxLength={10000} className="mt-1 block min-h-28 w-full rounded-lg border border-hairline bg-card px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50" /></label>{scoringAllowed && editable ? <button type="submit" disabled={busy || conflicted} className="mt-4 min-h-11 rounded-lg border border-primary px-4 text-sm font-semibold text-primary disabled:opacity-50">{busy ? 'Đang lưu…' : 'Lưu bản nháp'}</button> : <p className="mt-4 text-sm font-semibold text-academic-emerald">{draft.status === 'FINALIZED' ? `Đánh giá đã chốt${draft.finalization ? ` lúc ${dateTimeLabel(draft.finalization.finalizedAt)}` : ''}; chỉ đọc.` : 'Bạn có quyền xem đánh giá này.'}</p>}</section>
      </form>
      {scoringAllowed && editable ? <section className="rounded-xl border border-status-warning-border bg-status-warning-bg p-5 text-sm text-status-warning-text"><h2 className="font-semibold">Chốt đánh giá</h2><dl className="evaluator-score-summary"><div><dt>Điểm đã lưu</dt><dd>{draft.totalScore === null ? 'Chưa đủ điểm' : `${formatScore(draft.totalScore)}/${formatScore(draft.scoreScale)}`}</dd></div><div><dt>Tiêu chí còn thiếu</dt><dd>{formatCount(draft.missingCriterionIds.length)}</dd></div><div><dt>Bản nháp</dt><dd>{dirty ? 'Có thay đổi chưa lưu' : 'Đã đồng bộ'}</dd></div></dl>{dirty ? <p role="status" className="mt-3 font-semibold">Lưu bản nháp trước khi chốt để áp dụng điểm và nhận xét vừa sửa.</p> : null}<p className="mt-1 leading-6">Kiểm tra điểm và nhận xét trước khi chốt. Hệ thống sẽ xác nhận các điều kiện để hoàn tất đánh giá.</p><button type="button" disabled={busy || !canFinalize} onClick={() => void finalize()} className="mt-4 min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">Yêu cầu chốt đánh giá</button></section> : null}

      <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-semibold text-ink">Kết quả công bố</h2><p className="mt-1 text-sm leading-6 text-ink-muted">Kết quả chính thức được bộ môn công bố sau khi hoàn tất đánh giá.</p></section>
    </> : null}
    </div>
    </div>
    <Link to="/evaluator/workspace" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">← Về không gian người chấm</Link>
    <UnsavedChangesNotice dirty={dirty && editable && scoringAllowed} busy={busy} />
    {confirmationDialog}
  </WorkspacePage>
}
