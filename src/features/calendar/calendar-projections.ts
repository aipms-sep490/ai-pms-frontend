import type { Deliverable } from '../deliverables/deliverable-types'
import type { Meeting } from '../meetings/meeting-types'
import type { EvaluationAssignment } from '../evaluations/evaluation-types'
import type { MilestoneDto, TaskDto } from '../../types/backend'
import type { CalendarProjectionItem } from './calendar-types'
import type { BackendCalendarItem } from '../../services/api/calendar.api'

const completed = new Set(['DONE', 'COMPLETED', 'CANCELLED', 'CLOSED', 'ACCEPTED', 'ARCHIVED'])

export function isHistoricalStatus(status: string): boolean {
  return completed.has(status.toUpperCase())
}

export function formatCalendarDate(value?: string): string {
  if (!value) return 'Chưa có thời điểm'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
  }
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.valueOf())) return 'Thời điểm không hợp lệ'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(parsed)
}

export function taskProjection(task: Pick<TaskDto, 'id' | 'title' | 'dueAt' | 'startAt' | 'status'>, projectId: number, projectName?: string): CalendarProjectionItem | null {
  if (!task.dueAt && !task.startAt) return null
  return { sourceType: 'TASK', sourceId: task.id, projectId, projectName, title: task.title, startAt: task.startAt ?? undefined, dueAt: task.dueAt ?? undefined, status: task.status, deepLink: `/project/tasks/${task.id}` }
}

export function milestoneProjection(milestone: Pick<MilestoneDto, 'id' | 'projectId' | 'title' | 'startDate' | 'dueDate' | 'status'>, projectName?: string): CalendarProjectionItem | null {
  if (!milestone.startDate && !milestone.dueDate) return null
  return { sourceType: 'MILESTONE', sourceId: milestone.id, projectId: milestone.projectId, projectName, title: milestone.title, startAt: milestone.startDate ?? undefined, dueAt: milestone.dueDate ?? undefined, status: milestone.status, deepLink: `/project/milestones/${milestone.id}` }
}

export function meetingProjection(meeting: Meeting, projectName?: string): CalendarProjectionItem {
  return { sourceType: 'MEETING', sourceId: meeting.id, projectId: meeting.projectId, projectName, title: meeting.title, startAt: meeting.startAt, endAt: meeting.endAt ?? undefined, status: meeting.status, deepLink: `/project/meetings/${meeting.id}` }
}

export function deliverableProjection(deliverable: Deliverable, projectName?: string): CalendarProjectionItem | null {
  if (!deliverable.dueAt) return null
  return { sourceType: 'DELIVERABLE', sourceId: deliverable.id, projectId: deliverable.projectId, projectName, title: deliverable.title, dueAt: deliverable.dueAt, status: deliverable.status, deepLink: '/project/deliverables' }
}

export function finalSubmissionProjection(projectId: number, projectName: string | undefined, deadline: string | null): CalendarProjectionItem | null {
  if (!deadline) return null
  return { sourceType: 'FINAL_SUBMISSION', sourceId: projectId, projectId, projectName, title: 'Hạn bàn giao cuối', dueAt: deadline, status: 'OPEN', deepLink: '/project/final-submission' }
}

/** A reporting period is not a submission deadline. A report is projected only when the API gives an explicit dueAt. */
export function progressReportProjection(report: { id: number; title: string; status: string; dueAt?: string | null; projectId: number }, projectName?: string): CalendarProjectionItem | null {
  if (!report.dueAt) return null
  return { sourceType: 'PROGRESS_REPORT', sourceId: report.id, projectId: report.projectId, projectName, title: report.title, dueAt: report.dueAt, status: report.status, deepLink: `/project/reports/${report.id}` }
}

/** Assignments have no authoritative deadline in the current DTO, so this intentionally returns null. */
export function evaluationProjection(assignment: EvaluationAssignment, deadline?: string | null): CalendarProjectionItem | null {
  if (!deadline) return null
  return { sourceType: 'EVALUATION_ASSIGNMENT', sourceId: assignment.id, projectId: assignment.projectId, title: 'Hạn đánh giá', dueAt: deadline, status: assignment.status, deepLink: `/evaluator/assignments/${assignment.id}` }
}

/** Never follow a backend deep link: route construction stays local and actor-scoped. */
export function scopedCalendarProjection(item: BackendCalendarItem): CalendarProjectionItem | null {
  const deepLink = item.sourceType === 'TASK' ? `/project/tasks/${item.sourceId}`
    : item.sourceType === 'MILESTONE' ? `/project/milestones/${item.sourceId}`
      : item.sourceType === 'MEETING' ? `/project/meetings/${item.sourceId}`
        : item.sourceType === 'DELIVERABLE' ? '/project/deliverables'
          : item.sourceType === 'FINAL_SUBMISSION' ? '/project/final-submission'
            : item.sourceType === 'PROGRESS_REPORT' ? `/project/reports/${item.sourceId}` : null
  if (!deepLink || (!item.startAt && !item.endAt && !item.dueAt)) return null
  return { sourceType: item.sourceType, sourceId: item.sourceId, projectId: item.projectId, title: item.title, startAt: item.startAt ?? undefined, endAt: item.endAt ?? undefined, dueAt: item.dueAt ?? undefined, status: item.status, deepLink }
}
