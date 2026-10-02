import { useEffect, useMemo, useState } from 'react'
import type { ProjectDto, SupervisorAssignmentDto } from '../../../types/backend'
import { services } from '../../../services/service-gateway'
import { getMeetings } from '../../../services/api/meetings.api'
import { getProgressReports } from '../../../services/api/progress-reports.api'

export type SupervisorProjectResource<T> =
  | { state: 'loading' }
  | { state: 'ready'; data: T }
  | { state: 'error'; message: string }

export interface SupervisorProjectSummary {
  progress: SupervisorProjectResource<{ percentage: number; doneTasks: number; totalTasks: number }>
  attention: SupervisorProjectResource<{ overdue: number; blocked: number }>
  meetings: SupervisorProjectResource<{ count: number; nextAt: string | null }>
  reports: SupervisorProjectResource<{ count: number }>
}

const loading: SupervisorProjectSummary = {
  progress: { state: 'loading' },
  attention: { state: 'loading' },
  meetings: { state: 'loading' },
  reports: { state: 'loading' },
}

function failure(section: string): SupervisorProjectResource<never> {
  return { state: 'error', message: `Chưa tải được ${section}.` }
}

function earliestMeeting(items: Array<{ startAt: string }>) {
  return items.reduce<string | null>((earliest, item) => !earliest || item.startAt < earliest ? item.startAt : earliest, null)
}

async function loadScheduledMeetings(projectId: number, from: string) {
  const pageSize = 100
  const first = await getMeetings(projectId, { status: 'SCHEDULED', from, page: 1, pageSize })
  const totalPages = Math.max(1, first.totalPages ?? 1)
  if (totalPages === 1) return first
  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => getMeetings(projectId, {
      status: 'SCHEDULED', from, page: index + 2, pageSize,
    })),
  )
  return { ...first, items: [...first.items, ...remaining.flatMap((page) => page.items)] }
}

/**
 * A read-only, independently recoverable summary. Values are rendered only
 * after their own Backend response succeeds; no client-side health is inferred.
 */
export function useSupervisorProjectSummaries(assignments: SupervisorAssignmentDto[], projects: Record<number, ProjectDto>) {
  const activePrimaryIds = useMemo(() => assignments
    .filter(assignment => assignment.isPrimary && !assignment.endedAt && projects[assignment.projectId]?.status.replaceAll('_', '').toUpperCase() === 'ACTIVE')
    .map(assignment => assignment.projectId), [assignments, projects])
  const [summaries, setSummaries] = useState<Record<number, SupervisorProjectSummary>>({})

  useEffect(() => {
    let current = true
    setSummaries(Object.fromEntries(activePrimaryIds.map(id => [id, loading])))
    for (const projectId of activePrimaryIds) {
      const now = new Date().toISOString()
      void Promise.allSettled([
        services.task.getProjectProgressSummary(projectId),
        services.task.getOverdueBlockedTasks(projectId),
        loadScheduledMeetings(projectId, now),
        getProgressReports(projectId, { page: 1, pageSize: 1 }),
      ]).then(([progress, attention, meetings, reports]) => {
        if (!current) return
        setSummaries(previous => ({
          ...previous,
          [projectId]: {
            progress: progress.status === 'fulfilled'
              ? { state: 'ready', data: { percentage: progress.value.progressPercentage, doneTasks: progress.value.doneTasks, totalTasks: progress.value.totalTasks } }
              : failure('tiến độ'),
            attention: attention.status === 'fulfilled'
              ? { state: 'ready', data: { overdue: attention.value.overdueTasks.length, blocked: attention.value.blockedTasks.length } }
              : failure('việc quá hạn và vướng mắc'),
            meetings: meetings.status === 'fulfilled'
              ? { state: 'ready', data: { count: meetings.value.totalCount, nextAt: earliestMeeting(meetings.value.items) } }
              : failure('lịch họp'),
            reports: reports.status === 'fulfilled'
              ? { state: 'ready', data: { count: reports.value.totalCount } }
              : failure('báo cáo tiến độ'),
          },
        }))
      })
    }
    return () => { current = false }
  }, [activePrimaryIds])

  return summaries
}
