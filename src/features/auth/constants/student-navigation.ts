import type { StudentNavigationStep } from '../types/student-journey.types'

export const studentNavigation: readonly StudentNavigationStep[] = [
  { state: 'NO_TEAM', label: 'No team', route: '/team/create', action: 'Create or join team' },
  { state: 'TEAM_FORMING', label: 'Team forming', route: '/team', action: 'Invite member' },
  { state: 'TEAM_ELIGIBLE', label: 'Team eligible', route: '/project/register', action: 'Register project' },
  { state: 'PROJECT_PENDING', label: 'Project pending', route: '/project/status', action: 'View status' },
  { state: 'REVISION_REQUIRED', label: 'Revision required', route: '/project/edit', action: 'Update and resubmit' },
  { state: 'SUPERVISOR_PENDING', label: 'Awaiting supervisor', route: '/project/supervisor', action: 'Request supervisor' },
  { state: 'ACTIVE', label: 'Project active', route: '/project/workspace', action: 'Open workspace' },
  { state: 'FINAL_SUBMISSION', label: 'Final submission', route: '/project/final', action: 'Complete checklist' },
  { state: 'COMPLETED', label: 'Completed or archived', route: '/project/result', action: 'View result' },
]
