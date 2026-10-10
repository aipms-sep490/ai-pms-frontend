import { httpGet } from '../../services/http/http-client'
import type { DefenseSession } from './defense-types'

// BE-14 endpoint. FE is built ahead of the backend; until it ships this call
// returns 404 (no schedule yet) or 501 and the page shows the matching state.
export const getProjectDefenseSession = (projectId: number, signal?: AbortSignal) =>
  httpGet<DefenseSession>(`/projects/${projectId}/defense-session`, signal)
