import type { AuthUser } from '../types/auth.types'

export type WorkspaceRole = 'student' | 'lecturer' | 'department' | 'admin' | 'unknown'

export function getWorkspaceRole(user?: Pick<AuthUser, 'roles'> | null): WorkspaceRole {
  const roles = user?.roles.map((role) => role.toUpperCase()) ?? []
  if (roles.includes('ADMIN')) return 'admin'
  if (roles.includes('DEPARTMENT_STAFF')) return 'department'
  if (roles.includes('LECTURER')) return 'lecturer'
  if (roles.includes('STUDENT')) return 'student'
  return 'unknown'
}

export function getHomePath(user?: Pick<AuthUser, 'roles'> | null): string {
  switch (getWorkspaceRole(user)) {
    case 'admin': return '/admin/access'
    case 'department': return '/department/projects/review'
    case 'lecturer': return '/supervisor/workspace'
    case 'student': return '/project/overview'
    default: return '/profile'
  }
}
