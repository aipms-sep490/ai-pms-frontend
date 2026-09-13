import { createContext } from 'react'
import type {
  TeamDto,
  ProjectDto,
  UserAccountDto,
  SemesterDto,
  ProjectPeriodDto,
  SupervisorAssignmentDto,
  UserWorkflowContextDto,
  TeamWorkflowActionsDto,
  ProjectWorkflowActionsDto,
} from '../../types/backend'
import type { StudentJourneyState } from '../../features/auth/types/student-journey.types'

export interface StudentJourneyContextValue {
  journeyState: StudentJourneyState
  profile: UserAccountDto | null
  semester: SemesterDto | null
  period: ProjectPeriodDto | null
  team: TeamDto | null
  project: ProjectDto | null
  assignments: SupervisorAssignmentDto[]
  workflowContext: UserWorkflowContextDto | null
  teamActions: TeamWorkflowActionsDto | null
  projectActions: ProjectWorkflowActionsDto | null
  isLoading: boolean
  error: string | null
  refreshAll: () => Promise<void>
  setSimulatedJourneyState: (state: StudentJourneyState) => void
}

export const StudentJourneyContext = createContext<StudentJourneyContextValue | null>(null)
