import { httpGet } from '../../services/http/http-client'
import type { AssistantDraft } from './academic-ai-api'

export const workflowModes = {
  NEXT_STEPS: 'Bây giờ cần làm gì?', BLOCKERS: 'Vì sao bị chặn?', SUBMISSION_CHECK: 'Kiểm tra trước khi bàn giao',
  MEETING_PREP: 'Chuẩn bị gặp giảng viên', MEETING_FOLLOWUP: 'Theo dõi sau cuộc họp',
  CONSISTENCY: 'Đối chiếu tiến độ', COORDINATION: 'Phối hợp liên ngành', SUPERVISOR_BRIEF: 'Tổng hợp cho GVHD / Khoa',
} as const
export type WorkflowMode = keyof typeof workflowModes
export interface WorkflowItem { code: string; status: string; title: string; detail: string; owner: string; source: string; target?: string | null; resourceId?: number | null }
export interface WorkflowAssistance {
  projectId: number; mode: WorkflowMode; generatedAt: string; status: string; summary: string
  items: WorkflowItem[]; limitations: string[]; draft?: AssistantDraft | null
  meetings?: { id: number; title: string; startAt: string }[] | null
}
export const getWorkflowAssistance = (projectId: number, mode: WorkflowMode, meetingId?: number, signal?: AbortSignal) =>
  httpGet<WorkflowAssistance>(`/projects/${projectId}/ai/workflow-assistance?${new URLSearchParams({ mode, ...(meetingId ? { meetingId: String(meetingId) } : {}) })}`, { signal })

// Destinations are app-owned route names; source content cannot supply a URL.
export function workflowTarget(base: string | undefined, projectId: number, item: WorkflowItem): string | undefined {
  if (!base || !item.target) return undefined
  const student = base === '/project'
  const supervisor = base === `/supervisor/projects/${projectId}`
  const department = base === `/department/projects/${projectId}`
  const mentor = new RegExp(`^/mentor/projects/${projectId}/majors/[1-9][0-9]*$`).test(base)
  const targets = student ? ['overview', 'supervisor', 'agreement', 'tasks', 'milestones', 'reports', 'meetings', 'deliverables', 'final-submission']
    : supervisor ? ['tasks', 'milestones', 'reports', 'meetings', 'deliverables', 'final-submission']
    : department ? ['evaluation-schemes', 'evaluators', 'result', 'final-submission'] : mentor ? ['tasks', 'reports', 'meetings'] : []
  if (!targets.includes(item.target)) return undefined
  const detail = ['tasks', 'milestones', 'reports', 'meetings'].includes(item.target) && Number.isSafeInteger(item.resourceId) && item.resourceId! > 0
  return `${base}/${item.target}${detail ? `/${item.resourceId}` : ''}`
}
