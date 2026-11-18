export type BackendMilestoneStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface MilestoneDependencyDto {
  id?: number
  milestoneId: number
  dependsOnMilestoneId: number
  dependencyType: string
  createdAt?: string
  dependsOnTitle?: string | null
  dependsOnMilestoneTitle?: string
  dependsOnMilestoneDueDate?: string | null
}

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
  concurrencyToken?: string
  dependencies?: MilestoneDependencyDto[]
}

export interface MilestoneProgressDto {
  milestoneId: number
  milestoneTitle: string
  totalTasks: number
  doneTasks: number
  progressPercentage: number
}
