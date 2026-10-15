import { UnsavedChangesNotice } from '../../../components/ui/UnsavedChangesNotice'
import { dateTimeLabel } from '../../execution/execution-utils'
import './evaluator-detail.css'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { Button } from '../../../components/ui/Button'
import { InlineAlert } from '../../../components/ui/InlineAlert'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
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

type StatusMessage = { text: string; tone: BadgeTone }

type FieldValues = Record<number, { score: string; comments: string }>

function valuesFor(draft: EvaluationDraft): FieldValues {
  return Object.fromEntries(draft.scores.map((criterion) => [criterion.rubricCriterionId, {
    score: criterion.score === null ? '' : String(criterion.score), comments: criterion.comments ?? '',
  }]))
}

function scopeDescription(scope: string, majorId: number | null, studentId: number | null): string {
  if (scope === 'COMMON') return 'Thành phần chung của đồ án; không thể chuyển sang ngành hoặc sinh viên khác.'
  if (scope === 'MAJOR_SPECIFIC') return `Thành phần dành cho ngành #${majorId ?? '—'}; không thể đổi ngành trong giao diện.`
  if (scope === 'INDIVIDUAL') return `Thành phần dành cho sinh viên #${studentId ?? '—'}; không thể đổi người được đánh giá.`
  return 'Phạm vi phân công chưa hợp lệ; không có thao tác chấm điểm.'
}

