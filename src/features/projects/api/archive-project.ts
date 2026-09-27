import { httpGet, httpPost } from '../../../services/http/http-client'
import type { ProjectDto, ProjectStatusHistoryDto } from '../../../types/backend'

/** The dashboard summary has no concurrency token. Read the current Project before archive. */
export async function archiveProject(projectId: number, reason: string | null): Promise<ProjectDto> {
  const project = await httpGet<ProjectDto>(`/v1/projects/${projectId}`)
  return httpPost<ProjectDto>(`/v1/projects/${projectId}/archive`, {
    concurrencyToken: project.concurrencyToken,
    reason,
  })
}

export function getArchiveView(projectId: number): Promise<[ProjectDto, ProjectStatusHistoryDto[]]> {
  return Promise.all([
    httpGet<ProjectDto>(`/v1/projects/${projectId}`),
    httpGet<ProjectStatusHistoryDto[]>(`/v1/projects/${projectId}/history`),
  ])
}
