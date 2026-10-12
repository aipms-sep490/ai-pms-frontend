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
