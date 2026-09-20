import type { OverdueBlockedTasksDto, PagedResult, ProjectProgressSummaryDto, ProjectTimelineDataDto, TaskDto, TaskStatusHistoryDto } from '../../types/backend'
import { httpDelete, httpGet, httpPost, httpPut } from '../http/http-client'

export interface TaskListFilters {
  milestoneId?: number
  status?: string
  priority?: string
  assigneeUserId?: number
  search?: string
  dueFrom?: string
  dueTo?: string
  isOverdue?: boolean
  isBlocked?: boolean
  page?: number
  pageSize?: number
}

export interface CreateTaskPayload {
  milestoneId: number
  parentTaskId?: number | null
  title: string
  description?: string | null
  priority?: string | null
  startAt?: string | null
  dueAt?: string | null
  assigneeUserIds: number[]
}

export interface UpdateTaskPayload extends Omit<CreateTaskPayload, 'assigneeUserIds'> {}
export interface AddTaskDependencyPayload { taskId: number; dependsOnTaskId: number; dependencyType: string }
export interface UpdateTaskStatusPayload { newStatus: string; reason?: string | null }

function query(filters: TaskListFilters): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  return params.toString()
}

export const getTask = (id: number) => httpGet<TaskDto>(`/tasks/${id}`)
export const getProjectTasks = (projectId: number, filters: TaskListFilters = {}) => {
  const serialized = query({ page: 1, pageSize: 10, ...filters })
  return httpGet<PagedResult<TaskDto>>(`/tasks/project/${projectId}?${serialized}`)
}
export const createTask = (payload: CreateTaskPayload) => httpPost<TaskDto, CreateTaskPayload>('/tasks', payload)
export const updateTask = (id: number, payload: UpdateTaskPayload) => httpPut<TaskDto, UpdateTaskPayload>(`/tasks/${id}`, payload)
export const deleteTask = async (id: number) => { await httpDelete(`/tasks/${id}`) }
export const setTaskAssignees = (id: number, assigneeUserIds: number[]) => httpPost<TaskDto, number[]>(`/tasks/${id}/assignees`, assigneeUserIds)
export const addTaskDependency = (payload: AddTaskDependencyPayload) => httpPost<TaskDto, AddTaskDependencyPayload>('/tasks/dependency', payload)
export const removeTaskDependency = (id: number, dependsOnTaskId: number) => httpDelete<TaskDto>(`/tasks/${id}/dependency/${dependsOnTaskId}`)
export const updateTaskStatus = (id: number, payload: UpdateTaskStatusPayload) => httpPut<TaskDto, UpdateTaskStatusPayload>(`/tasks/${id}/status`, payload)
export const getTaskHistory = (id: number) => httpGet<TaskStatusHistoryDto[]>(`/tasks/${id}/history`)
export const getOverdueBlockedTasks = (projectId: number) => httpGet<OverdueBlockedTasksDto>(`/tasks/project/${projectId}/overdue-blocked`)
export const getProjectTimeline = (projectId: number) => httpGet<ProjectTimelineDataDto>(`/tasks/project/${projectId}/timeline`)
export const getProjectProgressSummary = (projectId: number) => httpGet<ProjectProgressSummaryDto>(`/tasks/project/${projectId}/progress-summary`)
