import type { WorkflowActionDto } from '../../types/backend'

// BE-16 contract — BACKEND_READY (AIPMS.Infrastructure/Services/Projects/WorkingAgreementService.cs):
//   project_working_agreements(id, project_id, version, content_json, status, created_by, created_at, concurrency_token)
//   agreement_acceptances(agreement_id, user_id, accepted_at) — a snapshot of the roster taken at publish
//   time; a member who joins after publish is not in it until the leader publishes a new version.
// Period policy flag `require_working_agreement` drives `readiness`/`required`; when set, moving the
// project to ACTIVE is blocked (422 WORKING_AGREEMENT_INCOMPLETE) until enough members accept.
//
// Action codes are fixed and backend-authoritative: `manage_working_agreement`, `publish_working_agreement`,
// `accept_working_agreement`. Always gate UI through `actions` (isActionAllowed/getActionReasons from
// `types/backend`), never by inferring capability from role, `acceptedByMe`, or other local state.
export const WORKING_AGREEMENT_ACTIONS = {
  manage: 'manage_working_agreement',
  publish: 'publish_working_agreement',
  accept: 'accept_working_agreement',
} as const

export type WorkingAgreementStatus = 'DRAFT' | 'ACTIVE' | 'SUPERSEDED'

export interface AgreementSection {
  title: string
  body: string
}

/** Backend never resolves a display name for an acceptance; render by `userId`. */
export interface AgreementAcceptance {
  userId: number
  acceptedAt: string
}

export interface WorkingAgreementReadiness {
  required: boolean
  policyVersionId?: number | null
  status?: string | null
  reasons?: string[] | null
}

export interface WorkingAgreement {
  id: number
  projectId: number
  version: number
  status: WorkingAgreementStatus
  /** Raw content as stored by the backend (`content_json`). Parsed defensively on the client. */
  contentJson: string
  createdBy?: number
  createdAt: string
  /** Opaque row token (GUID "N"). Required on accept/publish, and on a draft edit of the same
   * row; must be omitted when the save creates a brand-new successor version. */
  concurrencyToken: string
  acceptances: AgreementAcceptance[]
  /** Total members expected to accept (current roster size at publish time). */
  memberCount: number
  /** Whether the current viewer has already accepted this version. */
  acceptedByMe: boolean
  /** Whether the current period policy requires this agreement before the project goes ACTIVE. */
  required: boolean
  readiness: WorkingAgreementReadiness
  /** Backend-authoritative capability signal — see module note above. */
  actions: WorkflowActionDto[]
}
