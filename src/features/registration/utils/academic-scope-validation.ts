import type { AcademicScopeDraft } from '../types/registration-source.types'

export function validateAcademicScopeDraft(scope: AcademicScopeDraft): string[] {
  const errors: string[] = []
  if (!scope.leadDepartmentId) errors.push('LeadDepartment must be supplied by an authorized backend scope.')

  if (scope.projectMode === 'SINGLE_MAJOR') {
    if (!scope.primaryMajorId) errors.push('SINGLE_MAJOR requires PrimaryMajor.')
    return errors
  }

  if (scope.requirements.length < 2) {
    errors.push('INTERDISCIPLINARY requires at least two major requirements.')
  }

  const seenMajorIds = new Set<number>()
  for (const requirement of scope.requirements) {
    if (!Number.isInteger(requirement.majorId) || requirement.majorId <= 0) {
      errors.push('Each major requirement must use an authoritative major ID.')
    }
    if (seenMajorIds.has(requirement.majorId)) {
      errors.push('Major requirements must not contain duplicate major IDs.')
    }
    seenMajorIds.add(requirement.majorId)

    if (!Number.isInteger(requirement.minMembers) || requirement.minMembers < 1) {
      errors.push('Each major requirement must have at least one required member.')
    }
    if (requirement.maxMembers != null && (
      !Number.isInteger(requirement.maxMembers)
      || requirement.maxMembers < requirement.minMembers
    )) {
      errors.push('A major requirement maximum must be greater than or equal to its minimum.')
    }
    if (!requirement.responsibility.trim()) {
      errors.push('Each major requirement must include a responsibility.')
    }
  }

  return errors
}
