import type { StudentNavigationStep } from '../types/student-journey.types'

export const studentNavigation: readonly StudentNavigationStep[] = [
  {
    state: 'NO_TEAM',
    label: 'No team',
    route: '/team/create',
    availability: 'available',
    action: 'Create or join team',
  },
  {
    state: 'TEAM_FORMING',
    label: 'Team forming',
    route: '/team',
    availability: 'available',
    action: 'Invite member',
  },
  {
    state: 'TEAM_ELIGIBLE',
    label: 'Team eligible',
    route: '/project/register',
    availability: 'available',
    action: 'Register project',
  },
  {
    state: 'PROJECT_PENDING',
    label: 'Project pending',
    route: '/project/status',
    availability: 'available',
    action: 'View status',
  },
  {
    state: 'REVISION_REQUIRED',
    label: 'Revision required',
    route: '/project/edit',
    availability: 'available',
    action: 'Update and resubmit',
  },
  {
    state: 'SUPERVISOR_PENDING',
    label: 'Awaiting supervisor',
    route: '/project/supervisor',
    availability: 'available',
    action: 'Request supervisor',
  },
  {
    state: 'ACTIVE',
    label: 'Project active',
    route: '/project/workspace',
    availability: 'available',
    action: 'Open workspace',
  },
  {
    state: 'FINAL_SUBMISSION',
    label: 'Final submission',
    route: '/projects/lifecycle',
    availability: 'available',
    action: 'Complete checklist',
  },
  {
    state: 'COMPLETED',
    label: 'Completed or archived',
    route: '/projects/lifecycle',
    availability: 'available',
    action: 'View result',
  },
]
