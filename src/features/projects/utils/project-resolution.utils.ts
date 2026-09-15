import type { ProjectSummaryDto, SupervisorAssignmentDto } from '../../../types/backend'

const STATUS_PRIORITY: Record<string, number> = {
  COMPLETED: 10,
  FINALSUBMISSION: 9,
  ACTIVE: 8,
  APPROVED: 7,
  SUPERVISORPENDING: 6,
  REVISIONREQUIRED: 5,
  UNDERREVIEW: 4,
  SUBMITTED: 3,
  DRAFT: 2,
  REJECTED: 1,
  ARCHIVED: 0,
}

/**
 * Deterministically finds the current primary project for a team.
 * Priority:
 * 1. Project lifecycle status priority:
 *    Active > Approved > RevisionRequired > UnderReview > Submitted > Draft > Rejected > Archived
 * 2. Tie-breaker: most recently created (createdAt descending)
 * 3. Tie-breaker: highest ID descending
 */
export function findCurrentTeamProject(projects: ProjectSummaryDto[]): ProjectSummaryDto | null {
  if (!projects || projects.length === 0) return null

  const sorted = [...projects].sort((a, b) => {
    const priorityA = STATUS_PRIORITY[a.status.replaceAll('_', '').toUpperCase()] ?? 0
    const priorityB = STATUS_PRIORITY[b.status.replaceAll('_', '').toUpperCase()] ?? 0
    if (priorityA !== priorityB) {
      return priorityB - priorityA
    }

    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    if (timeA !== timeB) {
      return timeB - timeA
    }

    return b.id - a.id
  })

  return sorted[0]
}

/**
 * An assignment is active ONLY if it is marked as primary AND has not ended.
 */
export function getActivePrimaryAssignment(
  assignments: SupervisorAssignmentDto[],
): SupervisorAssignmentDto | null {
  if (!assignments || assignments.length === 0) return null
  return assignments.find((a) => a.isPrimary && !a.endedAt) ?? null
}
