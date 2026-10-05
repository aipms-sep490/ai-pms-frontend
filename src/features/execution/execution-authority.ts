import type { ExecutionAccess } from './context/ExecutionAccessContext'
import type { ExecutionActionCapability } from './hooks/useExecutionActionCapabilities'

const structuralProjectActions = new Set(['create_task', 'create_milestone', 'reorder_milestones', 'create_progress_report', 'schedule_meeting'])
const structuralTaskActions = new Set(['update_task', 'delete_task', 'assign_task', 'manage_task_dependencies'])
const mentorTaskActions = new Set(['change_task_status', 'add_task_evidence'])

function activePrimarySupervisor(access: ExecutionAccess): boolean {
  const assignment = access.supervisor
  return access.actor === 'supervisor' && assignment?.isPrimary === true && assignment.assignmentType === 'PRIMARY' && !assignment.endedAt
}

function studentLeader(access: ExecutionAccess): boolean {
  return access.actor === 'student' && access.canManageStructure
}

/**
 * A capability response is necessary but not sufficient for an execution CTA.
 * This client-side gate narrows UI exposure around known backend manager-scope
 * overreach; the mutation endpoint remains the final authorization authority.
 */
export function canUseProjectExecutionAction(access: ExecutionAccess, action: string): boolean {
  if (!structuralProjectActions.has(action) || access.executionCapabilities?.get(action as never).allowed !== true) return false
  return studentLeader(access) || activePrimarySupervisor(access)
}

/** Keep task structural controls out of a discipline mentor route even if a broad backend manager predicate returns Allowed. */
export function canUseTaskExecutionAction(access: ExecutionAccess, action: string, capability: ExecutionActionCapability, mentorScopeProven = false): boolean {
  if (!capability.allowed) return false
  if (structuralTaskActions.has(action)) return studentLeader(access) || activePrimarySupervisor(access)
  if (access.actor === 'mentor') return mentorScopeProven && mentorTaskActions.has(action) && access.supervisor?.assignmentType === 'DISCIPLINE_MENTOR' && Boolean(access.supervisor.majorId) && !access.supervisor.endedAt
  return true
}
