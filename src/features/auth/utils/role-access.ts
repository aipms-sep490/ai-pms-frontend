import type { AuthUser } from '../types/auth.types'

export type WorkspaceRole = 'student' | 'lecturer' | 'department' | 'admin' | 'industry' | 'unknown'

/**
 * An authenticated account with zero AI-PMS roles is an industry expert (the backend's own
 * `Expert()` check: active + zero `UserRoles` rows — AIPMS.Infrastructure/Services/Projects/
 * IndustryService.cs). No user at all (not authenticated) is kept as 'unknown', not 'industry'.
 */
export function getWorkspaceRole(user?: Pick<AuthUser, 'roles'> | null): WorkspaceRole {
  if (!user) return 'unknown'
  const roles = user.roles.map((role) => role.toUpperCase())
  if (roles.includes('ADMIN')) return 'admin'
  if (roles.includes('DEPARTMENT_STAFF')) return 'department'
  if (roles.includes('LECTURER')) return 'lecturer'
  if (roles.includes('STUDENT')) return 'student'
  if (roles.length === 0) return 'industry'
  return 'unknown'
}

export function getHomePath(user?: Pick<AuthUser, 'roles'> | null): string {
  switch (getWorkspaceRole(user)) {
    case 'admin': return '/admin/access'
    case 'department': return '/department/workspace'
    case 'lecturer': return '/supervisor/workspace'
    case 'student': return '/project/overview'
    case 'industry': return '/industry/workspace'
    default: return '/profile'
  }
}
