import { httpGet, httpPost, httpPut } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'
import type { CheckpointDecisionValue, CheckpointEvidenceRef, ProjectCheckpoint } from './gates-types'

export const getProjectCheckpoints = (projectId: number, page = 1, pageSize = 50, signal?: AbortSignal) =>
  httpGet<PagedResult<ProjectCheckpoint>>(`/projects/${projectId}/checkpoints?page=${page}&pageSize=${pageSize}`, signal)

export const createCheckpoint = (projectId: number, body: { title: string; majorId: number | null; plannedAt: string }) =>
  httpPost<ProjectCheckpoint>(`/projects/${projectId}/checkpoints`, body)

export const updateCheckpoint = (projectId: number, id: number, body: { title: string; majorId: number | null; plannedAt: string; concurrencyToken: string }) =>
  httpPut<ProjectCheckpoint>(`/projects/${projectId}/checkpoints/${id}`, body)

/** Evidence citations require a reviewed project-evidence record (review-target → reviews flow);
 * until that is wired here, decisions are recorded with an empty evidence list. */
export const decideCheckpoint = (id: number, body: { concurrencyToken: string; decision: CheckpointDecisionValue; reason: string; evidence: CheckpointEvidenceRef[] }) =>
  httpPost<ProjectCheckpoint>(`/checkpoints/${id}/decisions`, body)
