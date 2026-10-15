// BE-14 contract, verified against AcademicTrackingContracts.cs / AcademicTrackingController.cs:
//   POST/GET /api/v1/projects/{id}/defense-sessions, POST /defense-sessions/{id}/cancel, GET /defense-sessions/{id}
// Students and participating-department readers get schedule metadata only (time/room/status),
// never committee membership/contact data; only Primary/lead staff may read defense-committees.
// This FE intentionally does not fetch or render a committee roster for the student view.

export type DefenseSessionStatus = 'SCHEDULED' | 'CANCELLED' | (string & {})

export interface DefenseSession {
  id: number
  projectId: number
  committeeId: number
  startAt: string
  endAt: string
  room: string
  status: DefenseSessionStatus
  concurrencyToken: string
  cancellationReason: string | null
  canCancel: boolean
}

export interface CommitteeMember {
  userId: number
  majorId: number
}

export interface DefenseCommittee {
  id: number
  projectId: number
  name: string
  members: CommitteeMember[]
  grantsEvaluatorAuthority?: boolean
}

export interface CreateCommitteeRequest {
  name: string
  members: CommitteeMember[]
}

export interface ScheduleDefenseRequest {
  committeeId: number
  startAt: string
  endAt: string
  room: string
}

export interface CancelDefenseRequest {
  concurrencyToken: string
  reason: string
}
