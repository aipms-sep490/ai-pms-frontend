// BE-12 contract, verified against AcademicTrackingContracts.cs / AcademicTrackingController.cs.
// There is no fixed G1-G6 code and no status enum: a checkpoint is a free-text,
// manager-defined plan (title + optional major + plannedAt). TrackingOnly=true and
// BlocksAcademicWorkflow=false always: an overdue plan with no MET/CANCELLED
// decision is a risk signal only, never a project failure. The FE reads and
// displays; it does not compute pass/fail.

export type CheckpointDecisionValue = 'MET' | 'AT_RISK' | 'NOT_MET' | 'CANCELLED' | (string & {})

export interface CheckpointEvidenceRef {
  evidenceId: number
  reviewId: number
}

export interface CheckpointDecision {
  id: number
  decision: CheckpointDecisionValue
  reason: string
  decidedBy: number
  decidedAt: string
  evidence: CheckpointEvidenceRef[]
}

export interface ProjectCheckpoint {
  id: number
  projectId: number
  title: string
  majorId: number | null
  plannedAt: string
  concurrencyToken: string
  isOverdue: boolean
  canManage: boolean
  decisions: CheckpointDecision[]
  trackingOnly: boolean
  blocksAcademicWorkflow: boolean
}
