import type { MajorType } from '../../../components/ui/MultidisciplinaryTag'

export interface GanttTask {
  id: string
  name: string
  wbsCode: string
  major: MajorType
  startWeek: number // 1-15
  durationWeeks: number // >= 1
  progress: number // 0-100
  isCritical: boolean
  dependencies?: string[]
  assignee: string
  assigneeRole: string
  milestoneId: string
}

export interface WbsGroup {
  id: string
  wbsCode: string
  name: string
  startWeek: number
  durationWeeks: number
  progress: number
  isCritical?: boolean
  milestoneId: string
  tasks: GanttTask[]
}

export type GanttViewMode = 'weeks' | 'milestones'

export interface GanttFilterState {
  onlyCritical: boolean
  majorFilter: 'all' | MajorType
  searchQuery: string
}

export interface GanttTelemetry {
  currentWeek: number
  totalTasks: number
  completedTasksCount: number
  inProgressTasksCount: number
  upcomingTasksCount: number
  criticalTasksCount: number
  criticalPathDays: number
  overallProgress: number
  bottleneckChain: string[]
  bottleneckWarning: string
}
