import type {
  GanttTask,
  GanttTelemetry,
  WbsGroup,
} from '../types/gantt.types'
import type {
  ProjectProgressSummaryDto,
  ProjectTimelineDataDto,
  OverdueBlockedTasksDto,
  TimelineMilestoneDto,
  TimelineTaskDto,
} from '../../../types/backend'
import { normalizeMajorType } from '../../projects/mappers/project-dossier.mapper'
import { inferTaskProgress } from '../../milestones/mappers/milestone-kanban.mapper'

const DEFAULT_SEMESTER_START = '2026-08-15'
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

export function parseDateSafe(input?: string | Date | null): Date | null {
  if (!input) return null
  const d = typeof input === 'string' ? new Date(input) : input
  return isNaN(d.getTime()) ? null : d
}

export function calculateSemesterWeek(
  dateInput?: string | Date | null,
  semesterStartInput?: string | Date | null,
): number {
  const date = parseDateSafe(dateInput)
  const startDate = parseDateSafe(semesterStartInput) ?? new Date(DEFAULT_SEMESTER_START)

  if (!date) return 1

  const diffMs = date.getTime() - startDate.getTime()
  if (diffMs < 0) return 1

  const week = Math.floor(diffMs / MS_PER_WEEK) + 1
  return Math.min(Math.max(week, 1), 15)
}

export function calculateDurationWeeks(
  startInput?: string | Date | null,
  dueInput?: string | Date | null,
): number {
  const start = parseDateSafe(startInput)
  const due = parseDateSafe(dueInput)

  if (!start || !due) return 1

  const diffMs = due.getTime() - start.getTime()
  if (diffMs <= 0) return 1

  const weeks = Math.round(diffMs / MS_PER_WEEK)
  return Math.max(weeks, 1)
}

export function mapTimelineTaskToGantt(
  task: TimelineTaskDto,
  taskIndex: number,
  milestoneSortOrder: number,
  milestoneKey: string,
  semesterStartDate: Date,
): GanttTask {
  const isCritical = task.priority?.toUpperCase() === 'CRITICAL'
  const startWeek = calculateSemesterWeek(task.startAt, semesterStartDate)
  const durationWeeks = calculateDurationWeeks(task.startAt, task.dueAt)
  const primaryAssignee = task.assignees?.[0]

  const dependencies = task.dependencies && task.dependencies.length > 0
    ? task.dependencies.map((d) => `SEP-${d.dependsOnTaskId}`)
    : undefined

  return {
    id: `SEP-${task.id}`,
    name: task.title,
    wbsCode: `${milestoneSortOrder}.${taskIndex + 1}`,
    major: normalizeMajorType(),
    startWeek,
    durationWeeks,
    progress: inferTaskProgress(task.status),
    isCritical,
    dependencies,
    assignee: primaryAssignee?.fullName ?? 'Chưa phân công',
    assigneeRole: primaryAssignee ? 'Thành viên phụ trách' : 'Chưa phân công',
    milestoneId: milestoneKey,
  }
}

export function mapTimelineMilestoneToWbs(
  milestone: TimelineMilestoneDto,
  milestoneIndex: number,
  semesterStartDate: Date,
): WbsGroup {
  const sortOrder = milestone.sortOrder || milestoneIndex + 1
  const milestoneKey = `M${sortOrder}`

  const startWeek = calculateSemesterWeek(milestone.startDate, semesterStartDate)
  const durationWeeks = calculateDurationWeeks(milestone.startDate, milestone.dueDate)

  const tasks: GanttTask[] = (milestone.tasks ?? []).map((t, taskIndex) =>
    mapTimelineTaskToGantt(t, taskIndex, sortOrder, milestoneKey, semesterStartDate),
  )

  const isCritical = tasks.some((t) => t.isCritical)

  return {
    id: `wbs-${sortOrder}`,
    wbsCode: `${sortOrder}.0`,
    name: `${milestone.title} (${milestoneKey})`,
    startWeek,
    durationWeeks,
    progress: Math.round(milestone.progressPercentage),
    isCritical,
    milestoneId: milestoneKey,
    tasks,
  }
}

