import type { DepartmentDecision } from '../api/project-review-api'

export type ParticipatingDecisionSummary = 'ALL_APPROVED' | 'PENDING' | 'REVISION_REQUIRED' | 'REJECTED' | 'UNAVAILABLE'

export function summarizeParticipatingDecisions(
  departmentIds: readonly number[],
  decisions: readonly DepartmentDecision[],
): ParticipatingDecisionSummary {
  if (!departmentIds.length) return 'UNAVAILABLE'
  const byDepartment = new Map(decisions.map((decision) => [decision.departmentId, decision]))
  if (departmentIds.some((id) => byDepartment.get(id)?.decision === 'REJECTED')) return 'REJECTED'
  if (departmentIds.some((id) => byDepartment.get(id)?.decision === 'REVISION_REQUIRED')) return 'REVISION_REQUIRED'
  if (departmentIds.every((id) => byDepartment.get(id)?.decision === 'APPROVED')) return 'ALL_APPROVED'
  return 'PENDING'
}
