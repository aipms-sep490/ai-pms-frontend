import { endpoints } from '../../../services/api/endpoints'
import { httpGet } from '../../../services/http/http-client'
import type { ProjectLifecycle } from '../types/project.types'

export function getProjectLifecycle(signal?: AbortSignal): Promise<ProjectLifecycle> {
  return httpGet<ProjectLifecycle>(endpoints.projectLifecycle, signal)
}
