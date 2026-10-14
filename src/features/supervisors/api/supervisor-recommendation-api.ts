import { httpGet, httpPost } from '../../../services/http/http-client'
import type { PagedResult, SupervisorCandidateDto } from '../../../types/backend'

// BE-18 contract — BACKEND_READY (AIPMS.Infrastructure/Services/Projects/SupervisorRecommendationService.cs).
// Advisory ranking only: filters candidates by capacity + frozen academic scope, then ranks by
// expertise match. Never creates a supervisor request or assignment (BR-60-63). GET (Preview) is a
// live, unpersisted read safe to call on every load/filter change. POST (Create) additionally
// persists an audit-trail run — it is append-only, there is no mutation/update token.

export type SupervisorRecommendationAssignmentType = 'PRIMARY' | 'DISCIPLINE_MENTOR'
/** `UNKNOWN` (candidate lists no expertise at all) is distinct from `NO_MATCH` (has expertise, none
 * of it matches the required majors) — do not collapse the two. */
export type SupervisorExpertiseStatus = 'MATCHED' | 'NO_MATCH' | 'UNKNOWN' | string

export interface SupervisorRecommendationQuery {
  assignmentType?: SupervisorRecommendationAssignmentType
  /** Required when assignmentType is DISCIPLINE_MENTOR; must stay unset for PRIMARY (backend 400s otherwise). */
  majorId?: number
  search?: string
  page?: number
  pageSize?: number
}

export interface SupervisorRecommendationItem {
  candidate: SupervisorCandidateDto
  /** Share of the project's required majors matched by expertise, in [0, 1]; 0 when there are none to score against. */
  score: number
  expertiseStatus: SupervisorExpertiseStatus
  matchedExpertise: string[]
  /** Fixed advisory tags from the engine (e.g. ELIGIBLE_AT_GENERATION, EXPERTISE_*, ADVISORY_ONLY) — informational, not a blocked-action reason code. */
  reasons: string[]
  /** Re-checked against the live selection only when reading a persisted run (history detail).
   * Preview and a just-created run always report true / no reasons. */
  currentlyEligible: boolean
  currentReasons: string[]
}

export interface SupervisorRecommendationPreview {
  engineVersion: string
  assignmentType: SupervisorRecommendationAssignmentType
  majorId: number | null
  generatedAt: string
  candidates: PagedResult<SupervisorRecommendationItem>
}

export interface SupervisorRecommendationRun {
  id: number
  projectId: number
  createdBy: number
  createdAt: string
  engineVersion: string
  assignmentType: SupervisorRecommendationAssignmentType
  majorId: number | null
  search: string | null
  page: number
  pageSize: number
  totalCount: number
  items: SupervisorRecommendationItem[]
}

export interface SupervisorRecommendationRunSummary {
  id: number
  createdAt: string
  createdBy: number
  assignmentType: SupervisorRecommendationAssignmentType
  majorId: number | null
  engineVersion: string
  itemCount: number
  totalCount: number
}

function toSearchParams(query?: SupervisorRecommendationQuery): string {
  const params = new URLSearchParams()
  if (query?.assignmentType) params.set('assignmentType', query.assignmentType)
  if (query?.majorId != null) params.set('majorId', String(query.majorId))
  if (query?.search) params.set('search', query.search)
  params.set('page', String(query?.page ?? 1))
  params.set('pageSize', String(query?.pageSize ?? 20))
  return params.toString()
}

/** Live, unpersisted ranking preview — the default read for the recommendation panel. */
export const previewSupervisorRecommendations = (
  projectId: number, query?: SupervisorRecommendationQuery, signal?: AbortSignal,
) => httpGet<SupervisorRecommendationPreview>(
  `/projects/${projectId}/supervisor-recommendations?${toSearchParams(query)}`, signal,
)

/** Persists an audit-trail run of the current ranking. Append-only: each call creates a new run. */
export const createSupervisorRecommendationRun = (projectId: number, query?: SupervisorRecommendationQuery) =>
  httpPost<SupervisorRecommendationRun, SupervisorRecommendationQuery>(
    `/projects/${projectId}/supervisor-recommendations`,
    {
      assignmentType: query?.assignmentType ?? 'PRIMARY',
      majorId: query?.majorId,
      search: query?.search,
      page: query?.page ?? 1,
      pageSize: query?.pageSize ?? 20,
    },
  )

export const getSupervisorRecommendationHistory = (
  projectId: number, page = 1, pageSize = 20, signal?: AbortSignal,
) => httpGet<PagedResult<SupervisorRecommendationRunSummary>>(
  `/projects/${projectId}/supervisor-recommendations/history?page=${page}&pageSize=${pageSize}`, signal,
)

export const getSupervisorRecommendationRun = (projectId: number, runId: number, signal?: AbortSignal) =>
  httpGet<SupervisorRecommendationRun>(`/projects/${projectId}/supervisor-recommendations/history/${runId}`, signal)
