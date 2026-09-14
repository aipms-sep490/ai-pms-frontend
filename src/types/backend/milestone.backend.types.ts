export type BackendMilestoneStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface MilestoneDto {
  id: number
  projectId: number
  title: string
  description?: string | null
  startDate?: string | null // ISO DateOnly string (YYYY-MM-DD)
  dueDate?: string | null   // ISO DateOnly string (YYYY-MM-DD)
  status: BackendMilestoneStatus | string
  sortOrder: number
  createdBy: number
  createdByFullName: string
  createdAt: string
  updatedAt: string
}

export interface MilestoneProgressDto {
  milestoneId: number
  milestoneTitle: string
  totalTasks: number
  doneTasks: number
  progressPercentage: number
}
