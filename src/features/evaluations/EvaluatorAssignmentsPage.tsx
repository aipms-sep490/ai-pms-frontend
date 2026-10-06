import { displayLabel } from '../../components/ui/display-label'
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
        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-primary">Đánh giá đồ án</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Đánh giá được phân công</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">Xem các đồ án được phân công, lưu bản nháp và chốt kết quả sau khi hoàn tất chấm điểm.</p>
      </header>

      {error ? <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error}</section> : null}
      {loading ? <p role="status" className="rounded-xl border border-hairline bg-card p-4 text-sm text-slate-600">Đang tải danh sách phân công đánh giá…</p> : null}
      {!loading && !items.length ? <p className="rounded-xl border border-hairline bg-card p-4 text-sm text-slate-600">Chưa có phân công đánh giá đang hiệu lực trong phạm vi hiện tại.</p> : null}

      <section className="space-y-3" aria-label="Các phân công đánh giá">
        {items.map((assignment) => (
          <article key={assignment.id} className="flex flex-col gap-3 rounded-2xl border border-hairline bg-card p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Đồ án #{assignment.projectId} · {displayLabel(assignment.evaluationType)}</h2>
              <p className="mt-1 text-xs text-slate-500">Rubric #{assignment.rubricId} · Khoa #{assignment.departmentId} · phân công {new Date(assignment.assignedAt).toLocaleString('vi-VN')}</p>
            </div>
            <Button className="min-h-11" disabled={busyId === assignment.id} onClick={() => void openWorkspace(assignment)}>
              {busyId === assignment.id ? 'Đang kiểm tra…' : 'Mở không gian đánh giá'}
            </Button>
          </article>
        ))}
      </section>

      <div>
        <Link to="/supervisor/workspace" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Về bàn làm việc giảng viên</span>
        </Link>
      </div>
    </main>
  )
}
