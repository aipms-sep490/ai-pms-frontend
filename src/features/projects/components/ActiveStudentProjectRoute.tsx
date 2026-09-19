import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { resolveStudentNextAction } from '../../auth/utils/resolve-student-next-action'

/** Backend-derived ACTIVE guard shared by every student execution route. */
export function ActiveStudentProjectRoute({ children }: { children?: ReactNode }) {
  const journey = useStudentJourney()
  if (journey.isLoading) return <section role="status" className="mx-auto max-w-3xl rounded-2xl border p-5 text-sm">Đang xác minh trạng thái Project từ Backend…</section>
  if (journey.error) return <section role="alert" className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{journey.error}</section>
  const fallback = resolveStudentNextAction({ journeyState: journey.journeyState, projectStatus: journey.project?.status })
  if (journey.journeyState !== 'ACTIVE' || !journey.project) return <Navigate to={fallback.route} replace />
  return <>{children ?? <Outlet />}</>
}
