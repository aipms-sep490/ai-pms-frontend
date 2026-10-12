// BE-12/13 contract, verified against AcademicTrackingContracts.cs / AcademicTrackingController.cs.
// Students have no review-history API access at all (authority table); this UI must
// only be reached for supervisor/mentor actors, never student.

export type EvidenceReviewDecision = 'ACCEPTED' | 'CHANGES_REQUESTED' | 'REJECTED' | (string & {})

export interface EvidenceReviewTarget {
  evidenceId: number
  sourceVersionId: number | null
  sourceVersion: string
  latestReviewId: number
  canReview: boolean
  denialReason: string | null
}

export interface EvidenceReview {
  id: number
  evidenceId: number
  sourceVersionId: number | null
  sourceVersion: string
  reviewerId: number
  decision: EvidenceReviewDecision
  reason: string
  reviewedAt: string
}
