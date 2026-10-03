import { useCallback, useEffect, useState } from 'react'
import { services } from '../../../services/service-gateway'
import { getProgressReports } from '../../../services/api/progress-reports.api'
import { HttpError } from '../../../services/http/http-client'
import type { PagedResult, ProjectProgressSummaryDto, OverdueBlockedTasksDto } from '../../../types/backend'
import type { ProgressReport } from '../../reports/report-types'

export type ProgressReviewResource<T> =
  | { state: 'loading' }
  | { state: 'ready'; data: T }
  | { state: 'error'; message: string }

const loading = { state: 'loading' } as const

function errorMessage(reason: unknown, label: string) {
  if (reason instanceof HttpError && reason.status === 403) return `Backend không cấp quyền xem ${label} của đồ án này.`
  if (reason instanceof HttpError && reason.status === 404) return `${label} hoặc đồ án không còn khả dụng.`
  return `Chưa tải được ${label}. Hãy thử lại.`
}

/** Read-only aggregation of existing endpoints; it does not derive authorization or a health state. */
export function useSupervisorProgressReview(projectId: number) {
  const [summary, setSummary] = useState<ProgressReviewResource<ProjectProgressSummaryDto>>(loading)
  const [attention, setAttention] = useState<ProgressReviewResource<OverdueBlockedTasksDto>>(loading)
  const [reports, setReports] = useState<ProgressReviewResource<PagedResult<ProgressReport>>>(loading)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setSummary(loading); setAttention(loading); setReports(loading)
    void services.task.getProjectProgressSummary(projectId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setSummary({ state: 'ready', data }) })
      .catch(reason => { if (!controller.signal.aborted) setSummary({ state: 'error', message: errorMessage(reason, 'tiến độ') }) })
    void services.task.getOverdueBlockedTasks(projectId)
      .then(data => { if (!controller.signal.aborted) setAttention({ state: 'ready', data }) })
      .catch(reason => { if (!controller.signal.aborted) setAttention({ state: 'error', message: errorMessage(reason, 'công việc cần lưu ý') }) })
    void getProgressReports(projectId, { page: 1, pageSize: 20 }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setReports({ state: 'ready', data }) })
      .catch(reason => { if (!controller.signal.aborted) setReports({ state: 'error', message: errorMessage(reason, 'báo cáo tiến độ') }) })
    return () => controller.abort()
  }, [projectId, revision])

  return { summary, attention, reports, reload: useCallback(() => setRevision(value => value + 1), []) }
}
