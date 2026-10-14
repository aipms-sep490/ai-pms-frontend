import { httpGet, httpPost } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'

// BE Industry Advisory contract — BACKEND_READY (AIPMS.Api/Controllers/IndustryController.cs,
// AIPMS.Infrastructure/Services/Projects/IndustryService*.cs). Advisory only: an expert never gets
// an academic role, never scores, and `AdvisoryOnly` is always true server-side on an assignment/
// feedback entry. This file covers the admin invitation surface (Invite/Invitations/Revoke) — the
// lead's project assignment screen and the expert's own portal (evidence sharing, feedback, Google
// enrollment) are a separate, tracked follow-up.

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
