import { useEffect, useState } from 'react'
import { services } from '../../../services/service-gateway'
import { getDeliverables } from '../../../services/api/deliverables.api'
import { getProgressReports, getProgressReport } from '../../../services/api/progress-reports.api'
import { getMeetings } from '../../../services/api/meetings.api'
import { HttpError } from '../../../services/http/http-client'
import type { ProjectTimelineDataDto, ProjectProgressSummaryDto } from '../../../types/backend'
import type { Deliverable } from '../../deliverables/deliverable-types'
import type { ReportFeedback } from '../../reports/report-types'
import type { Meeting } from '../../meetings/meeting-types'
import { utcTimestamp } from '../utils/collaboration-workspace'

export type Resource<T> = { state: 'loading' } | { state: 'ready'; data: T } | { state: 'error'; message: string }
export interface WorkspaceFeedback extends ReportFeedback { reportId: number; periodStart: string; periodEnd: string }
interface WorkspaceResources {
  timeline: Resource<ProjectTimelineDataDto>
  summary: Resource<ProjectProgressSummaryDto>
  deliverables: Resource<Deliverable[]>
  feedback: Resource<{ items: WorkspaceFeedback[]; incomplete: boolean }>
  meetings: Resource<Meeting[]>
}
const loading: WorkspaceResources = {
  timeline: { state: 'loading' }, summary: { state: 'loading' }, deliverables: { state: 'loading' },
  feedback: { state: 'loading' }, meetings: { state: 'loading' },
}

function errorMessage(reason: unknown, section: string): string {
  if (reason instanceof HttpError && reason.status === 403) return `Bạn chưa có quyền xem ${section}.`
  return `Chưa tải được ${section}. Hãy thử lại.`
}

async function loadDeliverables(projectId: number, signal: AbortSignal): Promise<Deliverable[]> {
  const first = await getDeliverables(projectId, { page: 1, pageSize: 100 }, signal)
  const items = [...first.items]
  for (let page = 2; page <= first.totalPages; page++) {
    const next = await getDeliverables(projectId, { page, pageSize: 100 }, signal)
    items.push(...next.items)
  }
  return items
}

async function loadFeedback(projectId: number, signal: AbortSignal) {
  // Recent reporting periods, rather than an invented chat or project-wide feedback feed.
  const reports = await getProgressReports(projectId, { status: 'REVIEWED', pageSize: 3 }, signal)
  const results = await Promise.allSettled(reports.items.map(report => getProgressReport(report.id, signal)))
  const items = results.flatMap(result => result.status === 'fulfilled'
    ? result.value.feedbacks.map(feedback => ({ ...feedback, reportId: result.value.id,
      periodStart: result.value.periodStart, periodEnd: result.value.periodEnd })) : [])
  if (results.length && results.every(result => result.status === 'rejected')) throw new Error('Feedback unavailable')
  return { items: items.sort((a, b) => utcTimestamp(b.createdAt) - utcTimestamp(a.createdAt)).slice(0, 3),
    incomplete: results.some(result => result.status === 'rejected') }
}

async function loadMeetings(projectId: number, signal: AbortSignal): Promise<Meeting[]> {
  // BE returns descending start dates. Read all pages before selecting the nearest meeting.
  const filters = { status: 'SCHEDULED' as const, from: new Date().toISOString(), pageSize: 100 }
  const first = await getMeetings(projectId, filters, signal)
  const items = [...first.items]
  for (let page = 2; page <= first.totalPages; page++) {
    items.push(...(await getMeetings(projectId, { ...filters, page }, signal)).items)
  }
  return items
}

export function useCollaborationWorkspace(projectId: number) {
  const [revision, setRevision] = useState(0)
  const [resources, setResources] = useState<WorkspaceResources>(loading)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal
    setResources(loading)
    setUpdatedAt(null)
    function request<K extends keyof WorkspaceResources>(key: K,
      operation: Promise<Extract<WorkspaceResources[K], { state: 'ready' }>['data']>, section: string) {
      void operation.then(data => {
        if (!signal.aborted) setResources(previous => ({ ...previous, [key]: { state: 'ready', data } }))
      }).catch((reason: unknown) => {
        if (!signal.aborted) setResources(previous => ({ ...previous, [key]: { state: 'error', message: errorMessage(reason, section) } }))
      }).finally(() => { if (!signal.aborted) setUpdatedAt(new Date()) })
    }
    request('timeline', services.task.getProjectTimeline(projectId, signal), 'công việc của nhóm')
    request('summary', services.task.getProjectProgressSummary(projectId, signal), 'tiến độ đồ án')
    request('deliverables', loadDeliverables(projectId, signal), 'các hạng mục cần nộp')
    request('feedback', loadFeedback(projectId, signal), 'nhận xét của giảng viên')
    request('meetings', loadMeetings(projectId, signal), 'lịch họp')
    return () => controller.abort()
  }, [projectId, revision])
  return { ...resources, updatedAt, reload: () => setRevision(value => value + 1) }
}
