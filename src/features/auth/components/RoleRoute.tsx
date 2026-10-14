import { Navigate, Outlet } from 'react-router-dom'
import { useAuthSession } from '../context/useAuthSession'
import { getHomePath, type WorkspaceRole } from '../utils/role-access'

export function HomeRedirect() {
  const { session } = useAuthSession()
  return <Navigate to={getHomePath(session?.user)} replace />
}

// Deliberately "holds any of these role codes", not the single precedence-ordered identity from
// getWorkspaceRole — a multi-role account (e.g. Admin + Department Staff) must still reach a
// department-only route (see RoleRoute.test.tsx). 'industry' has no role code: it is zero roles.
const roleCode: Partial<Record<WorkspaceRole, string>> = { student: 'STUDENT', lecturer: 'LECTURER', department: 'DEPARTMENT_STAFF', admin: 'ADMIN' }

export function RoleRoute({ allowed }: { allowed: readonly WorkspaceRole[] }) {
  const { session } = useAuthSession()
  if (!session) return <Navigate to="/login" replace />
  const roles = session.user.roles.map(role => role.toUpperCase())
  const matches = allowed.some(role => role === 'industry' ? roles.length === 0 : roleCode[role] !== undefined && roles.includes(roleCode[role]))
  if (!matches) {
    return <Navigate to={getHomePath(session.user)} replace />
  }
  return <Outlet />
}
