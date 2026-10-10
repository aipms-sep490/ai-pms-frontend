// BE-16 contract (BE_KhaiNQ_Nhiem_vu.md):
//   project_working_agreements(id, project_id, version, content_json, status, created_by, created_at)
//   agreement_acceptances(agreement_id, user_id, accepted_at)
// Period policy flag `require_working_agreement`; when on, moving the project to
// ACTIVE is blocked (422 WORKING_AGREEMENT_INCOMPLETE) until enough members accept.
// FE is built ahead of the backend and stays behind VITE_ENABLE_WORKING_AGREEMENT.

export type WorkingAgreementStatus = 'DRAFT' | 'ACTIVE' | 'SUPERSEDED'

export interface AgreementSection {
  title: string
  body: string
}

export interface AgreementAcceptance {
  userId: number
  userName?: string | null
  acceptedAt: string
}

export interface WorkingAgreement {
  id: number
  projectId: number
  version: number
  status: WorkingAgreementStatus
  /** Raw content as stored by the backend (`content_json`). Parsed defensively on the client. */
  contentJson: string
  createdBy?: number
  createdByName?: string | null
  createdAt: string
  acceptances: AgreementAcceptance[]
  /** Total members expected to accept, when the backend supplies it. */
  memberCount?: number
  /** Whether the current viewer has already accepted this version. */
  acceptedByMe?: boolean
  /** Whether the current period requires this agreement before the project goes ACTIVE. */
  required?: boolean
}
