import { httpGet } from '../http/http-client'
import type {
  ProjectWorkflowActionsDto,
  ProjectExecutionActionsDto,
  TaskExecutionActionsDto,
  MilestoneExecutionActionsDto,
  TeamWorkflowActionsDto,
  UserWorkflowContextDto,
} from '../../types/backend'

export function getCurrentContext(academicSemesterId?: number, signal?: AbortSignal): Promise<UserWorkflowContextDto> {
  const query = academicSemesterId ? `?academicSemesterId=${academicSemesterId}` : ''
  return httpGet<UserWorkflowContextDto>(`/auth/me/context${query}`, { signal })
}

export function getTeamActions(teamId: number): Promise<TeamWorkflowActionsDto> {
  return httpGet<TeamWorkflowActionsDto>(`/teams/${teamId}/actions`)
}

export function getProjectActions(projectId: number): Promise<ProjectWorkflowActionsDto> {
  return httpGet<ProjectWorkflowActionsDto>(`/projects/${projectId}/actions`)
}

export function getProjectExecutionActions(projectId: number): Promise<ProjectExecutionActionsDto> {
  return httpGet<ProjectExecutionActionsDto>(`/projects/${projectId}/execution-actions`)
}

export function getTaskExecutionActions(taskId: number): Promise<TaskExecutionActionsDto> {
  return httpGet<TaskExecutionActionsDto>(`/tasks/${taskId}/execution-actions`)
}

export function getMilestoneExecutionActions(milestoneId: number): Promise<MilestoneExecutionActionsDto> {
  return httpGet<MilestoneExecutionActionsDto>(`/milestones/${milestoneId}/execution-actions`)
}
