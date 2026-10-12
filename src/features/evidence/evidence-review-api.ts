import { httpGet, httpPost } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'
import type { EvidenceReview, EvidenceReviewDecision, EvidenceReviewTarget } from './evidence-review-types'

export const getEvidenceReviewTarget = (evidenceId: number, sourceVersionId?: number, signal?: AbortSignal) =>
  httpGet<EvidenceReviewTarget>(`/project-evidence/${evidenceId}/review-target${sourceVersionId != null ? `?sourceVersionId=${sourceVersionId}` : ''}`, signal)

export const getEvidenceReviews = (evidenceId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<EvidenceReview>>(`/project-evidence/${evidenceId}/reviews?page=${page}&pageSize=${pageSize}`, signal)

export const reviewEvidence = (evidenceId: number, body: {
  sourceVersionId: number | null; expectedSourceVersion: string; expectedLatestReviewId: number
  decision: EvidenceReviewDecision; reason: string
}) => httpPost<EvidenceReview>(`/project-evidence/${evidenceId}/reviews`, body)
