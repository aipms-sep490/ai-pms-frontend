import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { resolveStudentNextAction } from '../../auth/utils/resolve-student-next-action'
import { ExecutionAccessProvider } from '../../execution/context/ExecutionAccessProvider'
import { PageLoading } from '../../../components/ui/PageLoading'
import { ExState } from '../../execution/execution-ui'
import { useProjectExecutionCapabilities } from '../../execution/hooks/useProjectExecutionCapabilities'

/** Backend-derived execution guard shared by student project routes.
 * Allows read-only inspection during FINAL_SUBMISSION / COMPLETED while
 * preserving server-enforced write locks and redirecting pre-execution states. */
export function ActiveStudentProjectRoute({ children }: { children?: ReactNode }) {
  const journey = useStudentJourney()
  const executionCapabilities = useProjectExecutionCapabilities(journey.project?.id)
  if (journey.isLoading) return <PageLoading />
  if (journey.error) return <ExState message="Chưa tải được thông tin đồ án. Hãy thử lại." retry={() => void journey.refreshAll()} />
  const fallback = resolveStudentNextAction({ journeyState: journey.journeyState, projectStatus: journey.project?.status })
  const canViewExecutionHistory = journey.journeyState === 'ACTIVE' || journey.journeyState === 'FINAL_SUBMISSION' || journey.journeyState === 'COMPLETED'
  if (!canViewExecutionHistory || !journey.project) return <Navigate to={fallback.route} replace />
  const isLeader = Boolean(journey.team?.members.some((member) => member.userId === journey.profile?.id && member.isLeader))
  const supervisor = journey.assignments.find((assignment) => assignment.isPrimary && !assignment.endedAt) ?? null
  return <ExecutionAccessProvider value={{ project: journey.project, team: journey.team, supervisor, currentUserId: journey.profile?.id, actor: 'student', canManageStructure: isLeader && journey.journeyState === 'ACTIVE', executionCapabilities, routeBase: '/project' }}>{children ?? <Outlet />}</ExecutionAccessProvider>
}
