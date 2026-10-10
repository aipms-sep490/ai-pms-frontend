export type BackendTaskStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'IN_REVIEW'
  | 'DONE'
  | 'CANCELLED'

export type BackendTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface TaskAssigneeDto {
  id: number
  taskId: number
  userId: number
  userFullName: string
  assignedBy: number
  assignedAt: string
}

export interface TaskDependencyDto {
  id: number
  taskId: number
  dependsOnTaskId: number
  dependencyType: string
  createdAt: string
}

export interface TaskStatusHistoryDto {
  id: number
  taskId: number
  oldStatus?: string | null
  newStatus: string
  changedBy: number
  changedByFullName: string
  reason?: string | null
  changedAt: string
}

export interface TaskDto {
  id: number
  milestoneId: number
  parentTaskId?: number | null
  title: string
  description?: string | null
  status: BackendTaskStatus | string
  priority?: BackendTaskPriority | string | null
  startAt?: string | null // ISO DateTime
  dueAt?: string | null   // ISO DateTime
  completedAt?: string | null
  createdBy: number
  createdByFullName: string
  createdAt: string
  updatedAt: string
  concurrencyToken?: string
  assignees: TaskAssigneeDto[]
  dependencies: TaskDependencyDto[]
  /** Jira-style fields; optional until the backend ships sprint support. Absent renders as backlog, no points, no labels. */
  sprintId?: number | null
  storyPoints?: number | null
  labels?: string[]
}

export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED'

export interface SprintDto {
  id: number
  projectId: number
  name: string
  goal?: string | null
  startAt?: string | null
  endAt?: string | null
  status: SprintStatus | string
  concurrencyToken?: string
}

export interface OverdueBlockedTasksDto {
  overdueTasks: TaskDto[]
  blockedTasks: TaskDto[]
}

// Timeline & Gantt Backend Contracts
export interface TimelineTaskAssigneeDto {
  userId: number
  fullName: string
}

export interface TimelineTaskDependencyDto {
  dependsOnTaskId: number
  dependencyType: string
}

export interface TimelineTaskDto {
  id: number
  parentTaskId?: number | null
  title: string
  description?: string | null
  status: BackendTaskStatus | string
  priority?: BackendTaskPriority | string | null
  startAt?: string | null // ISO DateTime
  dueAt?: string | null   // ISO DateTime
  completedAt?: string | null
  assignees: TimelineTaskAssigneeDto[]
  dependencies: TimelineTaskDependencyDto[]
}

export interface TimelineMilestoneDto {
  id: number
  title: string
  description?: string | null
  startDate?: string | null // ISO DateOnly
  dueDate?: string | null   // ISO DateOnly
  status: string
  sortOrder: number
  progressPercentage: number
  tasks: TimelineTaskDto[]
}

export interface ProjectTimelineDataDto {
  projectId: number
  milestones: TimelineMilestoneDto[]
}

export interface ProjectProgressSummaryDto {
  projectId: number
  totalTasks: number
  doneTasks: number
  blockedTasks: number
  overdueTasks: number
  totalMilestones: number
  completedMilestones: number
  progressPercentage: number
}
