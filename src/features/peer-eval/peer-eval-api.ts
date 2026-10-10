import { httpGet, httpPost } from '../../services/http/http-client'
import type { MyPeerEvaluations, PeerEvaluationInput } from './peer-eval-types'

// BE-19b endpoints. FE is built ahead of the backend; until it ships these calls
// return 404/501 and the page shows the matching state.
export const getMyPeerEvaluations = (projectId: number, signal?: AbortSignal) =>
  httpGet<MyPeerEvaluations>(`/projects/${projectId}/peer-evaluations/mine`, signal)

export const submitPeerEvaluations = (projectId: number, items: PeerEvaluationInput[]) =>
  httpPost<MyPeerEvaluations, { items: PeerEvaluationInput[] }>(`/projects/${projectId}/peer-evaluations`, { items })
