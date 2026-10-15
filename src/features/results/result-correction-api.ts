import { httpGet, httpGetBlob, httpPost, httpPostForm, httpPut } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'
import type { EvaluationScore } from '../evaluations/evaluation-types'
import type { ResultRevisionSummary } from './result-types'

export type CorrectionStatus = 'PENDING' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | (string & {})
export interface AppealTarget { targetType: 'PROJECT' | 'STUDENT'; studentId: number | null; resultVersion: number }
export interface AppealPolicy { id: number; projectId: number; version: number; approvalReference: string; recordedBy: number; recordedAt: string }
export interface AppealWindow { id: number; policyId: number; status: string; opensAt: string; closesAt: string; concurrencyToken: string; targets: AppealTarget[] }
export interface AppealFile { fileId: number; fileName: string; contentType: string; sizeBytes: number; sha256: string; downloadUrl: string }
export interface ResultCorrectionRequest extends AppealTarget {
  id: number; projectId: number; source: string; componentId: number; scope: string; majorId: number | null
  status: CorrectionStatus; requestedBy: number; reviewerId: number | null; reason: string
  proposal: string | null; reviewReason: string | null; decisionReason: string | null; concurrencyToken: string
  allowedActions: string[]; blockers: string[]; files: AppealFile[]
}
export interface CreateCorrectionRequest extends AppealTarget { source: 'STUDENT_APPEAL' | 'STAFF_CORRECTION'; policyId: number; windowId: number | null; componentId: number; reason: string }
export interface ScoreAmendment { evaluationId: number; criterionId: number; score: number; reason: string }
export interface AppealEvent { id: number; action: string; actorId: number; at: string; reason: string | null; bundleId: number | null; amendments: ScoreAmendment[] }
export interface AppealPreview { confirmationToken: string; affectedResults: ResultRevisionSummary[] }
export interface AppealReviewContext {
  requestId: number; componentId: number; scope: string; majorId: number | null; studentId: number | null; calculationVersion: string
  evaluations: Array<{ id: number; assignmentId: number; evaluatorId: number; rubricId: number; rubricName: string; rubricVersion: number; totalScore: number | null; scores: EvaluationScore[] }>
  amendments: ScoreAmendment[]
}
const root = (p: number) => `/projects/${p}/result`
const request = (p: number, id: number) => `${root(p)}/correction-requests/${id}`
export const getAppealPolicy = (p: number, signal?: AbortSignal) => httpGet<AppealPolicy | null>(`${root(p)}/appeal-policy`, signal)
export const recordAppealPolicy = (p: number, expectedVersion: number, approvalReference: string) => httpPost<AppealPolicy>(`${root(p)}/appeal-policy`, { expectedVersion, approvalReference })
export const getAppealWindows = (p: number, page = 1, signal?: AbortSignal) => httpGet<PagedResult<AppealWindow>>(`${root(p)}/appeal-windows?page=${page}&pageSize=20`, signal)
export const openAppealWindow = (p: number, body: { policyId: number; opensAt: string; closesAt: string; targets: AppealTarget[] }) => httpPost<AppealWindow>(`${root(p)}/appeal-windows`, body)
export const closeAppealWindow = (p: number, id: number, concurrencyToken: string) => httpPost<AppealWindow>(`${root(p)}/appeal-windows/${id}/close`, { concurrencyToken })
export const getResultCorrectionRequests = (p: number, page = 1, signal?: AbortSignal) => httpGet<PagedResult<ResultCorrectionRequest>>(`${root(p)}/correction-requests?page=${page}&pageSize=20`, signal)
export const submitResultCorrectionRequest = (p: number, body: CreateCorrectionRequest) => httpPost<ResultCorrectionRequest>(`${root(p)}/correction-requests`, body)
export const getCorrectionRequest = (p: number, id: number, signal?: AbortSignal) => httpGet<ResultCorrectionRequest>(request(p, id), signal)
export const assignAppealReviewer = (p: number, id: number, concurrencyToken: string, reviewerId: number) => httpPost<ResultCorrectionRequest>(`${request(p, id)}/reviewer`, { concurrencyToken, reviewerId })
export const getAppealReviewContext = (p: number, id: number, signal?: AbortSignal) => httpGet<AppealReviewContext>(`${request(p, id)}/review`, signal)
export const reviewAppeal = (p: number, id: number, body: { concurrencyToken: string; proposal: 'KEEP' | 'AMEND'; reason: string; amendments: ScoreAmendment[] }) => httpPut<ResultCorrectionRequest>(`${request(p, id)}/review`, body)
export const previewAppeal = (p: number, id: number) => httpGet<AppealPreview>(`${request(p, id)}/preview`)
export const decideAppeal = (p: number, id: number, body: { concurrencyToken: string; decision: 'ACCEPTED' | 'REJECTED'; reason: string; confirmationToken: string | null }) => httpPost<ResultCorrectionRequest>(`${request(p, id)}/decision`, body)
export const getAppealHistory = (p: number, id: number, page = 1, signal?: AbortSignal) => httpGet<PagedResult<AppealEvent>>(`${request(p, id)}/history?page=${page}&pageSize=20`, signal)
export const getAppealEvidence = (p: number, id: number, signal?: AbortSignal) => httpGet<AppealFile[]>(`${request(p, id)}/evidence`, signal)
export const downloadAppealFile = (p: number, id: number, fileId: number, frozenEvidence = false) => httpGetBlob(`${request(p, id)}/${frozenEvidence ? 'evidence' : 'files'}/${fileId}`)
export const uploadAppealFile = (p: number, id: number, concurrencyToken: string, file: File) => {
  const body = new FormData(); body.append('ConcurrencyToken', concurrencyToken); body.append('File', file)
  return httpPostForm<ResultCorrectionRequest>(`${request(p, id)}/files`, body)
}
