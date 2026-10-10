// BE-19b contract (BE_DongVV_Nhiem_vu.md, backlog P2):
//   peer_evaluations — peer evaluation is ONLY evidence, never a score.
// FE is built ahead of the backend and stays behind VITE_ENABLE_PEER_EVAL.

export interface PeerEvaluationInput {
  evaluateeUserId: number
  /** 1–5 contribution rating. */
  rating: number
  comment?: string
}

export interface PeerEvaluationRecord extends PeerEvaluationInput {
  evaluateeName?: string | null
  submittedAt?: string | null
}

export interface MyPeerEvaluations {
  /** Whether the current viewer has already submitted for this round. */
  submitted: boolean
  items: PeerEvaluationRecord[]
}
