import { httpGet, httpPost } from '../../../services/http/http-client'

// BE-18 contract (BE_DongVV_Nhiem_vu.md, backlog P2):
//   Filter by capacity + expertise first, then rank; persist
//   supervisor_recommendation_runs / items. AI never creates a request or an
//   assignment on its own (BR-60–63). FE is built ahead of the backend and
//   stays behind VITE_ENABLE_SUPERVISOR_RECOMMENDATION.

export interface SupervisorRecommendationItem {
  /** Supervisor profile id, aligned with the selection candidate id when available. */
  supervisorId: number
  lecturerUserId?: number
  lecturerName: string
  departmentName?: string | null
  /** Normalised rank score in [0, 1]. */
  score: number
  matchedExpertise: string[]
  /** Remaining guidance slots, when the backend computes capacity. */
  availableCapacity?: number | null
  reasons: string[]
}

export interface SupervisorRecommendationRun {
  id: number
  projectId: number
  generatedAt: string
  engineVersion?: string | null
  items: SupervisorRecommendationItem[]
}

export const getSupervisorRecommendations = (projectId: number, signal?: AbortSignal) =>
  httpGet<SupervisorRecommendationRun>(`/projects/${projectId}/supervisor-recommendations`, signal)

/** Triggers a fresh ranking run. Advisory only — it never sends a request. */
export const generateSupervisorRecommendations = (projectId: number) =>
  httpPost<SupervisorRecommendationRun, Record<string, never>>(`/projects/${projectId}/supervisor-recommendations`, {})
