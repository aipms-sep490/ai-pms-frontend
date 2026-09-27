import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import * as api from '../../services/api/evaluations.api'
import { evaluationError, isConflict } from './evaluation-errors'
import type { EvaluationAssignment } from './evaluation-types'

export function EvaluatorAssignmentsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<EvaluationAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems((await api.getMyEvaluationAssignments(1, 100)).items) } catch (reason) { setError(evaluationError(reason)) } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  async function openWorkspace(assignment: EvaluationAssignment) {
    setBusyId(assignment.id); setError(null)
    try {
      const existing = (await api.getProjectEvaluations(assignment.projectId)).items.find((evaluation) => evaluation.assignmentId === assignment.id)
      const evaluation = existing ?? await api.createEvaluationDraft(assignment.id)
      navigate(`/evaluator/evaluations/${evaluation.id}`)
    } catch (reason) {
      if (isConflict(reason)) await load()
      setError(evaluationError(reason))
    } finally { setBusyId(null) }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-12">
      <header className="rounded-2xl border border-hairline bg-card p-5 shadow-xs sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-primary">Human grading authority</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Evaluations được phân công</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">Rubric, điều kiện chấm, tổng điểm và quyền đánh giá đều do Backend quyết định. AI không gán điểm hoặc finalization thay evaluator.</p>
      </header>

      {error ? <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error}</section> : null}
      {loading ? <p role="status" className="rounded-xl border border-hairline bg-card p-4 text-sm text-slate-600">Đang tải assignments do Backend cấp quyền…</p> : null}
      {!loading && !items.length ? <p className="rounded-xl border border-hairline bg-card p-4 text-sm text-slate-600">Không có evaluation assignment ACTIVE trong phạm vi hiện tại.</p> : null}

      <section className="space-y-3" aria-label="Evaluation assignments">
        {items.map((assignment) => (
          <article key={assignment.id} className="flex flex-col gap-3 rounded-2xl border border-hairline bg-card p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Project #{assignment.projectId} · {assignment.evaluationType}</h2>
              <p className="mt-1 text-xs text-slate-500">Rubric #{assignment.rubricId} · Department #{assignment.departmentId} · assigned {new Date(assignment.assignedAt).toLocaleString('vi-VN')}</p>
            </div>
            <Button className="min-h-11" disabled={busyId === assignment.id} onClick={() => void openWorkspace(assignment)}>
              {busyId === assignment.id ? 'Đang kiểm tra…' : 'Mở Evaluation Workspace'}
            </Button>
          </article>
        ))}
      </section>

      <Link to="/supervisor/workspace" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">← Về workspace giảng viên</Link>
    </main>
  )
}
