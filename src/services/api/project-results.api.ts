import { HttpError, httpGet, httpGetBlob, httpPost, httpPut } from '../http/http-client'
import type { PagedResult } from '../../types/backend'
import type { BatchPublishResult, ProjectResult, ResultPolicy, ResultPreview, ResultRevisionSummary, StudentDefenseAbsence, StudentResult } from '../../features/results/result-types'

function isUnpublishedResultError(reason: unknown): boolean {
  if (!(reason instanceof HttpError)) return false
  if (reason.status === 404) return true
  if (reason.status === 403) {
    const code = reason.problem?.code ?? reason.problem?.errorCode
    return code === 'RESULT_NOT_PUBLISHED'
  }
  return false
}

export const getResultPolicy = (projectId: number, signal?: AbortSignal) => httpGet<ResultPolicy | null>(`/projects/${projectId}/result-policy`, signal)
export const configureResultPolicy = (projectId: number, input: { passThreshold: number; assignments: Array<{ assignmentId: number; weightPercent: number }>; concurrencyToken: string | null }) => httpPut<ResultPolicy>(`/projects/${projectId}/result-policy`, input)
export const getResultPreview = (projectId: number, signal?: AbortSignal) => httpGet<ResultPreview>(`/projects/${projectId}/result/preview`, signal)
export const publishProjectResult = (projectId: number, confirmationToken: string) => httpPost<ProjectResult>(`/projects/${projectId}/result`, { confirmationToken })
export const publishBatchResults = (projectId: number, confirmationToken: string) => httpPost<BatchPublishResult>(`/projects/${projectId}/results/publish-batch`, { confirmationToken })
export const recordStudentDefenseAbsence = (projectId: number, studentId: number, input: { reason: string; minutesReference?: string | null }) => httpPost<StudentDefenseAbsence>(`/projects/${projectId}/students/${studentId}/defense-absence`, input)
export const getStudentResultPreview = (projectId: number, studentId: number) => httpGet<ResultPreview>(`/projects/${projectId}/students/${studentId}/result/preview`)
export const publishStudentResult = (projectId: number, studentId: number, confirmationToken: string) => httpPost<StudentResult>(`/projects/${projectId}/students/${studentId}/result`, { confirmationToken })
export async function getProjectResult(projectId: number, signal?: AbortSignal): Promise<ProjectResult | null> { try { return await httpGet<ProjectResult>(`/projects/${projectId}/result`, signal) } catch (reason) { if (isUnpublishedResultError(reason)) return null; throw reason } }
export async function getStudentResult(projectId: number, studentId: number, signal?: AbortSignal): Promise<StudentResult | null> { try { return await httpGet<StudentResult>(`/projects/${projectId}/students/${studentId}/result`, signal) } catch (reason) { if (isUnpublishedResultError(reason)) return null; throw reason } }
export async function getProjectStudentResults(projectId: number, signal?: AbortSignal): Promise<StudentResult[] | null> { try { return await httpGet<StudentResult[]>(`/projects/${projectId}/student-results`, signal) } catch (reason) { if (isUnpublishedResultError(reason)) return null; throw reason } }

// BE result-history endpoints (ResultHistoryController) — read-only, published-version history.
// Version 1 is always the original publication; a later version exists only after an accepted
// correction. The history list is redacted (no raw inputs/correction notes); the full DTO is only
// available per version via getProjectResultVersion/getStudentResultVersion.
export const getProjectResultHistory = (projectId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<ResultRevisionSummary>>(`/projects/${projectId}/result/history?page=${page}&pageSize=${pageSize}`, signal)
export const getProjectResultVersion = (projectId: number, version: number, signal?: AbortSignal) =>
  httpGet<ProjectResult>(`/projects/${projectId}/result/versions/${version}`, signal)
export const getStudentResultHistory = (projectId: number, studentId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<ResultRevisionSummary>>(`/projects/${projectId}/students/${studentId}/result/history?page=${page}&pageSize=${pageSize}`, signal)
export const getStudentResultVersion = (projectId: number, studentId: number, version: number, signal?: AbortSignal) =>
  httpGet<StudentResult>(`/projects/${projectId}/students/${studentId}/result/versions/${version}`, signal)

export function exportDepartmentResultsReconciliation(
  filters: { semesterId?: number; majorId?: number; format?: 'xlsx' | 'csv'; search?: string } = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams()
  if (filters.semesterId) params.set('semesterId', String(filters.semesterId))
  if (filters.majorId) params.set('majorId', String(filters.majorId))
  params.set('format', filters.format ?? 'xlsx')
  if (filters.search?.trim()) params.set('search', filters.search.trim())
  return httpGetBlob(`/departments/me/results/export?${params.toString()}`, { signal })
}
