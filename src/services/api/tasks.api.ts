import type { OverdueBlockedTasksDto, PagedResult, ProjectProgressSummaryDto, ProjectTimelineDataDto, SprintDto, TaskDto, TaskStatusHistoryDto } from '../../types/backend'
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
  /** Jira: filter by sprint (0/'backlog' meaning unassigned, when the backend supports it). */
  sprintId?: number
  /** BE-07: filter by project major (the real major id, not the project-major row id). */
  majorId?: number
  /** BE-07: filter by the task's discipline role for that major. */
  disciplineRole?: 'PRIMARY' | 'SUPPORTING'
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
  disciplines?: Array<{ majorId: number; role: 'PRIMARY' | 'SUPPORTING' }>
  /** Jira fields; optional until the backend ships sprint support. */
  sprintId?: number | null
  storyPoints?: number | null
  labels?: string[]
}

export interface CreateSprintPayload { name: string; goal?: string | null; startAt?: string | null; endAt?: string | null }

export interface UpdateTaskPayload extends Omit<CreateTaskPayload, 'assigneeUserIds' | 'disciplines'> { concurrencyToken?: string }
export interface AddTaskDependencyPayload { taskId: number; dependsOnTaskId: number; dependencyType: string; concurrencyToken?: string }
export interface UpdateTaskStatusPayload { newStatus: string; reason?: string | null; concurrencyToken?: string }

function query(filters: TaskListFilters): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  return params.toString()
}

export const getTask = (id: number, signal?: AbortSignal) => httpGet<TaskDto>(`/tasks/${id}`, signal)
export const getProjectTasks = (projectId: number, filters: TaskListFilters = {}, signal?: AbortSignal) => {
  const serialized = query({ page: 1, pageSize: 10, ...filters })
  return httpGet<PagedResult<TaskDto>>(`/tasks/project/${projectId}?${serialized}`, signal)
}
export const createTask = (payload: CreateTaskPayload) => httpPost<TaskDto, CreateTaskPayload>('/tasks', payload)
export const updateTask = (id: number, payload: UpdateTaskPayload) => httpPut<TaskDto, UpdateTaskPayload>(`/tasks/${id}`, payload)
const tokenQuery = (concurrencyToken?: string) => concurrencyToken ? `?${new URLSearchParams({ concurrencyToken })}` : ''
export const deleteTask = async (id: number, concurrencyToken?: string) => { await httpDelete(`/tasks/${id}${tokenQuery(concurrencyToken)}`) }
export const setTaskAssignees = (id: number, assigneeUserIds: number[], concurrencyToken?: string) => httpPost<TaskDto, number[]>(`/tasks/${id}/assignees${tokenQuery(concurrencyToken)}`, assigneeUserIds)
export const addTaskDependency = (payload: AddTaskDependencyPayload) => httpPost<TaskDto, AddTaskDependencyPayload>('/tasks/dependency', payload)
export const removeTaskDependency = (id: number, dependsOnTaskId: number, concurrencyToken?: string) => httpDelete<TaskDto>(`/tasks/${id}/dependency/${dependsOnTaskId}${tokenQuery(concurrencyToken)}`)
export const updateTaskStatus = (id: number, payload: UpdateTaskStatusPayload) => httpPut<TaskDto, UpdateTaskStatusPayload>(`/tasks/${id}/status`, payload)
export const getTaskHistory = (id: number, signal?: AbortSignal) => httpGet<TaskStatusHistoryDto[]>(`/tasks/${id}/history`, signal)
export const getOverdueBlockedTasks = (projectId: number) => httpGet<OverdueBlockedTasksDto>(`/tasks/project/${projectId}/overdue-blocked`)
export const getProjectTimeline = (projectId: number, signal?: AbortSignal) => httpGet<ProjectTimelineDataDto>(`/tasks/project/${projectId}/timeline`, signal)
export const getProjectProgressSummary = (projectId: number, signal?: AbortSignal) => httpGet<ProjectProgressSummaryDto>(`/tasks/project/${projectId}/progress-summary`, signal)

// Jira-style sprints (proposed contract; BE must confirm routes + invariants before the flag is enabled).
export const getProjectSprints = (projectId: number, signal?: AbortSignal) => httpGet<SprintDto[]>(`/projects/${projectId}/sprints`, signal)
export const createSprint = (projectId: number, payload: CreateSprintPayload) => httpPost<SprintDto, CreateSprintPayload>(`/projects/${projectId}/sprints`, payload)
export const updateSprintStatus = (sprintId: number, status: 'ACTIVE' | 'COMPLETED', concurrencyToken?: string) => httpPut<SprintDto, { status: string; concurrencyToken?: string }>(`/sprints/${sprintId}/status`, { status, concurrencyToken })
export const setTaskSprint = (taskId: number, sprintId: number | null, concurrencyToken?: string) => httpPut<TaskDto, { sprintId: number | null; concurrencyToken?: string }>(`/tasks/${taskId}/sprint`, { sprintId, concurrencyToken })
export const setTaskPlanning = (taskId: number, payload: { storyPoints: number | null; labels: string[]; concurrencyToken?: string }) => httpPut<TaskDto, typeof payload>(`/tasks/${taskId}/planning`, payload)
