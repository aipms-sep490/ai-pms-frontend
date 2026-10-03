import { useCallback, useEffect, useRef, useState } from 'react'
import type { FinalChecklist } from '../../final-submission/final-submission-api'
import type { Meeting } from '../../meetings/meeting-types'
import type { MilestoneDto, PagedResult } from '../../../types/backend'
import { services } from '../../../services/service-gateway'
import { getDeliverables } from '../../../services/api/deliverables.api'
import { getMyEvaluationAssignments } from '../../../services/api/evaluations.api'
import { getMeetings } from '../../../services/api/meetings.api'
import { getFinalChecklist } from '../../final-submission/final-submission-api'
import { getProgressReports } from '../../../services/api/progress-reports.api'

export type SupervisorOperationalResource<T> =
  | { state: 'loading' }
  | { state: 'ready'; data: T }
  | { state: 'error'; message: string }

export interface SupervisorOperationalSummary {
  meeting: SupervisorOperationalResource<{ count: number; next: Meeting | null }>
  milestone: SupervisorOperationalResource<{ count: number; current: MilestoneDto | null }>
  deliverables: SupervisorOperationalResource<{ count: number }>
  finalChecklist: SupervisorOperationalResource<FinalChecklist>
  pendingReports: SupervisorOperationalResource<{ count: number }>
  evaluator: SupervisorOperationalResource<boolean>
}

const loading = { state: 'loading' } as const

function failure(section: string): SupervisorOperationalResource<never> {
  return { state: 'error', message: `Chưa tải được ${section}.` }
}

async function loadScheduledMeetings(projectId: number, from: string): Promise<PagedResult<Meeting>> {
  const pageSize = 100
  const first = await getMeetings(projectId, { status: 'SCHEDULED', from, page: 1, pageSize })
  const totalPages = Math.max(1, first.totalPages ?? 1)
  if (totalPages === 1) return first
  const remaining = await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) =>
    getMeetings(projectId, { status: 'SCHEDULED', from, page: index + 2, pageSize }),
  ))
  return { ...first, items: [...first.items, ...remaining.flatMap((page) => page.items)] }
}

async function loadMyEvaluationAssignments() {
  const pageSize = 100
  const first = await getMyEvaluationAssignments(1, pageSize)
  const totalPages = Math.max(1, first.totalPages ?? 1)
  if (totalPages === 1) return first.items
  const remaining = await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) =>
    getMyEvaluationAssignments(index + 2, pageSize),
  ))
  return [...first.items, ...remaining.flatMap((page) => page.items)]
}

function nearestMeeting(items: Meeting[]) {
  return items.reduce<Meeting | null>((nearest, item) => !nearest || item.startAt < nearest.startAt ? item : nearest, null)
}

/**
 * Read-only supervision cockpit data. Every source settles independently so an
 * unavailable resource cannot make the assigned project workspace disappear.
 */
export function useSupervisorOperationalSummary(projectId: number) {
  const [summary, setSummary] = useState<SupervisorOperationalSummary>({
    meeting: loading, milestone: loading, deliverables: loading, finalChecklist: loading, pendingReports: loading, evaluator: loading,
  })
  const requestSequence = useRef(0)

  const reload = useCallback(async () => {
    const requestId = ++requestSequence.current
    setSummary({ meeting: loading, milestone: loading, deliverables: loading, finalChecklist: loading, pendingReports: loading, evaluator: loading })
    const results = await Promise.allSettled([
      loadScheduledMeetings(projectId, new Date().toISOString()),
      services.milestone.getProjectMilestones(projectId),
      getDeliverables(projectId, { page: 1, pageSize: 1 }),
      getFinalChecklist(projectId),
      getProgressReports(projectId, { status: 'SUBMITTED', page: 1, pageSize: 1 }),
      loadMyEvaluationAssignments(),
    ])
    if (requestId !== requestSequence.current) return
    const [meetings, milestones, deliverables, checklist, pendingReports, assignments] = results
    setSummary({
      meeting: meetings.status === 'fulfilled'
        ? { state: 'ready', data: { count: meetings.value.totalCount, next: nearestMeeting(meetings.value.items) } }
        : failure('lịch họp sắp tới'),
      milestone: milestones.status === 'fulfilled'
        ? { state: 'ready', data: {
          count: milestones.value.length,
          current: milestones.value.find((item) => item.status.replaceAll('_', '').toUpperCase() === 'INPROGRESS') ?? null,
        } }
        : failure('mốc đồ án'),
      deliverables: deliverables.status === 'fulfilled'
        ? { state: 'ready', data: { count: deliverables.value.totalCount } }
        : failure('deliverables'),
      finalChecklist: checklist.status === 'fulfilled'
        ? { state: 'ready', data: checklist.value }
        : failure('checklist bàn giao cuối'),
      pendingReports: pendingReports.status === 'fulfilled'
        ? { state: 'ready', data: { count: pendingReports.value.totalCount } }
        : failure('báo cáo chờ phản hồi'),
      evaluator: assignments.status === 'fulfilled'
        ? { state: 'ready', data: assignments.value.some((item) => item.projectId === projectId && item.status === 'ACTIVE') }
        : failure('phân công evaluator'),
    })
  }, [projectId])

  useEffect(() => { void reload() }, [reload])
  return { ...summary, reload }
}
