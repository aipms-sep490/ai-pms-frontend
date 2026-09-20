import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { resolveStudentNextAction } from '../../auth/utils/resolve-student-next-action'
import { ExecutionAccessProvider } from '../../execution/context/ExecutionAccessProvider'

/** Backend-derived ACTIVE guard shared by every student execution route. */
export function ActiveStudentProjectRoute({ children }: { children?: ReactNode }) {
  const journey = useStudentJourney()
  if (journey.isLoading) return <section role="status" className="mx-auto max-w-3xl rounded-2xl border p-5 text-sm">Đang xác minh trạng thái Project từ Backend…</section>
  if (journey.error) return <section role="alert" className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{journey.error}</section>
  const fallback = resolveStudentNextAction({ journeyState: journey.journeyState, projectStatus: journey.project?.status })
  if (journey.journeyState !== 'ACTIVE' || !journey.project) return <Navigate to={fallback.route} replace />
  const isLeader = Boolean(journey.team?.members.some((member) => member.userId === journey.profile?.id && member.isLeader))
  const supervisor = journey.assignments.find((assignment) => assignment.isPrimary && !assignment.endedAt) ?? null
  return <ExecutionAccessProvider value={{ project: journey.project, team: journey.team, supervisor, currentUserId: journey.profile?.id, actor: 'student', canManageStructure: isLeader, routeBase: '/project' }}>{children ?? <Outlet />}</ExecutionAccessProvider>
}
