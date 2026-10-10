import { httpGet, httpPost } from '../../services/http/http-client'
import type { ProjectCheckpoint } from './gates-types'

// BE-12 endpoints. FE is built ahead of the backend; until it ships these calls
// return 404/501 and the page shows its error state.
export const getProjectCheckpoints = (projectId: number, signal?: AbortSignal) =>
  httpGet<ProjectCheckpoint[]>(`/projects/${projectId}/checkpoints`, signal)

export interface SubmitGateReviewPayload {
  decision: 'PASSED' | 'REVISION_REQUIRED'
  reason?: string
  majorId?: number
  evidenceIds?: number[]
  concurrencyToken?: string
}

export const submitGateReview = (checkpointId: number, payload: SubmitGateReviewPayload) =>
  httpPost<ProjectCheckpoint>(`/checkpoints/${checkpointId}/reviews`, payload)
