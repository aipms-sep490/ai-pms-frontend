import { Navigate, Outlet } from 'react-router-dom'
import { useAuthSession } from '../context/useAuthSession'
import { getHomePath, type WorkspaceRole } from '../utils/role-access'

export function HomeRedirect() {
  const { session } = useAuthSession()
  return <Navigate to={getHomePath(session?.user)} replace />
}

export function RoleRoute({ allowed }: { allowed: readonly WorkspaceRole[] }) {
  const { session } = useAuthSession()
  if (!session) return <Navigate to="/login" replace />
  const identities: Record<WorkspaceRole, string> = { student: 'STUDENT', lecturer: 'LECTURER', department: 'DEPARTMENT_STAFF', admin: 'ADMIN', unknown: 'UNKNOWN' }
  const roles = session.user.roles.map(role => role.toUpperCase())
  if (!allowed.some(role => roles.includes(identities[role]))) {
    return <Navigate to={getHomePath(session.user)} replace />
  }
  return <Outlet />
}
