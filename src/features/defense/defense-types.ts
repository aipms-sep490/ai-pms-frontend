// BE-14 contract (BE_DongVV_Nhiem_vu.md):
//   evaluation_committees(id, project_period_id, department_id, name)
//   committee_members(committee_id, user_id, role CHAIR|SECRETARY|MEMBER|INDUSTRY)
//   defense_sessions(id, committee_id, project_id, start_at, end_at, location, online_url, status)
// This FE reads the scheduled session for a student's project. It is built ahead
// of the backend and stays behind VITE_ENABLE_DEFENSE.

export type CommitteeRole = 'CHAIR' | 'SECRETARY' | 'MEMBER' | 'INDUSTRY' | string
export type DefenseSessionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string

export interface CommitteeMember {
  userId: number
  userName?: string | null
  role: CommitteeRole
}

export interface DefenseSession {
  id: number
  committeeId: number
  projectId: number
  committeeName?: string | null
  startAt: string
  endAt?: string | null
  location?: string | null
  onlineUrl?: string | null
  status: DefenseSessionStatus
  members: CommitteeMember[]
}
