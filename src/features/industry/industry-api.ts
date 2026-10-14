import { httpGet, httpGetBlob, httpPost } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'
import type { GoogleChallenge } from '../auth/api/auth-api'
import type { LoginSession } from '../auth/types/auth.types'

// BE Industry Advisory contract — BACKEND_READY (AIPMS.Api/Controllers/IndustryController.cs,
// AIPMS.Infrastructure/Services/Projects/IndustryService*.cs, IndustryEnrollmentController.cs).
// Advisory only: an expert never gets an academic role, never scores, and `AdvisoryOnly` is always
// true server-side on an assignment/feedback entry. Covers admin invitations, the lead's project
// assignment + evidence sharing, the expert's own portal, and the Google enrollment exchange that
// turns an emailed invitation into a signed-in zero-role session.

export type ExpertInvitationStatus = 'PENDING' | 'CONSUMED' | 'EXPIRED' | 'REVOKED'

export interface ExpertInvitation {
  id: number
  expertId: number
  email: string
  status: ExpertInvitationStatus
  expiresAt: string
}

export const getIndustryInvitations = (page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<ExpertInvitation>>(`/admin/industry/invitations?page=${page}&pageSize=${pageSize}`, signal)

/** The enrollment secret is delivered only by email — the response never carries it. */
export const inviteIndustryExpert = (body: { email: string; fullName: string; organization: string }) =>
  httpPost<ExpertInvitation>('/admin/industry/invitations', body)

export const revokeIndustryInvitation = (id: number) =>
  httpPost<ExpertInvitation>(`/admin/industry/invitations/${id}/revoke`, {})

export type IndustryAssignmentScope = 'COMMON' | 'MAJOR_SPECIFIC'
export type IndustryAssignmentStatus = 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'REVOKED'

/** `allowedActions` is a plain action-code list (not {code,allowed,reasons}) — check with
 * `hasIndustryAction`. SHARE/REVOKE/UNSHARE are lead-only; SUBMIT_FEEDBACK is the expert-only. */
export interface IndustryAssignment {
  id: number
  projectId: number
  projectCode: string
  projectTitle: string
  expertId: number
  scope: IndustryAssignmentScope
  majorId: number | null
  startsAt: string
  endsAt: string
  status: IndustryAssignmentStatus
  concurrencyToken: string
  allowedActions: string[]
  /** Always true server-side — an industry assignment never carries scoring weight. */
  advisoryOnly: true
}

export const hasIndustryAction = (assignment: Pick<IndustryAssignment, 'allowedActions'>, code: string) =>
  assignment.allowedActions.includes(code)

/** Lead-only. COMMON must omit majorId; MAJOR_SPECIFIC requires one inside the project's frozen scope. */
export const assignIndustryExpert = (projectId: number, body: {
  expertId: number; scope: IndustryAssignmentScope; majorId?: number; startsAt: string; endsAt: string
}) => httpPost<IndustryAssignment>(`/projects/${projectId}/industry-assignments`, body)

/** Lead-only: every assignment on this project. */
export const getProjectIndustryAssignments = (projectId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<IndustryAssignment>>(`/projects/${projectId}/industry-assignments?page=${page}&pageSize=${pageSize}`, signal)

/** Expert-only: the caller's own currently-live assignments. */
export const getMyIndustryAssignments = (page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<IndustryAssignment>>(`/industry/assignments?page=${page}&pageSize=${pageSize}`, signal)

/** Readable by the assigned expert (while live) or the project's lead. */
export const getIndustryAssignment = (id: number, signal?: AbortSignal) =>
  httpGet<IndustryAssignment>(`/industry/assignments/${id}`, signal)

export const revokeIndustryAssignment = (id: number, concurrencyToken: string) =>
  httpPost<IndustryAssignment>(`/industry/assignments/${id}/revoke`, { concurrencyToken })

export interface IndustryEvidenceFile {
  id: number
  fileId: number
  deliverableVersionId: number
  fileName: string
  contentType: string
  sizeBytes: number
  sha256: string
  downloadUrl: string
}

/** Lead-only. Shares one exact deliverable-version file; individual/private evidence outside the
 * assignment's scope (COMMON vs the assignment's major) is rejected server-side (403). */
export const shareIndustryEvidence = (assignmentId: number, body: { concurrencyToken: string; deliverableVersionId: number; fileId: number }) =>
  httpPost<IndustryEvidenceFile>(`/industry/assignments/${assignmentId}/evidence`, body)

/** Readable by the assigned expert (while live) or the project's lead. */
export const getIndustryEvidence = (assignmentId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<IndustryEvidenceFile>>(`/industry/assignments/${assignmentId}/evidence?page=${page}&pageSize=${pageSize}`, signal)

/** Lead-only. */
export const unshareIndustryEvidence = (assignmentId: number, shareId: number, concurrencyToken: string) =>
  httpPost<IndustryAssignment>(`/industry/assignments/${assignmentId}/evidence/${shareId}/revoke`, { concurrencyToken })

export const downloadIndustryEvidenceFile = (assignmentId: number, shareId: number, signal?: AbortSignal) =>
  httpGetBlob(`/industry/assignments/${assignmentId}/evidence/${shareId}/download`, { signal })

/** Versioned, append-only feedback — `supersedesVersion` is the prior version, null for the first. */
export interface IndustryFeedback {
  id: number
  version: number
  supersedesVersion: number | null
  content: string
  submittedBy: number
  submittedAt: string
  advisoryOnly: true
}

/** Expert-only. `expectedVersion` is the latest existing version (0 for the first submission). */
export const submitIndustryFeedback = (assignmentId: number, body: { concurrencyToken: string; expectedVersion: number; content: string }) =>
  httpPost<IndustryFeedback>(`/industry/assignments/${assignmentId}/feedback`, body)

/** Readable by the assigned expert (while live) or the project's lead. */
export const getIndustryFeedbackHistory = (assignmentId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<IndustryFeedback>>(`/industry/assignments/${assignmentId}/feedback?page=${page}&pageSize=${pageSize}`, signal)

// Google enrollment (anonymous, IndustryEnrollmentController.cs). The challenge sets an HttpOnly
// cookie scoped to /api/v1/auth/industry, bound to this browser; the browser sends it automatically
// (http-client always uses credentials:'include'). `GoogleChallenge`/`LoginSession` are the same
// shapes the existing student/staff Google login already uses — the backend returns the identical
// DTOs for both flows.
export const getIndustryGoogleChallenge = (): Promise<GoogleChallenge> =>
  httpPost('/auth/industry/google/challenge', {}, { skipAuthRefresh: true })

/** `invitationToken` is the 64-char secret from the emailed invitation link's URL fragment
 * (`#invitation=...`) — never sent to any server in a query string or referrer. */
export const enrollIndustryGoogle = (challengeId: string, idToken: string, invitationToken: string): Promise<LoginSession> =>
  httpPost('/auth/industry/google/enroll', { challengeId, idToken, invitationToken }, { skipAuthRefresh: true })
