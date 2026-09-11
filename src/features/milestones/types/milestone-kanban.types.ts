import type { MajorType } from '../../../components/ui/MultidisciplinaryTag'

export type MilestoneKanbanStatus = 'todo' | 'in_progress' | 'review' | 'done'

export type KanbanMajorFilter = 'all' | 'SE' | 'UIUX' | 'AI' | 'QA'

export interface KanbanTask {
  id: string
  title: string
  major: MajorType
  assignee: string
  assigneeRole: string
  deadline: string
  progress: number
  status: MilestoneKanbanStatus
  isCritical?: boolean
  storyPoints: number
  milestoneId: string
}

export interface MilestoneDetail {
  id: string
  name: string
  phase: string
  startDate: string
  endDate: string
  progress: number
  status: 'completed' | 'active' | 'upcoming'
  totalTasks: number
  completedTasks: number
  description: string
  tasks: KanbanTask[]
}

export interface KanbanColumnConfig {
  id: MilestoneKanbanStatus
  title: string
  description: string
  icon: string
  badgeVariant: 'neutral' | 'info' | 'warning' | 'success'
}
