import type { WorkflowActionDto } from '../../types/backend'

// Merged BE ProjectCapabilitiesDto (PR #112), not the earlier FE-first map.
// GET /api/v1/projects/{id}/my-capabilities; see docs/v5-academic-authority.md in BE.

/** Stable blocked-reason codes agreed with BE-10. Kept open-ended: unknown codes
 * fall back to a generic message so a new backend code never breaks the UI. */
export type CapabilityReasonCode =
  | 'NOT_PROJECT_MEMBER'
  | 'STATE_NOT_ALLOWED'
  | 'POLICY_LOCKED'
  | 'OUT_OF_SCOPE'
  | 'NOT_ASSIGNED'
  | string

export interface ProjectCapabilities {
  projectId: number
  projectStatus: string
  concurrencyToken: string
  academicScopeProvenance: string
  leadDepartmentId: number | null
  managedDepartmentIds: number[]
  registrationSnapshotId: number | null
  schemeId: number | null
  schemeConcurrencyToken: string | null
  policyVersionId: number | null
  actions: WorkflowActionDto[]
}
