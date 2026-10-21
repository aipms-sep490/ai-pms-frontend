import { httpGet } from '../../services/http/http-client'

export type ActionAggregatorKind = 'TASK' | 'REVIEW_GATE' | 'PROGRESS_REPORT' | 'PROGRESS_REVIEW' | 'MEETING_SIGN_OFF' | 'REVIEWER_ASSIGNMENT' | 'SUPERVISOR_REQUEST' | 'APPEAL'
export interface ActionAggregatorItem {
  /** Kept as a string so an unknown server kind remains visible. */
  kind: string
  id: number
  projectId: number | null
  title: string
  status: string
  severity: 'HIGH' | 'NORMAL'
  dueAt: string | null
  deepLink: string | null
}
export interface ActionAggregatorResponse { asOfUtc: string; items: ActionAggregatorItem[] }
export interface StudentNextActions extends ActionAggregatorResponse { projectId: number | null }
export interface DepartmentUrgentActions extends ActionAggregatorResponse { departmentId: number }

export const getStudentNextActions = (signal?: AbortSignal) => httpGet<StudentNextActions>('/students/me/next-actions', signal)
export const getSupervisorTriageQueue = (signal?: AbortSignal) => httpGet<ActionAggregatorResponse>('/supervisors/me/triage-queue', signal)
export const getDepartmentUrgentActions = (departmentId: number, signal?: AbortSignal) => httpGet<DepartmentUrgentActions>(`/departments/${departmentId}/urgent-actions`, signal)
