import { displayLabel } from '../../components/ui/display-label'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { ListLoading } from '../../components/ui/ListLoading'
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
    try { setItems((await api.getMyEvaluationAssignments(1, 100)).items) } catch (reason) { setItems([]); setError(evaluationError(reason)) } finally { setLoading(false) }
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
    <WorkspacePage title="Đánh giá được phân công" eyebrow="Đánh giá đồ án" description="Xem các đồ án được phân công, lưu bản nháp và chốt kết quả sau khi hoàn tất chấm điểm." backTo="/supervisor/workspace" className="space-y-6" action={<Button variant="outline" icon="refresh" disabled={loading} onClick={() => void load()}>Tải lại</Button>}>

      {error ? <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error}</section> : null}
      {loading ? <ListLoading label="Đang tải danh sách phân công đánh giá…" /> : null}
      {!loading && !error && !items.length ? <p className="workspace-surface p-6 text-sm text-slate-600">Chưa có phân công đánh giá đang hiệu lực trong phạm vi hiện tại.</p> : null}

      <section className="space-y-3" aria-label="Các phân công đánh giá">
        {!loading && items.map((assignment) => (
          <article key={assignment.id} className="workspace-surface flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900">Đồ án #{assignment.projectId} · {displayLabel(assignment.evaluationType)}</h2>
              <p className="mt-2 text-sm text-slate-500">Bộ tiêu chí #{assignment.rubricId} · Bộ môn #{assignment.departmentId} · Phân công {new Date(assignment.assignedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
            </div>
            <Button className="min-h-11 shrink-0" disabled={busyId !== null} onClick={() => void openWorkspace(assignment)}>
              {busyId === assignment.id ? 'Đang kiểm tra…' : 'Mở không gian đánh giá'}
            </Button>
          </article>
        ))}
      </section>

    </WorkspacePage>
  )
}
