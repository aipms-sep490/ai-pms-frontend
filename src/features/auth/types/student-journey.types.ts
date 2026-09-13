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

export type StudentDestinationAvailability = 'available' | 'planned'

export interface StudentNavigationStep {
  state: StudentJourneyState
  label: string
  route: string
  availability: StudentDestinationAvailability
  plannedRoute?: string
  action: string
}
