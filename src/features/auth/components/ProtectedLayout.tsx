import { Navigate } from 'react-router-dom'
import { AppLayout } from '../../../app/layouts/AppLayout'
import { useStudentJourney } from '../../../app/context'
import { useAuthSession } from '../context/useAuthSession'
import { getWorkspaceRole } from '../utils/role-access'

export function ProtectedLayout() {
  const { session, status } = useAuthSession()
  const { isLoading: isJourneyLoading } = useStudentJourney()

  if (status === 'authenticating' || (session && getWorkspaceRole(session.user) === 'student' && isJourneyLoading)) {
    return (
      <main className="min-h-screen grid place-items-center bg-slate-50 text-sm text-slate-600">
        {status === 'authenticating' ? 'Đang khôi phục phiên đăng nhập…' : 'Đang đồng bộ dữ liệu đồ án…'}
      </main>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  return <AppLayout />
}
