import { httpGet, httpGetBlob, httpPost } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'

// BE Industry Advisory contract — BACKEND_READY (AIPMS.Api/Controllers/IndustryController.cs,
// AIPMS.Infrastructure/Services/Projects/IndustryService*.cs). Advisory only: an expert never gets
// an academic role, never scores, and `AdvisoryOnly` is always true server-side on an assignment/
// feedback entry.

export type ExpertInvitationStatus = 'PENDING' | 'CONSUMED' | 'EXPIRED' | 'REVOKED'

export interface ExpertInvitation {
  id: number
  expertId: number
  email: string
  status: ExpertInvitationStatus
  expiresAt: string
}

export type IndustryScope = 'COMMON' | 'MAJOR_SPECIFIC'

export interface IndustryAssignment {
  id: number
  projectId: number
  projectCode: string
  projectTitle: string
  expertId: number
  scope: IndustryScope
  majorId: number | null
  startsAt: string
  endsAt: string
  status: string
  concurrencyToken: string
  allowedActions: string[]
  advisoryOnly: boolean
}

export interface AssignIndustryRequest {
  expertId: number
  scope: IndustryScope
  majorId?: number | null
  startsAt: string
  endsAt: string
}

export interface IndustryFile {
  id: number
  fileId: number
  deliverableVersionId: number
  fileName: string
  contentType: string
  sizeBytes: number
  sha256: string
  downloadUrl: string
}

export interface ShareIndustryFileRequest {
  concurrencyToken: string
  deliverableVersionId: number
  fileId: number
}

export interface IndustryFeedback {
  id: number
  version: number
  supersedesVersion: number | null
  content: string
  submittedBy: number
  submittedAt: string
  advisoryOnly: boolean
}

export interface IndustryFeedbackRequest {
  concurrencyToken: string
  expectedVersion: number
  content: string
}

export interface GoogleChallenge {
  challengeId: string
  nonce: string
}

export interface IndustryEnrollmentInput {
  challengeId: string
  idToken: string
  invitationToken: string
}

export interface IndustryLoginResponse {
  token: string
  user: {
    id: number
    email: string
    fullName: string
    roles: string[]
  }
}

export const getIndustryInvitations = (page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<ExpertInvitation>>(`/admin/industry/invitations?page=${page}&pageSize=${pageSize}`, signal)

/** The enrollment secret is delivered only by email — the response never carries it. */
export const inviteIndustryExpert = (body: { email: string; fullName: string; organization: string }) =>
  httpPost<ExpertInvitation>('/admin/industry/invitations', body)

export const revokeIndustryInvitation = (id: number) =>
  httpPost<ExpertInvitation>(`/admin/industry/invitations/${id}/revoke`, {})

export const getProjectIndustryAssignments = (projectId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<IndustryAssignment>>(`/projects/${projectId}/industry-assignments?page=${page}&pageSize=${pageSize}`, signal)

export const getMyIndustryAssignments = (page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<IndustryAssignment>>(`/industry/assignments?page=${page}&pageSize=${pageSize}`, signal)

export const getIndustryAssignment = (id: number, signal?: AbortSignal) =>
  httpGet<IndustryAssignment>(`/industry/assignments/${id}`, signal)

export const assignIndustryExpert = (projectId: number, body: AssignIndustryRequest) =>
  httpPost<IndustryAssignment>(`/projects/${projectId}/industry-assignments`, body)

export const revokeIndustryAssignment = (id: number, concurrencyToken: string) =>
  httpPost<IndustryAssignment>(`/industry/assignments/${id}/revoke`, { concurrencyToken })

export const shareIndustryFile = (assignmentId: number, body: ShareIndustryFileRequest) =>
  httpPost<IndustryFile>(`/industry/assignments/${assignmentId}/evidence`, body)

export const getIndustrySharedFiles = (assignmentId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<IndustryFile>>(`/industry/assignments/${assignmentId}/evidence?page=${page}&pageSize=${pageSize}`, signal)

export const revokeIndustrySharedFile = (assignmentId: number, shareId: number, concurrencyToken: string) =>
  httpPost<IndustryAssignment>(`/industry/assignments/${assignmentId}/evidence/${shareId}/revoke`, { concurrencyToken })

export const downloadIndustrySharedFile = (assignmentId: number, shareId: number, signal?: AbortSignal) =>
  httpGetBlob(`/industry/assignments/${assignmentId}/evidence/${shareId}/download`, { signal })

export const submitIndustryFeedback = (assignmentId: number, body: IndustryFeedbackRequest) =>
  httpPost<IndustryFeedback>(`/industry/assignments/${assignmentId}/feedback`, body)

export const getIndustryFeedbackHistory = (assignmentId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<IndustryFeedback>>(`/industry/assignments/${assignmentId}/feedback?page=${page}&pageSize=${pageSize}`, signal)

export const getIndustryGoogleChallenge = (signal?: AbortSignal) =>
  httpPost<GoogleChallenge>('/auth/industry/google/challenge', {}, { signal })

export const enrollIndustryGoogle = (body: IndustryEnrollmentInput) =>
  httpPost<IndustryLoginResponse>('/auth/industry/google/enroll', body)
