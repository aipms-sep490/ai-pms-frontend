import type { OverdueBlockedTasksDto, PagedResult, ProjectProgressSummaryDto, ProjectTimelineDataDto, SprintBurndownDto, SprintCarryover, SprintDto, TaskDto, TaskStatusHistoryDto } from '../../types/backend'
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

export interface SaveSprintPayload { name: string; startAt: string; endAt: string; concurrencyToken?: string }

export interface TaskBoardFilters {
  sprintId?: number
  backlog?: boolean
  label?: string
  majorId?: number
  status?: string
  page?: number
  pageSize?: number
}

export interface SaveTaskBoardPayload {
  sprintId?: number | null
  storyPoints?: number | null
  labels: string[]
  concurrencyToken?: string
}

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

// Jira-style sprints (BE-N08; verified against AIPMS.Api SprintsController + SprintContracts).
export const getProjectSprints = (projectId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<SprintDto>>(`/projects/${projectId}/sprints?${new URLSearchParams({ page: String(page), pageSize: String(pageSize) })}`, signal)
export const createSprint = (projectId: number, payload: SaveSprintPayload) => httpPost<SprintDto, SaveSprintPayload>(`/projects/${projectId}/sprints`, payload)
export const updateSprint = (projectId: number, sprintId: number, payload: SaveSprintPayload) => httpPut<SprintDto, SaveSprintPayload>(`/projects/${projectId}/sprints/${sprintId}`, payload)
export const startSprint = (projectId: number, sprintId: number, concurrencyToken: string) =>
  httpPost<SprintDto, { concurrencyToken: string }>(`/projects/${projectId}/sprints/${sprintId}/start`, { concurrencyToken })
export const completeSprint = (projectId: number, sprintId: number, concurrencyToken: string, carryover: SprintCarryover[]) =>
  httpPost<SprintDto, { concurrencyToken: string; carryover: SprintCarryover[] }>(`/projects/${projectId}/sprints/${sprintId}/complete`, { concurrencyToken, carryover })
export const getSprintBurndown = (projectId: number, sprintId: number, signal?: AbortSignal) =>
  httpGet<SprintBurndownDto>(`/projects/${projectId}/sprints/${sprintId}/burndown`, signal)
export const getTaskBoard = (projectId: number, filters: TaskBoardFilters = {}, signal?: AbortSignal) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries({ page: 1, pageSize: 100, ...filters })) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  return httpGet<PagedResult<TaskDto>>(`/projects/${projectId}/task-board?${params}`, signal)
}
export const saveTaskBoard = (taskId: number, payload: SaveTaskBoardPayload) => httpPut<TaskDto, SaveTaskBoardPayload>(`/tasks/${taskId}/board`, payload)
