export const aiPmsRoles = [
  'ADMIN',
  'DEPARTMENT_STAFF',
  'SUPERVISOR',
  'STUDENT_LEADER',
  'STUDENT_MEMBER',
  'EVALUATOR',
] as const

export type AiPmsRole = (typeof aiPmsRoles)[number]

export const projectStates = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'REVISION_REQUIRED',
  'REJECTED',
  'APPROVED',
  'SUPERVISOR_PENDING',
  'ACTIVE',
  'FINAL_SUBMISSION',
  'COMPLETED',
  'ARCHIVED',
] as const

export type ProjectState = (typeof projectStates)[number]

/**
 * Permission identifiers deliberately remain opaque strings until the backend
 * publishes its authorization contract. The frontend must not invent claims.
 */
export type Permission = string

export interface AuthorizationContext {
  roles: readonly AiPmsRole[]
  permissions: readonly Permission[]
  projectId?: string
  projectState?: ProjectState
  isProjectMember?: boolean
}

export interface AccessRequirement {
  requiredPermissions?: readonly Permission[]
  allowedProjectStates?: readonly ProjectState[]
  requireProjectMembership?: boolean
}

/**
 * Evaluates frontend UX access only. Backend authorization remains final.
 * Roles are available to navigation and presentation, but cannot grant access
 * through this helper without the required permission and project scope.
 */
export function canAccess(
  context: AuthorizationContext,
  requirement: AccessRequirement,
): boolean {
  if (
    requirement.requiredPermissions?.some(
      (permission) => !context.permissions.includes(permission),
    )
  ) {
    return false
  }

  if (
    requirement.allowedProjectStates &&
    (!context.projectState || !requirement.allowedProjectStates.includes(context.projectState))
  ) {
    return false
  }

  if (requirement.requireProjectMembership && !context.isProjectMember) {
    return false
  }

  return true
}

export function hasAnyRole(
  context: AuthorizationContext,
  roles: readonly AiPmsRole[],
): boolean {
  return roles.some((role) => context.roles.includes(role))
}