export function mapGanttTelemetry(
  allTasks: GanttTask[],
  summary?: ProjectProgressSummaryDto | null,
  overdueBlocked?: OverdueBlockedTasksDto | null,
  semesterStartDate?: Date,
  currentDate?: Date,
): GanttTelemetry {
  const startDate = semesterStartDate ?? new Date(DEFAULT_SEMESTER_START)
  const now = currentDate ?? new Date()
  const currentWeek = calculateSemesterWeek(now, startDate)

  const totalTasks = summary?.totalTasks ?? allTasks.length
  const completedTasksCount =
    summary?.doneTasks ?? allTasks.filter((t) => t.progress === 100).length
  const inProgressTasksCount =
    summary
      ? Math.max(0, summary.totalTasks - summary.doneTasks - summary.blockedTasks)
      : allTasks.filter((t) => t.progress > 0 && t.progress < 100).length
  const upcomingTasksCount =
    totalTasks - completedTasksCount - inProgressTasksCount
  const criticalTasksCount = allTasks.filter((t) => t.isCritical).length
  const overallProgress =
    summary?.progressPercentage ??
    (totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0)

  // Bottleneck chain from overdue or blocked tasks
  const bottleneckChain: string[] = []
  if (overdueBlocked) {
    if (overdueBlocked.overdueTasks?.length > 0) {
      for (const t of overdueBlocked.overdueTasks) {
        bottleneckChain.push(`SEP-${t.id}`)
      }
    }
    if (overdueBlocked.blockedTasks?.length > 0) {
      for (const t of overdueBlocked.blockedTasks) {
        const id = `SEP-${t.id}`
        if (!bottleneckChain.includes(id)) {
          bottleneckChain.push(id)
        }
      }
    }
  }

  let bottleneckWarning = 'Tiến độ các mốc đồ án đang bám sát kế hoạch đường găng.'
  if (bottleneckChain.length > 0) {
    bottleneckWarning = `Phát hiện ${bottleneckChain.length} nhiệm vụ có nguy cơ tắc nghẽn hoặc quá hạn (${bottleneckChain.slice(0, 3).join(', ')}), cần can thiệp để tránh lùi hạn nộp.`
  }

  return {
    currentWeek,
    totalTasks,
    completedTasksCount,
    inProgressTasksCount: Math.max(0, inProgressTasksCount),
    upcomingTasksCount: Math.max(0, upcomingTasksCount),
    criticalTasksCount,
    criticalPathDays: 28, // Domain CPM reference days
    overallProgress: Math.round(overallProgress),
    bottleneckChain,
    bottleneckWarning,
  }
}

export function mapGanttTimeline(
  timeline: ProjectTimelineDataDto,
  summary?: ProjectProgressSummaryDto | null,
  overdueBlocked?: OverdueBlockedTasksDto | null,
  options?: {
    semesterStartDate?: string | Date
    currentDate?: Date
  },
): {
  wbsGroups: WbsGroup[]
  telemetry: GanttTelemetry
} {
  const semesterStartDate =
    parseDateSafe(options?.semesterStartDate) ?? new Date(DEFAULT_SEMESTER_START)

  const sortedMilestones = [...(timeline.milestones ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )

  const wbsGroups = sortedMilestones.map((m, index) =>
    mapTimelineMilestoneToWbs(m, index, semesterStartDate),
  )

  const allTasks = wbsGroups.flatMap((g) => g.tasks)

  const telemetry = mapGanttTelemetry(
    allTasks,
    summary,
    overdueBlocked,
    semesterStartDate,
    options?.currentDate,
  )

  return {
    wbsGroups,
    telemetry,
  }
}
