// BE-19b contract — BACKEND_READY (AIPMS.Infrastructure/Services/Projects/PeerEvaluationService.cs).
// Peer evaluation is evidence only, never an official score. Ratings are scoped to a round's
// frozen roster snapshot taken when the round opened — not live team membership; a member who
// joins/leaves after that is only picked up by a new round (see `PEER_ROSTER_CHANGED`).
// Lifecycle: a round auto-resolves via `mine` when no roundId is given — at most one round can be
// OPEN at a time. A student's own evidence is NOT_STARTED -> DRAFT (via Save, resumable, partial
// allowed) -> SUBMITTED (via Submit, requires every other roster member rated, then immutable).

export type PeerRoundStatus = 'SCHEDULED' | 'OPEN' | 'EXPIRED' | 'CLOSED'
export type MyPeerStatus = 'NO_OPEN_ROUND' | 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED'

export interface PeerRosterMember {
  userId: number
  majorId: number
  fullName: string
}

export interface PeerRatingInput {
  targetUserId: number
  /** 1-5 contribution rating. */
  rating: number
  comment?: string | null
}

export interface PeerEvaluationSubmission {
  id: number
  roundId: number
  authorId: number
  status: 'DRAFT' | 'SUBMITTED'
  concurrencyToken: string
  updatedAt: string
  submittedAt?: string | null
  items: PeerRatingInput[]
}

/** NO_OPEN_ROUND reports `roundId: null, submission: null` explicitly — never guess a round. */
export interface MyPeerEvaluation {
  roundId: number | null
  status: MyPeerStatus
  submission: PeerEvaluationSubmission | null
}

export interface PeerRound {
  id: number
  projectId: number
  title: string
  status: PeerRoundStatus
  opensAt: string
  closesAt: string
  closedAt?: string | null
  concurrencyToken: string
  memberCount: number
  /** Primary-supervisor-only round management (create/close) — not wired by this page. */
  canManage: boolean
  /** Backend-authoritative: student, a current round member, and no blocking reason. Always gate
   * the rating form through this, never by re-deriving membership/status client-side. */
  canSubmit: boolean
  reasons: string[]
  roster: PeerRosterMember[]
}
