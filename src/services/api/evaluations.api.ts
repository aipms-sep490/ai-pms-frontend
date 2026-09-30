import { httpDelete, httpGet, httpPost, httpPut } from '../http/http-client'
import type { PagedResult } from '../../types/backend'
import type { EvaluationAssignment, EvaluationDraft, EvaluationScheme, EvaluationScope, EvaluationScoreInput } from '../../features/evaluations/evaluation-types'

export interface EligibleEvaluator {
  userId: number
  displayName: string
  departmentId: number
  departmentName: string
  evaluationTypes: Array<'SUPERVISOR' | 'LECTURER'>
}

export const getMyEvaluationAssignments = (page = 1, pageSize = 20, signal?: AbortSignal) => httpGet<PagedResult<EvaluationAssignment>>(`/evaluation-assignments/my?page=${page}&pageSize=${pageSize}`, signal)
export const getProjectEvaluationAssignments = (projectId: number, status?: 'ACTIVE' | 'REVOKED', signal?: AbortSignal) => httpGet<PagedResult<EvaluationAssignment>>(`/projects/${projectId}/evaluation-assignments?page=1&pageSize=100${status ? `&status=${status}` : ''}`, signal)
export interface EvaluationTarget { componentId: number; scope: EvaluationScope; majorId: number | null; studentId: number | null }
export const getEvaluationSchemes = (projectId: number, signal?: AbortSignal) => httpGet<EvaluationScheme[]>(`/evaluation-schemes?projectId=${projectId}`, signal)
export interface EvaluationSchemeComponentInput {
  name: string
  scope: EvaluationScope
  majorId: number | null
  rubricId: number
  projectWeightPercent: number
  studentWeightPercent: number
  requiredEvaluators: number
}
export interface SaveEvaluationSchemeInput {
  projectId: number
  projectPeriodId: number
  name: string
  passThreshold: number
  components: EvaluationSchemeComponentInput[]
  concurrencyToken?: string
}
export const createEvaluationScheme = (body: SaveEvaluationSchemeInput) => httpPost<EvaluationScheme>('/evaluation-schemes', body)
export const updateEvaluationScheme = (id: number, body: SaveEvaluationSchemeInput) => httpPut<EvaluationScheme>(`/evaluation-schemes/${id}`, body)
export const publishEvaluationScheme = (id: number, concurrencyToken: string) => httpPost<EvaluationScheme>(`/evaluation-schemes/${id}/publish`, { concurrencyToken })
export const createEvaluationSchemeVersion = (id: number, concurrencyToken: string) => httpPost<EvaluationScheme>(`/evaluation-schemes/${id}/versions`, { concurrencyToken })
export const deleteEvaluationScheme = (id: number, concurrencyToken: string) => httpDelete(`/evaluation-schemes/${id}?concurrencyToken=${encodeURIComponent(concurrencyToken)}`)
export const getEligibleEvaluators = (projectId: number, periodId: number, target: EvaluationTarget, page = 1, pageSize = 100, signal?: AbortSignal) => httpGet<PagedResult<EligibleEvaluator>>(`/projects/${projectId}/eligible-evaluators?${new URLSearchParams({ periodId: String(periodId), componentId: String(target.componentId), scope: target.scope, ...(target.majorId !== null ? { majorId: String(target.majorId) } : {}), ...(target.studentId !== null ? { studentId: String(target.studentId) } : {}), page: String(page), pageSize: String(pageSize) })}`, signal)
export const assignEvaluator = (projectId: number, body: { evaluatorId: number; projectPeriodId: number; evaluationType: 'SUPERVISOR' | 'LECTURER' } & EvaluationTarget) => httpPost<EvaluationAssignment>(`/projects/${projectId}/evaluation-assignments`, body)
export const revokeEvaluator = (assignmentId: number, concurrencyToken: string, reason: string) => httpPost<EvaluationAssignment>(`/evaluation-assignments/${assignmentId}/revoke`, { concurrencyToken, reason })
export const createEvaluationDraft = (assignmentId: number) => httpPost<EvaluationDraft>(`/evaluation-assignments/${assignmentId}/evaluation`)
export const getEvaluationDraft = (evaluationId: number, signal?: AbortSignal) => httpGet<EvaluationDraft>(`/evaluations/${evaluationId}`, signal)
export const getProjectEvaluations = (projectId: number, signal?: AbortSignal) => httpGet<PagedResult<EvaluationDraft>>(`/projects/${projectId}/evaluations?page=1&pageSize=100`, signal)
export const saveEvaluationDraft = (evaluationId: number, body: { concurrencyToken: string; comments: string | null; scores: EvaluationScoreInput[] }) => httpPut<EvaluationDraft>(`/evaluations/${evaluationId}/draft`, body)
export const finalizeEvaluation = (evaluationId: number, concurrencyToken: string) => httpPost<EvaluationDraft>(`/evaluations/${evaluationId}/finalize`, { concurrencyToken })
