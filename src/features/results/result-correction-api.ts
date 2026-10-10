import { httpGet, httpPost } from '../../services/http/http-client'

// BE-19b contract (BE_DongVV_Nhiem_vu.md, backlog P2):
//   result_correction_requests — an accepted correction creates a NEW result
//   version (BRX-RESULT-04). FE is built ahead of the backend and stays behind
//   VITE_ENABLE_RESULT_CORRECTION.

export type CorrectionStatus = 'PENDING' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | string

export interface ResultCorrectionRequest {
  id: number
  reason: string
  status: CorrectionStatus
  createdAt: string
  responseNote?: string | null
  /** Set when an accepted request produced a new result version. */
  newResultVersion?: number | null
}

export const getResultCorrectionRequests = (projectId: number, signal?: AbortSignal) =>
  httpGet<ResultCorrectionRequest[]>(`/projects/${projectId}/result/correction-requests`, signal)

export const submitResultCorrectionRequest = (projectId: number, reason: string) =>
  httpPost<ResultCorrectionRequest, { reason: string }>(`/projects/${projectId}/result/correction-requests`, { reason })
