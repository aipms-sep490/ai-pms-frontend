import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { resolveStudentNextAction } from '../../auth/utils/resolve-student-next-action'
import { ExecutionAccessProvider } from '../../execution/context/ExecutionAccessProvider'
import { PageLoading } from '../../../components/ui/PageLoading'
import { ExState } from '../../execution/execution-ui'

/** Backend-derived ACTIVE guard shared by every student execution route. */
export function ActiveStudentProjectRoute({ children }: { children?: ReactNode }) {
  const journey = useStudentJourney()
  if (journey.isLoading) return <PageLoading />
  if (journey.error) return <ExState message="Chưa tải được thông tin đồ án. Hãy thử lại." retry={() => void journey.refreshAll()} />
  const fallback = resolveStudentNextAction({ journeyState: journey.journeyState, projectStatus: journey.project?.status })
  if (journey.journeyState !== 'ACTIVE' || !journey.project) return <Navigate to={fallback.route} replace />
  const isLeader = Boolean(journey.team?.members.some((member) => member.userId === journey.profile?.id && member.isLeader))
  const supervisor = journey.assignments.find((assignment) => assignment.isPrimary && !assignment.endedAt) ?? null
  return <ExecutionAccessProvider value={{ project: journey.project, team: journey.team, supervisor, currentUserId: journey.profile?.id, actor: 'student', canManageStructure: isLeader, routeBase: '/project' }}>{children ?? <Outlet />}</ExecutionAccessProvider>
}
