// BE-10 contract (BE_KhaiNQ_Nhiem_vu.md):
//   GET /api/v1/projects/{id}/my-capabilities
//   Merges `execution-actions` + `projects/{id}/actions` into one map
//   `capabilities` + `blockedReasons`, per CIB §11.5. The old endpoints stay
//   until the FE finishes migrating. Reason codes are stable.
// FE is built ahead of the backend and stays behind VITE_ENABLE_UNIFIED_CAPABILITIES.

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
  projectStatus?: string
  concurrencyToken?: string | null
  /** action code → whether the current viewer may perform it. */
  capabilities: Record<string, boolean>
  /** action code → ordered reason codes explaining why it is blocked. */
  blockedReasons: Record<string, CapabilityReasonCode[]>
}
