import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { PageLoading } from '../../components/ui/PageLoading'
import { getEvaluationDraft } from '../../services/api/evaluations.api'
import { evaluationError } from './evaluation-errors'

/** Keep saved links working while all scoring uses the guarded assignment screen. */
export function EvaluationWorkspacePage() {
  const id = Number(useParams().evaluationId)
  const [result, setResult] = useState<{ id: number; assignmentId?: number; error?: string } | null>(null)
  useEffect(() => {
    if (!Number.isSafeInteger(id) || id < 1) return
    const controller = new AbortController()
    void getEvaluationDraft(id, controller.signal).then(draft => {
      if (controller.signal.aborted) return
      setResult({ id, assignmentId: draft.assignmentId, error: Number.isSafeInteger(draft.assignmentId) && draft.assignmentId > 0 ? undefined : 'Bản đánh giá chưa có phân công hợp lệ.' })
    }).catch(reason => { if (!controller.signal.aborted) setResult({ id, error: evaluationError(reason) }) })
    return () => controller.abort()
  }, [id])
  const invalid = !Number.isSafeInteger(id) || id < 1
  if (!invalid && result?.id !== id) return <PageLoading />
  if (!invalid && result?.assignmentId && !result.error) return <Navigate to={`/evaluator/assignments/${result.assignmentId}`} replace />
  return <WorkspacePage className="space-y-5" title="Đánh giá đồ án" eyebrow="Đánh giá đồ án" description="Mở bản đánh giá theo phân công được cấp cho bạn.">
    <section className="overflow-hidden rounded-2xl border border-status-error-border bg-card shadow-xs">
      <div className="border-b border-status-error-border bg-status-error-bg px-5 py-3.5">
        <h2 className="text-sm font-bold text-status-error-text">Không thể mở phiếu chấm</h2>
      </div>
      <div className="space-y-4 p-5">
        <p role="alert" className="text-sm text-status-error-text">{invalid ? 'Mã đánh giá không hợp lệ.' : result?.error}</p>
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-hairline bg-card px-4 text-sm font-semibold text-primary hover:bg-canvas" to="/evaluator/workspace">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
          <span>Về danh sách phân công</span>
        </Link>
      </div>
    </section>
  </WorkspacePage>
}
