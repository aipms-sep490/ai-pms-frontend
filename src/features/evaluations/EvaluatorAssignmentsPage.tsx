import { readAllPages } from '../../services/api/paged-read'
import { displayLabel } from '../../components/ui/display-label'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { ListLoading } from '../../components/ui/ListLoading'
import { WorkspaceEmptyState } from '../../components/ui/WorkspaceState'
import * as api from '../../services/api/evaluations.api'
import { evaluationError, isConflict } from './evaluation-errors'
import { evaluationStageLabel, type EvaluationAssignment } from './evaluation-types'

export function EvaluatorAssignmentsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<EvaluationAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems(await api.getAllMyEvaluationAssignments()) } catch (reason) { setItems([]); setError(evaluationError(reason)) } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  async function openWorkspace(assignment: EvaluationAssignment) {
    setBusyId(assignment.id); setError(null)
    try {
      const existing = (await readAllPages(page => api.getProjectEvaluations(assignment.projectId, undefined, page))).find((evaluation) => evaluation.assignmentId === assignment.id)
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
      {!loading && !error && !items.length ? <WorkspaceEmptyState title="Chưa có phân công đánh giá đang hiệu lực" message="Khi máy chủ phân công một phiếu chấm trong phạm vi này, phiếu sẽ xuất hiện ở đây." /> : null}

      <section className="space-y-3" aria-label="Các phân công đánh giá">
        {!loading && items.map((assignment) => (
          <article key={assignment.id} className="workspace-surface flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-bold text-ink">{assignment.projectTitle ?? `Đồ án #${assignment.projectId}`} · {displayLabel(assignment.evaluationType)}</h2>
              <p className="mt-2 text-sm text-ink-muted">{assignment.rubricName ?? `Bộ tiêu chí #${assignment.rubricId}`} · Giai đoạn: {evaluationStageLabel(assignment.stage)} · Phạm vi: {assignmentScopeLabel(assignment)} · Phân công {new Date(assignment.assignedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
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

function assignmentScopeLabel(assignment: EvaluationAssignment) {
  if (assignment.scope === 'COMMON') return 'Chung của đồ án'
  if (assignment.scope === 'MAJOR_SPECIFIC') return assignment.majorName ?? `Ngành #${assignment.majorId ?? '—'}`
  if (assignment.scope === 'INDIVIDUAL') return assignment.studentName ?? `Sinh viên #${assignment.studentId ?? '—'}`
  return 'Chưa xác định từ phân công'
}
