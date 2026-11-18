import type { TaskDto } from '../../types/backend'
import { httpGet, httpPost } from '../../services/http/http-client'

export type DependencyImpactDecision = 'CONFIRMED_VALID' | 'REWORK_REQUIRED'

export interface TaskDependencyImpact {
  id: number
  taskId: number
  predecessorTaskId: number
  predecessorTitle: string
  predecessorStatus: string
  status: 'PENDING' | DependencyImpactDecision
  reopenedAt: string
  reopenedBy: number
  reopenReason: string
  reviewedAt: string | null
  reviewedBy: number | null
  reviewReason: string | null
  canResolve: boolean
  blockedReason: string | null
}

export interface TaskDependencyImpacts {
  taskId: number
  canReview: boolean
  items: TaskDependencyImpact[]
}

export const getTaskDependencyImpacts = (taskId: number, signal?: AbortSignal) =>
  httpGet<TaskDependencyImpacts>(`/tasks/${taskId}/dependency-impacts`, signal)

export const resolveTaskDependencyImpact = (
  taskId: number,
  impactId: number,
  payload: { decision: DependencyImpactDecision; reason: string; concurrencyToken?: string },
) => httpPost<TaskDto, typeof payload>(`/tasks/${taskId}/dependency-impacts/${impactId}/resolve`, payload)
