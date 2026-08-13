export type StudentJourneyState =
  | 'NO_TEAM'
  | 'TEAM_FORMING'
  | 'TEAM_ELIGIBLE'
  | 'PROJECT_PENDING'
  | 'REVISION_REQUIRED'
  | 'SUPERVISOR_PENDING'
  | 'ACTIVE'
  | 'FINAL_SUBMISSION'
  | 'COMPLETED'

export interface StudentNavigationStep {
  state: StudentJourneyState
  label: string
  route: string
  action: string
}
