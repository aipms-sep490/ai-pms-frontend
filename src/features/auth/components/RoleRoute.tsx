import { Navigate, Outlet } from 'react-router-dom'
import { useAuthSession } from '../context/useAuthSession'
import { getHomePath, getWorkspaceRole, type WorkspaceRole } from '../utils/role-access'

export function HomeRedirect() {
  const { session } = useAuthSession()
  return <Navigate to={getHomePath(session?.user)} replace />
}

export function RoleRoute({ allowed }: { allowed: readonly WorkspaceRole[] }) {
  const { session } = useAuthSession()
  if (!session) return <Navigate to="/login" replace />
  if (!allowed.includes(getWorkspaceRole(session.user))) {
    return <Navigate to={getHomePath(session.user)} replace />
  }
  return <Outlet />
}
