import { httpGet, httpGetBlob, httpPost, httpPostForm } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'

// BE Appeals contract — BACKEND_READY (AIPMS.Infrastructure/Services/Projects/ResultAppealService.cs,
// AIPMS.Api/Controllers/ResultAppealsController.cs). A request targets one scored component of one
// specific published result version, inside an explicit open window the lead department opened for
// that exact target+version — there is no open-ended "appeal anytime" path. `appeal-policy` is a
// recorded real academic approval source, never a default/demo one (RecordPolicy rejects a blank
// reference). This file covers the student-facing surface (policy/window read, create, evidence
// upload, own list/history); reviewer assignment, review and the lead's accept/reject decision are a
// tracked follow-up (staff/reviewer screen), same as the lead's policy/window authoring.

export interface AppealPolicy {
  id: number
  projectId: number
  version: number
  approvalReference: string
  recordedBy: number
  recordedAt: string
}

export interface AppealWindowTarget {
  targetType: 'PROJECT' | 'STUDENT'
  studentId: number | null
  resultVersion: number
}

export interface AppealWindow {
  id: number
  policyId: number
  status: 'SCHEDULED' | 'OPEN' | 'EXPIRED' | 'CLOSED'
  opensAt: string
  closesAt: string
  concurrencyToken: string
  targets: AppealWindowTarget[]
}

export interface AppealFile {
  fileId: number
  fileName: string
  contentType: string
  sizeBytes: number
  sha256: string
  downloadUrl: string
}

export type CorrectionRequestStatus = 'PENDING' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | (string & {})

/** `allowedActions` is a plain list of currently-permitted action codes (e.g. `UPLOAD`), not a
 * {code,allowed,reasons} map — check with `hasCorrectionAction`. `blockers` explains why an action a
 * reader might expect (e.g. a stale published result) isn't offered right now. */
export interface CorrectionRequest {
  id: number
  projectId: number
  source: 'STUDENT_APPEAL' | 'STAFF_CORRECTION' | (string & {})
  targetType: 'PROJECT' | 'STUDENT'
  studentId: number | null
  resultVersion: number
  componentId: number
  scope: string
  majorId: number | null
  status: CorrectionRequestStatus
  requestedBy: number
  reviewerId: number | null
  reason: string
  proposal: string | null
  reviewReason: string | null
  decisionReason: string | null
  concurrencyToken: string
  allowedActions: string[]
  blockers: string[]
  files: AppealFile[]
}

export interface AppealEvent {
  id: number
  action: string
  actorId: number
  at: string
  reason: string | null
  bundleId: number | null
}

export const hasCorrectionAction = (request: Pick<CorrectionRequest, 'allowedActions'>, code: string) =>
  request.allowedActions.includes(code)

export const getAppealPolicy = (projectId: number, signal?: AbortSignal) =>
  httpGet<AppealPolicy | null>(`/projects/${projectId}/result/appeal-policy`, signal)

export const getAppealWindows = (projectId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<AppealWindow>>(`/projects/${projectId}/result/appeal-windows?page=${page}&pageSize=${pageSize}`, signal)

/** Server-scoped: a student sees only their own `STUDENT_APPEAL` requests. */
export const getCorrectionRequests = (projectId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<CorrectionRequest>>(`/projects/${projectId}/result/correction-requests?page=${page}&pageSize=${pageSize}`, signal)

export const getCorrectionRequest = (projectId: number, id: number, signal?: AbortSignal) =>
  httpGet<CorrectionRequest>(`/projects/${projectId}/result/correction-requests/${id}`, signal)

export const createCorrectionRequest = (projectId: number, body: {
  policyId: number; windowId: number; studentId: number; resultVersion: number; componentId: number; reason: string
}) => httpPost<CorrectionRequest>(`/projects/${projectId}/result/correction-requests`, {
  source: 'STUDENT_APPEAL', policyId: body.policyId, windowId: body.windowId,
  targetType: 'STUDENT', studentId: body.studentId, resultVersion: body.resultVersion,
  componentId: body.componentId, reason: body.reason,
})

export const getCorrectionRequestHistory = (projectId: number, id: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<AppealEvent>>(`/projects/${projectId}/result/correction-requests/${id}/history?page=${page}&pageSize=${pageSize}`, signal)

export const uploadCorrectionRequestFile = (projectId: number, id: number, file: File, concurrencyToken: string) => {
  const form = new FormData()
  form.append('file', file)
  form.append('concurrencyToken', concurrencyToken)
  return httpPostForm<CorrectionRequest>(`/projects/${projectId}/result/correction-requests/${id}/files`, form)
}

export const downloadCorrectionRequestFile = (projectId: number, id: number, fileId: number, signal?: AbortSignal) =>
  httpGetBlob(`/projects/${projectId}/result/correction-requests/${id}/files/${fileId}`, { signal })
