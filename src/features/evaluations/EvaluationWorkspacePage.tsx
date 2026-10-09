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
  return <WorkspacePage title="Đánh giá đồ án" description="Mở bản đánh giá theo phân công được cấp cho bạn."><p role="alert" className="workspace-surface p-5 text-status-error-text">{invalid ? 'Mã đánh giá không hợp lệ.' : result?.error}</p><Link className="workspace-action-link" to="/evaluator/workspace">Về danh sách phân công</Link></WorkspacePage>
}