export function EvaluatorAssignmentDetailPage() {
  const { assignment, detail } = useEvaluatorAssignment()
  const [draft, setDraft] = useState<EvaluationDraft | null>(null)
  const [values, setValues] = useState<FieldValues>({})
  const [overallComment, setOverallComment] = useState('')
  const [state, setState] = useState<'loading' | 'empty' | 'ready' | 'unavailable'>('loading')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<StatusMessage | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<number, string>>({})
  const [evidence, setEvidence] = useState<EvaluationAssignmentEvidence | null>(null)
  const [evidenceState, setEvidenceState] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()

  const load = useCallback(async (preserveLocal = false) => {
    setState('loading')
    try {
      const result = await api.getProjectEvaluations(assignment.projectId)
      const next = result.items.find((item) => item.assignmentId === assignment.id) ?? null
      setDraft(next)
      if (next && !preserveLocal) { setValues(valuesFor(next)); setOverallComment(next.comments ?? ''); setFieldErrors({}) }
      setState(next ? 'ready' : 'empty')
    } catch (reason) {
      setMessage({ text: evaluationError(reason), tone: 'danger' })
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

  const scoringAllowed = detail.canScore && !detail.legacyReadOnly
  const dirty = Boolean(draft && (overallComment.trim() !== (draft.comments ?? '').trim() || draft.scores.some(criterion => {
    const row = values[criterion.rubricCriterionId]
    const raw = row?.score.trim() ?? ''
    const score = raw === '' ? null : Number(raw)
    return score !== criterion.score || (row?.comments.trim() ?? '') !== (criterion.comments ?? '').trim()
  })))
  const canFinalize = Boolean(scoringAllowed && draft?.status === 'DRAFT' && !dirty && draft.totalScore !== null && draft.missingCriterionIds.length === 0)


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
    if (!scoringAllowed) return
    setBusy(true); setMessage(null)
    try {
      const next = await api.createEvaluationDraft(assignment.id)
      setDraft(next); setValues(valuesFor(next)); setOverallComment(next.comments ?? ''); setState('ready')
    } catch (reason) {
      setMessage({ text: evaluationError(reason), tone: 'danger' })
      if (isConflict(reason) || (reason instanceof HttpError && reason.status === 403)) await load(true)
    } finally { setBusy(false) }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!scoringAllowed || !draft || !validate()) return
    const scores = draft.scores.flatMap((criterion) => {
      const row = values[criterion.rubricCriterionId]
      const raw = row?.score.trim() ?? ''
      return raw ? [{ rubricCriterionId: criterion.rubricCriterionId, score: Number(raw), comments: row?.comments.trim() || null }] : []
    })
    setBusy(true); setMessage(null)
    try {
      const next = await api.saveEvaluationDraft(draft.id, { concurrencyToken: draft.concurrencyToken, comments: overallComment.trim() || null, scores })
      setDraft(next); setValues(valuesFor(next)); setOverallComment(next.comments ?? ''); setMessage({ text: 'Đã lưu bản nháp theo dữ liệu máy chủ.', tone: 'success' })
    } catch (reason) {
      if (isConflict(reason)) await load(true)
      setMessage({ text: evaluationError(reason), tone: 'danger' })
    } finally { setBusy(false) }
  }

  async function finalize() {
    if (!canFinalize || !draft || busy) return
    const confirmed = await requestConfirmation({ title: 'Chốt đánh giá?', description: 'Chốt bản điểm đã lưu. Sau khi chốt, bạn không thể sửa điểm hoặc nhận xét. Hệ thống kiểm tra lại phân công và thời hạn đánh giá.', confirmLabel: 'Yêu cầu chốt đánh giá', danger: true })
    if (confirmed === null) return
    setBusy(true); setMessage(null)
    try {
      const next = await api.finalizeEvaluation(draft.id, draft.concurrencyToken)
      setDraft(next); setValues(valuesFor(next)); setOverallComment(next.comments ?? ''); setMessage({ text: 'Máy chủ đã chốt đánh giá.', tone: 'success' })
    } catch (reason) {
      if (isConflict(reason)) await load(true)
      setMessage({ text: evaluationError(reason), tone: 'danger' })
    } finally { setBusy(false) }
  }

  const editable = draft?.status === 'DRAFT'
  const previewFiles = evidence?.files ?? []
  const hasPreview = evidenceState === 'ready' && previewFiles.length > 0
  const rubricSummary = useMemo(() => draft ? `${draft.rubricName} · phiên bản ${draft.rubricVersion}` : `Bộ tiêu chí #${assignment.rubricId}`, [assignment.rubricId, draft])
  return <WorkspacePage title="Chấm điểm theo phạm vi được phân công" eyebrow={`Phân công #${assignment.id}`} description="Đối chiếu minh chứng, ghi điểm và nhận xét cho từng tiêu chí." backTo="/evaluator/workspace" className="evaluation-workspace evaluator-detail space-y-6 pb-12">
    <header className="rounded-xl border border-hairline bg-card p-5 sm:p-6">
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm text-ink-muted sm:grid-cols-2"><div><dt className="inline font-semibold text-ink-soft">Đồ án: </dt><dd className="inline">#{assignment.projectId}</dd></div><div><dt className="inline font-semibold text-ink-soft">Bộ tiêu chí: </dt><dd className="inline">{rubricSummary}</dd></div><div className="sm:col-span-2"><dt className="inline font-semibold text-ink-soft">Phạm vi: </dt><dd className="inline">{scopeDescription(assignment.scope, assignment.majorId, assignment.studentId)}</dd></div></dl>
    </header>

    {message ? <InlineAlert tone={message.tone}>{message.text}</InlineAlert> : null}
    <div className="evaluator-cold-layout">
    {hasPreview ? <aside className="evaluator-cold-aside"><ReportPreviewPanel assignmentId={assignment.id} files={previewFiles} /></aside> : null}
    <div className="evaluator-cold-main">
      <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-semibold text-ink">Tóm tắt gói bàn giao</h2>{evidenceState === 'loading' ? <p role="status" className="mt-1 text-sm leading-6 text-ink-muted">Đang tải thông tin gói bàn giao theo phân công…</p> : null}{evidenceState === 'unavailable' ? <p role="alert" className="mt-1 text-sm leading-6 text-status-warning-text">Chưa tải được thông tin gói bàn giao theo phân công. Các phần chấm điểm khác vẫn giữ nguyên.</p> : null}{evidenceState === 'ready' && evidence ? <div className="mt-2 space-y-1 text-sm leading-6 text-ink-muted"><p>Gói bàn giao: {evidence.finalSubmissionId ? `#${evidence.finalSubmissionId}` : 'Chưa có'}</p><p>Thời điểm nộp: {evidence.submittedAt ? dateTimeLabel(evidence.submittedAt) : 'Chưa có'}</p><p>Số hạng mục bàn giao: {evidence.itemCount}</p><p>Thông tin bàn giao dưới đây chỉ để đối chiếu trong quá trình chấm.</p></div> : null}<Link className="workspace-action-link mt-3" to={`/evaluator/projects/${assignment.projectId}/final-submission`} state={{ assignmentReturn: `/evaluator/assignments/${assignment.id}` }}>Xem gói bàn giao đã khóa<span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></Link></section>
    {state === 'loading' ? <p role="status" className="rounded-xl border border-hairline bg-card p-4 text-sm text-ink-muted">Đang tải bản nháp và tiêu chí chấm…</p> : null}
    {state === 'unavailable' ? <InlineAlert tone="danger" onRetry={() => void load(true)}>Chưa tải được bản nháp đánh giá.</InlineAlert> : null}
    {!scoringAllowed ? <InlineAlert tone="warning" title="Phân công chỉ đọc">{detail.denialReason === 'LEGACY_SCOPE_UNKNOWN' ? 'Hệ thống đánh dấu phạm vi phân công cũ hoặc không xác định; không có thao tác chấm điểm.' : 'Hệ thống không cấp quyền chấm điểm cho phân công này. Các thao tác tạo, lưu và chốt được ẩn.'}</InlineAlert> : null}
    {state === 'empty' ? <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-semibold text-ink">Chưa có bản nháp đánh giá</h2><p className="mt-1 text-sm leading-6 text-ink-muted">Bạn có thể yêu cầu máy chủ tạo bản nháp cho đúng phân công này. Máy chủ sẽ kiểm tra cửa sổ đánh giá, gói bàn giao đã khóa và phạm vi hiện tại.</p>{scoringAllowed ? <Button className="mt-4" disabled={busy} onClick={() => void startDraft()}>{busy ? 'Đang tạo…' : 'Tạo bản nháp đánh giá'}</Button> : null}</section> : null}

    {state === 'ready' && draft ? <>
      <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-semibold text-ink">Bộ tiêu chí áp dụng</h2><p className="mt-1 text-sm leading-6 text-ink-muted">Nhập điểm và nhận xét cho từng tiêu chí trong bộ đánh giá đã được công bố.</p></section>
      <form className="evaluator-scoring-form" onSubmit={(event) => void save(event)} noValidate>
        {[...draft.scores].sort((a, b) => a.sortOrder - b.sortOrder).map((criterion) => <section key={criterion.rubricCriterionId} className="rounded-xl border border-hairline bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]"><div className="min-w-0"><h2 className="break-words font-semibold text-ink">{criterion.name}{criterion.isRequired ? <span aria-label="bắt buộc" className="ml-1 text-status-error-text">*</span> : null}</h2><p className="mt-1 break-words text-sm leading-6 text-ink-muted">{criterion.description || 'Không có mô tả.'} · trọng số {formatPercent(criterion.weightPercent)} · tối đa {formatScore(criterion.maxScore)}</p></div><label className="text-sm font-semibold text-ink-soft">Điểm<input aria-label={`Điểm ${criterion.name}`} aria-describedby={fieldErrors[criterion.rubricCriterionId] ? `score-error-${criterion.rubricCriterionId}` : undefined} value={values[criterion.rubricCriterionId]?.score ?? ''} onChange={(event) => updateCriterion(criterion, { score: event.target.value })} disabled={!scoringAllowed || !editable || busy} inputMode="decimal" type="number" min="0" max={criterion.maxScore} step="0.01" className="mt-1 block w-full rounded-lg border border-hairline bg-card px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50" /></label></div>
          {fieldErrors[criterion.rubricCriterionId] ? <p id={`score-error-${criterion.rubricCriterionId}`} className="mt-2 text-sm text-status-error-text">{fieldErrors[criterion.rubricCriterionId]}</p> : null}
          <label className="mt-3 block text-sm font-semibold text-ink-soft">Nhận xét tiêu chí<textarea aria-label={`Nhận xét ${criterion.name}`} value={values[criterion.rubricCriterionId]?.comments ?? ''} onChange={(event) => updateCriterion(criterion, { comments: event.target.value })} disabled={!scoringAllowed || !editable || busy} maxLength={2000} className="mt-1 block min-h-24 w-full rounded-lg border border-hairline bg-card px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50" /></label>
        </section>)}
        <section className="rounded-xl border border-hairline bg-card p-5"><label className="block text-sm font-semibold text-ink-soft">Nhận xét tổng thể<textarea aria-label="Nhận xét tổng thể" value={overallComment} onChange={(event) => setOverallComment(event.target.value)} disabled={!scoringAllowed || !editable || busy} maxLength={10000} className="mt-1 block min-h-28 w-full rounded-lg border border-hairline bg-card px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50" /></label>{scoringAllowed && editable ? <Button type="submit" variant="outline" className="mt-4" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu bản nháp'}</Button> : <p className="mt-4 text-sm font-semibold text-academic-emerald">{draft.status === 'FINALIZED' ? `Đánh giá đã chốt${draft.finalization ? ` lúc ${dateTimeLabel(draft.finalization.finalizedAt)}` : ''}; chỉ đọc.` : 'Bạn có quyền xem đánh giá này.'}</p>}</section>
      </form>
      {scoringAllowed && editable ? <section className="rounded-xl border border-status-warning-border bg-status-warning-bg p-5 text-sm text-status-warning-text"><h2 className="font-semibold">Chốt đánh giá</h2><dl className="evaluator-score-summary"><div><dt>Điểm đã lưu</dt><dd>{draft.totalScore === null ? 'Chưa đủ điểm' : `${formatScore(draft.totalScore)}/${formatScore(draft.scoreScale)}`}</dd></div><div><dt>Tiêu chí còn thiếu</dt><dd>{formatCount(draft.missingCriterionIds.length)}</dd></div><div><dt>Bản nháp</dt><dd>{dirty ? 'Có thay đổi chưa lưu' : 'Đã đồng bộ'}</dd></div></dl>{dirty ? <p role="status" className="mt-3 font-semibold">Lưu bản nháp trước khi chốt để áp dụng điểm và nhận xét vừa sửa.</p> : null}<p className="mt-1 leading-6">Kiểm tra điểm và nhận xét trước khi chốt. Hệ thống sẽ xác nhận các điều kiện để hoàn tất đánh giá.</p><Button className="mt-4" disabled={busy || !canFinalize} onClick={() => void finalize()}>Yêu cầu chốt đánh giá</Button></section> : null}

      <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-semibold text-ink">Kết quả công bố</h2><p className="mt-1 text-sm leading-6 text-ink-muted">Kết quả chính thức được bộ môn công bố sau khi hoàn tất đánh giá.</p></section>
    </> : null}
    </div>
    </div>
    <Link to="/evaluator/workspace" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">← Về không gian người chấm</Link>
    <UnsavedChangesNotice dirty={dirty && editable && scoringAllowed} busy={busy} />
    {confirmationDialog}
  </WorkspacePage>
}
