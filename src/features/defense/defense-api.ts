import { httpGet } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'
import type { DefenseSession } from './defense-types'

export const getProjectDefenseSessions = (projectId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<DefenseSession>>(`/projects/${projectId}/defense-sessions?page=${page}&pageSize=${pageSize}`, signal)
