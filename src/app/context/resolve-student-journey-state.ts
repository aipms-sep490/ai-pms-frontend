import type { ProjectDto, SupervisorAssignmentDto, TeamDto, TeamWorkflowActionsDto } from '../../types/backend'
import type { StudentJourneyState } from '../../features/auth/types/student-journey.types'
import { getActivePrimaryAssignment } from '../../features/projects/utils/project-resolution.utils'

export function resolveStudentJourneyState(
  team: TeamDto | null,
  project: ProjectDto | null,
  assignments: SupervisorAssignmentDto[],
  teamActions: TeamWorkflowActionsDto | null,
): StudentJourneyState {
  if (!team) return 'NO_TEAM'

  if (project) {
    const status = project.status.replaceAll('_', '').toUpperCase()
    if (status === 'SUBMITTED' || status === 'UNDERREVIEW') return 'PROJECT_PENDING'
    if (status === 'REVISIONREQUIRED') return 'REVISION_REQUIRED'
    if (status === 'APPROVED' || status === 'SUPERVISORPENDING') {
      return getActivePrimaryAssignment(assignments) ? 'ACTIVE' : 'SUPERVISOR_PENDING'
    }
    if (status === 'ACTIVE') return 'ACTIVE'
    if (status === 'FINALSUBMISSION') return 'FINAL_SUBMISSION'
    if (status === 'COMPLETED' || status === 'ARCHIVED') return 'COMPLETED'
    if (status === 'DRAFT') return 'TEAM_ELIGIBLE'
  }

  const canRegister = teamActions?.canRegister ?? team.eligibility?.canRegister ?? false
  return team.status.toUpperCase() === 'FORMING' || !canRegister ? 'TEAM_FORMING' : 'TEAM_ELIGIBLE'
}
