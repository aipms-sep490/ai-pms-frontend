import { httpGet, httpPatch, httpPut } from '../../services/http/http-client'

export interface TaskCriterion {
  id: number
  taskId: number
  title: string
  isCompleted: boolean
  sortOrder: number
  completedAt: string | null
  completedBy: number | null
  completedByName: string | null
}

export interface TaskCriteriaList {
  taskId: number
  totalCount: number
  completedCount: number
  canManage: boolean
  canToggle: boolean
  items: TaskCriterion[]
}

export const getTaskCriteria = (taskId: number, signal?: AbortSignal) =>
  httpGet<TaskCriteriaList>(`/tasks/${taskId}/criteria`, { signal })

export const replaceTaskCriteria = (taskId: number, items: Array<{ title: string; isCompleted?: boolean }>) =>
  httpPut<TaskCriteriaList>(`/tasks/${taskId}/criteria`, { items })

export const toggleTaskCriterion = (taskId: number, criterionId: number, isCompleted: boolean) =>
  httpPatch<TaskCriteriaList>(`/tasks/${taskId}/criteria/${criterionId}`, { isCompleted })
