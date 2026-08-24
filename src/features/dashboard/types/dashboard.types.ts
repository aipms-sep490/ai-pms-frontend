import type { MajorType } from '../../../components/ui/MultidisciplinaryTag'

export type TaskStatus = 'done' | 'in_progress' | 'overdue' | 'review'

export type TaskFilter = 'all' | 'in_progress' | 'overdue' | 'done'

export interface TaskItem {
  id: string
  title: string
  major: MajorType
  assignee: string
  deadline: string
  progress: number
  status: TaskStatus
  isCritical?: boolean
}

export type MilestoneStatus = 'completed' | 'active' | 'upcoming'

export interface MilestoneItem {
  id: string
  name: string
  date: string
  progress: number
  status: MilestoneStatus
}

export interface TelemetryMetric {
  label: string
  value: string
  unit: string
  icon: string
  iconColor: string
  badgeText: string
  badgeVariant: 'success' | 'warning' | 'error' | 'info'
  subtitle: string
  isSimulation?: boolean
}

export interface MemberContribution {
  name: string
  role: string
  major: MajorType
  color: string
  percentage: number
  storyPoints: number
}

export interface AiCopilotInsight {
  title: string
  description: string
  suggestedAction?: string
  commitCount: number
  isSimulation: boolean
}

export interface DashboardPreviewData {
  projectCode: string
  groupCode: string
  semester: string
  projectName: string
  teamLeader: string
  supervisor: string
  currentMilestone: string
  metrics: TelemetryMetric[]
  milestones: MilestoneItem[]
  tasks: TaskItem[]
  aiInsight: AiCopilotInsight
  contributions: MemberContribution[]
  isSimulation: boolean
}
