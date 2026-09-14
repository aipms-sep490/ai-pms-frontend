export const aiPmsRoles = [
  'ADMIN',
  'DEPARTMENT_STAFF',
  'SUPERVISOR',
  'STUDENT_LEADER',
  'STUDENT_MEMBER',
  'EVALUATOR',
] as const

export type AiPmsRole = (typeof aiPmsRoles)[number]
export type WorkflowRole = AiPmsRole | string

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
  roles: readonly WorkflowRole[]
  permissions: readonly Permission[]
  departmentIds: readonly number[]
  majorIds: readonly number[]
  projectId?: string
  projectState?: ProjectState
  isProjectMember?: boolean
}

export interface AccessRequirement {
  requiredPermissions?: readonly Permission[]
  allowedProjectStates?: readonly ProjectState[]
  requireProjectMembership?: boolean
}

/** A backend-evaluated workflow action. It is not a frontend permission claim. */
export interface BackendAction {
  code: string
  allowed: boolean
  reasons: readonly string[]
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
  roles: readonly WorkflowRole[],
): boolean {
  return roles.some((role) => context.roles.includes(role))
}

export function hasRole(context: AuthorizationContext, role: WorkflowRole): boolean {
  return context.roles.includes(role)
}

export function hasPermission(context: AuthorizationContext, permission: Permission): boolean {
  return context.permissions.includes(permission)
}

export function hasDepartmentScope(context: AuthorizationContext, departmentId: number): boolean {
  return context.departmentIds.includes(departmentId)
}

export function hasMajorScope(context: AuthorizationContext, majorId: number): boolean {
  return context.majorIds.includes(majorId)
}

/**
 * Use backend action availability for UI affordances when permission codes are
 * not present in the login payload. The API still enforces every operation.
 */
export function canPerformBackendAction(
  actions: readonly BackendAction[],
  actionCode: string,
): boolean {
  return actions.some((action) => action.code === actionCode && action.allowed)
}
