import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import * as api from '../../../services/api/evaluations.api'
import { HttpError } from '../../../services/http/http-client'
import { evaluationError, isConflict } from '../evaluation-errors'
import type { EvaluationDraft, EvaluationScore } from '../evaluation-types'
import { useEvaluatorAssignment } from '../hooks/useEvaluatorAssignment'

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
  const { assignment } = useEvaluatorAssignment()
  const [draft, setDraft] = useState<EvaluationDraft | null>(null)
  const [values, setValues] = useState<FieldValues>({})
  const [overallComment, setOverallComment] = useState('')
  const [state, setState] = useState<'loading' | 'empty' | 'ready' | 'unavailable'>('loading')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<number, string>>({})
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
      setMessage(evaluationError(reason))
      setState('unavailable')
    }
  }, [assignment.id, assignment.projectId])

  useEffect(() => { void load() }, [load])

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
    setBusy(true); setMessage(null)
    try {
      const next = await api.createEvaluationDraft(assignment.id)
      setDraft(next); setValues(valuesFor(next)); setOverallComment(next.comments ?? ''); setState('ready')
    } catch (reason) {
      setMessage(evaluationError(reason))
      if (isConflict(reason) || (reason instanceof HttpError && reason.status === 403)) await load(true)
    } finally { setBusy(false) }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft || !validate()) return
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
      if (isConflict(reason)) await load(true)
      setMessage(evaluationError(reason))
    } finally { setBusy(false) }
  }

  async function finalize() {
    if (!draft) return
    const confirmed = await requestConfirmation({ title: 'Chốt đánh giá?', description: 'Máy chủ sẽ kiểm tra lại rubric, phạm vi phân công, gói bàn giao, cửa sổ đánh giá và dữ liệu hiện tại.', confirmLabel: 'Yêu cầu chốt đánh giá', danger: true })
    if (confirmed === null) return
    setBusy(true); setMessage(null)
    try {
      const next = await api.finalizeEvaluation(draft.id, draft.concurrencyToken)
      setDraft(next); setValues(valuesFor(next)); setOverallComment(next.comments ?? ''); setMessage('Máy chủ đã chốt đánh giá.')
    } catch (reason) {
      if (isConflict(reason)) await load(true)
      setMessage(evaluationError(reason))
    } finally { setBusy(false) }
  }

  const editable = draft?.status === 'DRAFT'
  const rubricSummary = useMemo(() => draft ? `${draft.rubricName} · phiên bản ${draft.rubricVersion}` : `Rubric #${assignment.rubricId}`, [assignment.rubricId, draft])
  return <main className="mx-auto max-w-5xl space-y-6 pb-12">
    <header className="rounded-xl border border-hairline bg-card p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">Phân công #{assignment.id}</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">Chấm điểm theo phạm vi được phân công</h1>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm text-slate-600 sm:grid-cols-2"><div><dt className="inline font-semibold text-slate-700">Đồ án: </dt><dd className="inline">#{assignment.projectId}</dd></div><div><dt className="inline font-semibold text-slate-700">Rubric: </dt><dd className="inline">{rubricSummary}</dd></div><div className="sm:col-span-2"><dt className="inline font-semibold text-slate-700">Phạm vi: </dt><dd className="inline">{scopeDescription(assignment.scope, assignment.majorId, assignment.studentId)}</dd></div></dl>
    </header>

    {message ? <section role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text">{message}</section> : null}
    {state === 'loading' ? <p role="status" className="rounded-xl border border-hairline bg-card p-4 text-sm text-slate-600">Đang tải bản nháp và tiêu chí chấm…</p> : null}
    {state === 'unavailable' ? <section className="rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text">Chưa tải được bản nháp đánh giá. <button type="button" className="min-h-11 font-semibold underline" onClick={() => void load(true)}>Tải lại</button></section> : null}
    {state === 'empty' ? <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-semibold text-slate-900">Chưa có bản nháp đánh giá</h2><p className="mt-1 text-sm leading-6 text-slate-600">Bạn có thể yêu cầu máy chủ tạo bản nháp cho đúng phân công này. Máy chủ sẽ kiểm tra cửa sổ đánh giá, gói bàn giao đã khóa và phạm vi hiện tại.</p><button type="button" disabled={busy} onClick={() => void startDraft()} className="mt-4 min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang tạo…' : 'Tạo bản nháp đánh giá'}</button></section> : null}

    {state === 'ready' && draft ? <>
      <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-semibold text-slate-900">Ngữ cảnh rubric</h2><p className="mt-1 text-sm leading-6 text-slate-600">Máy chủ trả về các tiêu chí lá có thể chấm và phiên bản rubric đã bảo vệ. Cấu trúc nhóm tiêu chí không có trong contract bản nháp hiện tại nên không được tự dựng ở client.</p></section>
      <form onSubmit={(event) => void save(event)} className="space-y-4" noValidate>
        {[...draft.scores].sort((a, b) => a.sortOrder - b.sortOrder).map((criterion) => <section key={criterion.rubricCriterionId} className="rounded-xl border border-hairline bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]"><div className="min-w-0"><h2 className="break-words font-semibold text-slate-900">{criterion.name}{criterion.isRequired ? <span aria-label="bắt buộc" className="ml-1 text-status-error-text">*</span> : null}</h2><p className="mt-1 break-words text-sm leading-6 text-slate-600">{criterion.description || 'Không có mô tả.'} · trọng số {criterion.weightPercent}% · tối đa {criterion.maxScore}</p></div><label className="text-sm font-semibold text-slate-700">Điểm<input aria-label={`Điểm ${criterion.name}`} aria-describedby={fieldErrors[criterion.rubricCriterionId] ? `score-error-${criterion.rubricCriterionId}` : undefined} value={values[criterion.rubricCriterionId]?.score ?? ''} onChange={(event) => updateCriterion(criterion, { score: event.target.value })} disabled={!editable || busy} inputMode="decimal" type="number" min="0" max={criterion.maxScore} step="0.01" className="mt-1 block w-full rounded-lg border border-hairline bg-card px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50" /></label></div>
          {fieldErrors[criterion.rubricCriterionId] ? <p id={`score-error-${criterion.rubricCriterionId}`} className="mt-2 text-sm text-status-error-text">{fieldErrors[criterion.rubricCriterionId]}</p> : null}
          <label className="mt-3 block text-sm font-semibold text-slate-700">Nhận xét tiêu chí<textarea aria-label={`Nhận xét ${criterion.name}`} value={values[criterion.rubricCriterionId]?.comments ?? ''} onChange={(event) => updateCriterion(criterion, { comments: event.target.value })} disabled={!editable || busy} maxLength={2000} className="mt-1 block min-h-24 w-full rounded-lg border border-hairline bg-card px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50" /></label>
        </section>)}
        <section className="rounded-xl border border-hairline bg-card p-5"><label className="block text-sm font-semibold text-slate-700">Nhận xét tổng thể<textarea aria-label="Nhận xét tổng thể" value={overallComment} onChange={(event) => setOverallComment(event.target.value)} disabled={!editable || busy} maxLength={10000} className="mt-1 block min-h-28 w-full rounded-lg border border-hairline bg-card px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50" /></label>{editable ? <button type="submit" disabled={busy} className="mt-4 min-h-11 rounded-lg border border-primary px-4 text-sm font-semibold text-primary disabled:opacity-50">{busy ? 'Đang lưu…' : 'Lưu bản nháp'}</button> : <p className="mt-4 text-sm font-semibold text-academic-emerald">Đánh giá đã chốt{draft.finalization ? ` lúc ${new Date(draft.finalization.finalizedAt).toLocaleString('vi-VN')}` : ''}; chỉ đọc.</p>}</section>
      </form>
      {editable ? <section className="rounded-xl border border-status-warning-border bg-status-warning-bg p-5 text-sm text-status-warning-text"><h2 className="font-semibold">Chốt đánh giá</h2><p className="mt-1 leading-6">Không có client-side “đủ điều kiện chốt”. Khi bạn yêu cầu chốt, máy chủ kiểm tra toàn bộ điều kiện và trả kết quả chính thức.</p><button type="button" disabled={busy} onClick={() => void finalize()} className="mt-4 min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">Yêu cầu chốt đánh giá</button></section> : null}
      <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-semibold text-slate-900">Gói bàn giao và bằng chứng</h2><p className="mt-1 text-sm leading-6 text-slate-600">Workspace không hiển thị tệp hoặc bằng chứng ở đây vì contract hiện có chỉ kiểm tra quyền đọc theo đồ án, chưa trả dữ liệu đã lọc theo COMMON, ngành hoặc sinh viên được phân công. Bộ lọc client không đủ để bảo vệ phạm vi.</p></section>
      <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-semibold text-slate-900">Kết quả công bố</h2><p className="mt-1 text-sm leading-6 text-slate-600">Evaluator không có quyền công bố kết quả. Tổng điểm, đạt/không đạt và StudentResult/ProjectResult chỉ được hiển thị khi Backend cấp contract đọc riêng.</p></section>
    </> : null}
    <Link to="/evaluator/workspace" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">← Về không gian Evaluator</Link>
    {confirmationDialog}
  </main>
}
