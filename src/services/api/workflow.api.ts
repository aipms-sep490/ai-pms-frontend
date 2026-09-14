import { httpGet } from '../http/http-client'
import type {
  ProjectWorkflowActionsDto,
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
