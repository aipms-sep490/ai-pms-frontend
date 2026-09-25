import { HttpError, httpGet, httpPost, httpPut } from '../http/http-client'
import type { ProjectResult, ResultPolicy, ResultPreview } from '../../features/results/result-types'

export const getResultPolicy = (projectId: number, signal?: AbortSignal) => httpGet<ResultPolicy | null>(`/projects/${projectId}/result-policy`, signal)
export const configureResultPolicy = (projectId: number, input: { passThreshold: number; assignments: Array<{ assignmentId: number; weightPercent: number }>; concurrencyToken: string | null }) => httpPut<ResultPolicy>(`/projects/${projectId}/result-policy`, input)
export const getResultPreview = (projectId: number, signal?: AbortSignal) => httpGet<ResultPreview>(`/projects/${projectId}/result/preview`, signal)
export const publishProjectResult = (projectId: number, confirmationToken: string) => httpPost<ProjectResult>(`/projects/${projectId}/result`, { confirmationToken })
export async function getProjectResult(projectId: number, signal?: AbortSignal): Promise<ProjectResult | null> { try { return await httpGet<ProjectResult>(`/projects/${projectId}/result`, signal) } catch (reason) { if (reason instanceof HttpError && reason.status === 404) return null; throw reason } }
