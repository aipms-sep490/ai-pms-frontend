import { httpGet, httpPost, httpPut } from '../http/http-client'
import type { PagedResult } from '../../types/backend'
import type { EvaluationAssignment, EvaluationDraft, EvaluationScoreInput } from '../../features/evaluations/evaluation-types'

export const getMyEvaluationAssignments = (page = 1, pageSize = 20, signal?: AbortSignal) => httpGet<PagedResult<EvaluationAssignment>>(`/evaluation-assignments/my?page=${page}&pageSize=${pageSize}`, signal)
export const getProjectEvaluationAssignments = (projectId: number, status?: 'ACTIVE' | 'REVOKED', signal?: AbortSignal) => httpGet<PagedResult<EvaluationAssignment>>(`/projects/${projectId}/evaluation-assignments?page=1&pageSize=100${status ? `&status=${status}` : ''}`, signal)
export const createEvaluationDraft = (assignmentId: number) => httpPost<EvaluationDraft>(`/evaluation-assignments/${assignmentId}/evaluation`)
export const getEvaluationDraft = (evaluationId: number, signal?: AbortSignal) => httpGet<EvaluationDraft>(`/evaluations/${evaluationId}`, signal)
export const getProjectEvaluations = (projectId: number, signal?: AbortSignal) => httpGet<PagedResult<EvaluationDraft>>(`/projects/${projectId}/evaluations?page=1&pageSize=100`, signal)
export const saveEvaluationDraft = (evaluationId: number, body: { concurrencyToken: string; comments: string | null; scores: EvaluationScoreInput[] }) => httpPut<EvaluationDraft>(`/evaluations/${evaluationId}/draft`, body)
export const finalizeEvaluation = (evaluationId: number, concurrencyToken: string) => httpPost<EvaluationDraft>(`/evaluations/${evaluationId}/finalize`, { concurrencyToken })
