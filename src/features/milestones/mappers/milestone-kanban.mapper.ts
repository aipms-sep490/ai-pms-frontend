import type {
  KanbanTask,
  MilestoneDetail,
  MilestoneKanbanStatus,
} from '../types/milestone-kanban.types'
import type {
  MilestoneDto,
  MilestoneProgressDto,
  TaskDto,
} from '../../../types/backend'
import { normalizeMajorType } from '../../projects/mappers/project-dossier.mapper'

export function mapTaskStatusToKanban(status?: string | null): MilestoneKanbanStatus {
  const normalized = (status ?? '').trim().toUpperCase()
  switch (normalized) {
    case 'DONE':
      return 'done'
    case 'IN_REVIEW':
      return 'review'
    case 'IN_PROGRESS':
    case 'BLOCKED':
      return 'in_progress'
    case 'TODO':
    case 'CANCELLED':
    default:
      return 'todo'
  }
}

export function inferTaskProgress(status?: string | null): number {
  const normalized = (status ?? '').trim().toUpperCase()
  switch (normalized) {
    case 'DONE':
      return 100
    case 'IN_REVIEW':
      return 90
    case 'IN_PROGRESS':
      return 50
    case 'BLOCKED':
      return 30
    case 'TODO':
    default:
      return 0
  }
}

export function inferStoryPoints(priority?: string | null): number {
  const normalized = (priority ?? '').trim().toUpperCase()
  switch (normalized) {
    case 'CRITICAL':
      return 8
    case 'HIGH':
      return 5
    case 'MEDIUM':
      return 3
    case 'LOW':
      return 2
    default:
      return 3
  }
}

export function mapMilestoneStatus(
  status?: string | null,
): 'completed' | 'active' | 'upcoming' {
  const normalized = (status ?? '').trim().toUpperCase()
  switch (normalized) {
    case 'COMPLETED':
      return 'completed'
    case 'IN_PROGRESS':
      return 'active'
    case 'PLANNED':
    case 'CANCELLED':
    default:
      return 'upcoming'
  }
}

export function formatDateToVi(dateString?: string | null): string {
  if (!dateString) return 'Chưa xác định'
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return dateString
  }
}

export function mapTaskToKanban(task: TaskDto, milestoneKey: string): KanbanTask {
  const isCritical = task.priority?.toUpperCase() === 'CRITICAL'
  const primaryAssignee = task.assignees?.[0]
  const assigneeName = primaryAssignee?.userFullName ?? 'Chưa phân công'

  return {
    id: `SEP-${task.id}`,
    title: task.title,
    major: normalizeMajorType(),
    assignee: assigneeName,
    assigneeRole: primaryAssignee ? 'Thành viên phụ trách' : 'Chưa phân công',
    deadline: formatDateToVi(task.dueAt),
    progress: inferTaskProgress(task.status),
    status: mapTaskStatusToKanban(task.status),
    isCritical,
    storyPoints: inferStoryPoints(task.priority),
    milestoneId: milestoneKey,
  }
}

export function mapMilestoneKanban(
  milestones: MilestoneDto[],
  progressList?: MilestoneProgressDto[] | null,
  tasks?: TaskDto[] | null,
): Record<string, MilestoneDetail> {
  const progressMap = new Map<number, MilestoneProgressDto>()
  if (progressList) {
    for (const p of progressList) {
      progressMap.set(p.milestoneId, p)
    }
  }

  // Group tasks by milestoneId
  const tasksByMilestone = new Map<number, TaskDto[]>()
  if (tasks) {
    for (const t of tasks) {
      const list = tasksByMilestone.get(t.milestoneId) ?? []
      list.push(t)
      tasksByMilestone.set(t.milestoneId, list)
    }
  }

  const result: Record<string, MilestoneDetail> = {}

  const sortedMilestones = [...milestones].sort((a, b) => a.sortOrder - b.sortOrder)

  for (const [index, m] of sortedMilestones.entries()) {
    const milestoneKey = `M${index + 1}`
    const progress = progressMap.get(m.id)
    const milestoneTasks = tasksByMilestone.get(m.id) ?? []

    const mappedTasks: KanbanTask[] = milestoneTasks.map((t) =>
      mapTaskToKanban(t, milestoneKey),
    )

    const totalTasks = progress?.totalTasks ?? mappedTasks.length
    const completedTasks =
      progress?.doneTasks ?? mappedTasks.filter((t) => t.status === 'done').length
    const calculatedProgress =
      progress?.progressPercentage ??
      (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0)

    result[milestoneKey] = {
      id: milestoneKey,
      name: m.title,
      phase: `Giai đoạn ${m.sortOrder || index + 1}`,
      startDate: formatDateToVi(m.startDate),
      endDate: formatDateToVi(m.dueDate),
      progress: calculatedProgress,
      status: mapMilestoneStatus(m.status),
      totalTasks,
      completedTasks,
      description: m.description ?? `Cột mốc ${m.title} của đề tài.`,
      tasks: mappedTasks,
    }
  }

  return result
}
