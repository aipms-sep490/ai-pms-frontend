import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../../services/api/evaluations.api'
import { evaluationError, isConflict } from './evaluation-errors'
import type { EvaluationDraft } from './evaluation-types'

export function EvaluationWorkspacePage() {
  const id = Number(useParams().evaluationId)
  const [draft, setDraft] = useState<EvaluationDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const load = useCallback(async () => {
    if (!Number.isInteger(id) || id < 1) { setError('Evaluation ID không hợp lệ.'); setLoading(false); return }
    setLoading(true); setError(null)
    try { setDraft(await api.getEvaluationDraft(id)) } catch (reason) { setError(evaluationError(reason)) } finally { setLoading(false) }
  }, [id])
  useEffect(() => { void load() }, [load])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!draft) return
    const form = new FormData(event.currentTarget)
    const scores = draft.scores.flatMap((criterion) => {
      const raw = String(form.get(`score-${criterion.rubricCriterionId}`) ?? '').trim()
      return raw === '' ? [] : [{ rubricCriterionId: criterion.rubricCriterionId, score: Number(raw), comments: String(form.get(`comment-${criterion.rubricCriterionId}`) ?? '').trim() || null }]
    })
    if (scores.some((score) => !Number.isFinite(score.score))) { setError('Điểm phải là số hợp lệ.'); return }
    setBusy(true); setError(null)
    try { setDraft(await api.saveEvaluationDraft(draft.id, { concurrencyToken: draft.concurrencyToken, comments: String(form.get('comments') ?? '').trim() || null, scores })) }
    catch (reason) { if (isConflict(reason)) await load(); setError(evaluationError(reason)) } finally { setBusy(false) }
  }
  async function finalize() {
    if (!draft || !confirmed) return
    setBusy(true); setError(null)
    try { setDraft(await api.finalizeEvaluation(draft.id, draft.concurrencyToken)); setConfirmed(false) }
    catch (reason) { if (isConflict(reason)) await load(); setError(evaluationError(reason)) } finally { setBusy(false) }
  }

  if (loading) return <p role="status" className="mx-auto max-w-5xl rounded-xl border bg-white p-4 text-sm text-slate-600">Đang tải rubric và draft do Backend bảo vệ…</p>
  if (!draft) return <main className="mx-auto max-w-5xl space-y-4"><section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error || 'Không có evaluation để hiển thị.'}</section><Link to="/evaluator/evaluations">← Danh sách assignments</Link></main>
  const canFinalize = draft.status === 'DRAFT' && draft.missingCriterionIds.length === 0 && draft.totalScore !== null
  return <main className="mx-auto max-w-5xl space-y-6 pb-12"><header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-slate-500">Backend calculated · {draft.calculationRule}</p><h1 className="mt-1 text-2xl font-bold text-slate-900">{draft.rubricName} · v{draft.rubricVersion}</h1><p className="mt-2 text-sm text-slate-600">Project #{draft.projectId} · {draft.evaluationType} · tổng tạm tính do Backend: <strong>{draft.totalScore === null ? 'chưa đủ tiêu chí' : `${draft.totalScore}/${draft.scoreScale}`}</strong>.</p></header>{error ? <section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</section> : null}<form onSubmit={(event) => void save(event)} className="space-y-4">{[...draft.scores].sort((a, b) => a.sortOrder - b.sortOrder).map((criterion) => <section key={criterion.rubricCriterionId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"><div className="flex flex-col gap-2 sm:flex-row sm:justify-between"><div><h2 className="font-bold text-slate-900">{criterion.name} {criterion.isRequired ? <span className="text-rose-700">*</span> : null}</h2><p className="mt-1 text-sm text-slate-600">{criterion.description || 'Không có mô tả.'} · trọng số {criterion.weightPercent}% · tối đa {criterion.maxScore}</p></div><label className="text-sm font-semibold text-slate-700">Điểm<input aria-label={`Điểm ${criterion.name}`} name={`score-${criterion.rubricCriterionId}`} type="number" min="0" max={criterion.maxScore} step="0.01" defaultValue={criterion.score ?? ''} disabled={busy || draft.status !== 'DRAFT'} className="mt-1 block w-28 rounded-lg border border-slate-300 px-3 py-2" /></label></div><label className="mt-3 block text-xs font-semibold text-slate-600">Nhận xét tiêu chí<textarea aria-label={`Nhận xét ${criterion.name}`} name={`comment-${criterion.rubricCriterionId}`} defaultValue={criterion.comments ?? ''} maxLength={2000} disabled={busy || draft.status !== 'DRAFT'} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label></section>)}<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"><label className="block text-sm font-semibold text-slate-700">Nhận xét tổng thể<textarea aria-label="Nhận xét tổng thể" name="comments" defaultValue={draft.comments ?? ''} maxLength={10000} disabled={busy || draft.status !== 'DRAFT'} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>{draft.status === 'DRAFT' ? <button disabled={busy} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Lưu draft điểm</button> : <p className="mt-4 text-sm font-semibold text-emerald-700">Evaluation đã finalization lúc {draft.finalization ? new Date(draft.finalization.finalizedAt).toLocaleString('vi-VN') : '—'}.</p>}</section></form>{draft.status === 'DRAFT' ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><h2 className="font-bold">Finalize evaluation</h2><p className="mt-1">Finalize là hành động do evaluator xác nhận và Backend tái kiểm tra rubric, token, final-submission package, evaluation window và toàn bộ tiêu chí.</p>{draft.missingCriterionIds.length ? <p className="mt-2">Còn thiếu {draft.missingCriterionIds.length} tiêu chí; chưa thể finalize.</p> : null}<label className="mt-3 flex items-start gap-2"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={!canFinalize || busy} /><span>Tôi xác nhận nộp điểm final theo rubric hiện tại.</span></label><button type="button" disabled={!canFinalize || !confirmed || busy} onClick={() => void finalize()} className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Finalize evaluation</button></section> : null}<Link to="/evaluator/evaluations" className="inline-block text-sm font-semibold text-blue-700">← Danh sách assignments</Link></main>
}
