import type { MajorRequirementDto } from '../../../types/backend'

export interface MajorRequirementValidation {
  valid: boolean
  issues: string[]
}

export function validateMajorRequirements(
  requirements: readonly MajorRequirementDto[],
  projectMode: string,
): MajorRequirementValidation {
  const issues: string[] = []
  const seen = new Set<number>()

  requirements.forEach((requirement) => {
    if (!Number.isInteger(requirement.majorId) || requirement.majorId <= 0) issues.push('Each requirement needs a valid major.')
    if (seen.has(requirement.majorId)) issues.push('A major can appear only once.')
    seen.add(requirement.majorId)
    if (!Number.isInteger(requirement.minMembers) || requirement.minMembers < 1) issues.push('Minimum members must be at least 1.')
    if (!Number.isInteger(requirement.maxMembers) || requirement.maxMembers < requirement.minMembers) issues.push('Maximum members must be at least the minimum.')
    if (!requirement.responsibility.trim()) issues.push('Each requirement needs a responsibility.')
  })

  if (projectMode === 'INTERDISCIPLINARY' && requirements.length < 2) {
    issues.push('INTERDISCIPLINARY requires at least two major requirements.')
  }

  return { valid: issues.length === 0, issues: [...new Set(issues)] }
}
