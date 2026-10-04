import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useParams } from 'react-router-dom'
import { PageLoading } from '../../../components/ui/PageLoading'
import { HttpError } from '../../../services/http/http-client'
import { getEvaluationAssignmentDetail, type EvaluationAssignmentDetail } from '../../../services/api/evaluations.api'
import type { EvaluatorAssignmentContext } from '../hooks/useEvaluatorAssignment'

/**
 * A lecturer identity is only the outer authentication boundary. This route
 * verifies the actual persisted, active evaluator assignment before a detail
 * view is rendered. The API remains authoritative for every following read or
 * mutation.
 */
export function EvaluatorAssignmentRoute() {
  const assignmentId = Number(useParams().assignmentId)
  const [state, setState] = useState<'loading' | 'ready' | 'denied' | 'unavailable'>('loading')
  const [detail, setDetail] = useState<EvaluationAssignmentDetail | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!Number.isInteger(assignmentId) || assignmentId < 1) {
      setState('denied')
      return
    }
    setState('loading')
    try {
      const current = await getEvaluationAssignmentDetail(assignmentId, signal)
      setDetail(current)
      setState('ready')
    } catch (reason) {
      if (signal?.aborted) return
      setState(reason instanceof HttpError && (reason.status === 403 || reason.status === 404) ? 'denied' : 'unavailable')
    }
  }, [assignmentId])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  if (state === 'loading') return <PageLoading label="Đang xác minh phạm vi phân công đánh giá…" />
  if (state === 'denied') return <main className="mx-auto max-w-3xl space-y-4 pb-12"><section role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-5 text-sm text-status-warning-text">Phân công này không còn hiệu lực hoặc không thuộc phạm vi của bạn. Đường dẫn không cấp quyền đánh giá.</section><Link to="/evaluator/workspace" className="inline-flex min-h-11 items-center font-semibold text-primary underline">← Về không gian Evaluator</Link></main>
  if (state === 'unavailable' || !detail) {
    return <main className="mx-auto max-w-3xl space-y-4 pb-12">
      <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text">
        Chưa xác minh được phân công đánh giá. Hãy tải lại trước khi mở nội dung chấm điểm.
        <button type="button" className="ml-2 min-h-11 font-semibold underline" onClick={() => void load()}>Tải lại</button>
      </section>
    </main>
  }
  return <Outlet context={{ assignment: detail.assignment, detail } satisfies EvaluatorAssignmentContext} />
}
