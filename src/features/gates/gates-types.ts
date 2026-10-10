// Contract per BE-12 (BE_DongVV_Nhiem_vu.md). Default MVP is tracking mode:
// an overdue required gate becomes MISSED with a risk notice; it never fails the
// project. The FE reads and displays gate status; it does not compute it.

export type GateStatus = 'PLANNED' | 'IN_REVIEW' | 'PASSED' | 'REVISION_REQUIRED' | 'MISSED'

export interface GateReview {
  id: number
  checkpointId: number
  reviewerId: number
  reviewerName?: string | null
  majorId?: number | null
  majorName?: string | null
  decision: string
  reason?: string | null
  decidedAt: string
}

export interface ProjectCheckpoint {
  id: number
  projectId: number
  gateCode: string
  title?: string | null
  isRequired: boolean
  dueAt: string | null
  status: GateStatus
  concurrencyToken?: string
  evidenceCount?: number
  reviews?: GateReview[]
}
