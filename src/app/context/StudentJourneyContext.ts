import { createContext } from 'react'
import type {
  TeamDto,
  ProjectDto,
  UserAccountDto,
  ProjectPeriodDto,
  SupervisorAssignmentDto,
  UserWorkflowContextDto,
  TeamWorkflowActionsDto,
  ProjectWorkflowActionsDto,
  WorkflowSemesterDto,
} from '../../types/backend'
import type { StudentJourneyState } from '../../features/auth/types/student-journey.types'

export interface StudentJourneyContextValue {
  journeyState: StudentJourneyState
  profile: UserAccountDto | null
  /** Selected server workflow semester; it is not URL- or localStorage-derived. */
  semester: WorkflowSemesterDto | null
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
