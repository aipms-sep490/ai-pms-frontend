import { useContext, useEffect, useMemo, useState } from 'react'
import { useAuthSession } from '../../features/auth/context/useAuthSession'
import { getWorkspaceRole, type WorkspaceRole } from '../../features/auth/utils/role-access'
import type { Permission } from '../../features/auth/policies/access-policy'
import type { WorkflowActionDto } from '../../types/backend'
import { getMyEvaluationAssignments } from '../../services/api/evaluations.api'
import { useAcademicWorkflow } from './useAcademicWorkflow'
import { StudentJourneyContext } from './StudentJourneyContext'

export type WorkspaceContextStatus = 'unknown' | 'loading' | 'ready' | 'unavailable'
export type ProjectAssignment = 'TEAM_LEADER' | 'TEAM_MEMBER' | 'PRIMARY_SUPERVISOR' | 'DISCIPLINE_MENTOR' | 'EVALUATOR' | 'INDUSTRY_EXPERT'

export interface WorkspaceAccess {
  identityRole: WorkspaceRole
  identityRoles: readonly string[]
  permissions: readonly Permission[]
  departmentIds: readonly number[]
  majorIds: readonly number[]
  selectedSemesterId: number | null
  teamId: number | null
  projectId: number | null
  projectState: string | null
  assignments: readonly ProjectAssignment[]
  teamActions: readonly WorkflowActionDto[] | null
  projectActions: readonly WorkflowActionDto[] | null
  contextStatus: WorkspaceContextStatus
  contextError: string | null
  /** Never treat a null action response as a denied action. */
  actionStatus: WorkspaceContextStatus
  assignmentStatus: WorkspaceContextStatus
  isWorkflowActionAllowed: (code: string) => boolean
}

function normalizeRoles(roles: readonly string[] | undefined): string[] {
  return (roles ?? []).map((role) => role.toUpperCase())
}

export function isWorkflowActionAllowed(actions: readonly WorkflowActionDto[] | null, code: string): boolean {
  return actions?.some((action) => action.code === code && action.allowed) ?? false
}

/**
 * A read-only composition of already-authoritative contexts. It deliberately
 * does not fetch a global project or assignment list: a scoped page owns that
 * read and direct route guards remain independent UX protections.
 */
export function useWorkspaceAccess(): WorkspaceAccess {
  const { session, status: sessionStatus } = useAuthSession()
  const academic = useAcademicWorkflow()
  const journey = useContext(StudentJourneyContext)
  const user = session?.user ?? null
  const [evaluatorState, setEvaluatorState] = useState<{ status: WorkspaceContextStatus; hasAssignment: boolean }>({ status: 'unknown', hasAssignment: false })

  useEffect(() => {
    if (getWorkspaceRole(user) !== 'lecturer') {
      setEvaluatorState({ status: 'unknown', hasAssignment: false })
      return
    }
    const controller = new AbortController()
    setEvaluatorState({ status: 'loading', hasAssignment: false })
    void getMyEvaluationAssignments(1, 1, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setEvaluatorState({ status: 'ready', hasAssignment: result.items.length > 0 }) })
      .catch(() => { if (!controller.signal.aborted) setEvaluatorState({ status: 'unavailable', hasAssignment: false }) })
    return () => controller.abort()
  }, [user])

  return useMemo(() => {
    const identityRoles = normalizeRoles(user?.roles)
    const identityRole = getWorkspaceRole(user)
    const isStudent = identityRole === 'student'
    const isLoading = sessionStatus === 'restoring' || academic.status === 'idle' || academic.status === 'loading' || (isStudent && Boolean(journey?.isLoading))
    const error = academic.error?.message ?? (isStudent ? journey?.error ?? null : null)
    const contextStatus: WorkspaceContextStatus = isLoading
      ? 'loading'
      : error || academic.status === 'unavailable' || academic.status === 'forbidden'
        ? 'unavailable'
        : academic.status === 'ready' || Boolean(session)
          ? 'ready'
          : 'unknown'
    const currentMember = journey?.team?.members.find((member) => member.userId === journey.profile?.id)
    const assignments: ProjectAssignment[] = []
    if (currentMember) assignments.push(currentMember.isLeader ? 'TEAM_LEADER' : 'TEAM_MEMBER')
    if (journey?.assignments.some((assignment) => assignment.isPrimary && !assignment.endedAt)) assignments.push('PRIMARY_SUPERVISOR')
    if (evaluatorState.hasAssignment) assignments.push('EVALUATOR')
    const projectActions = journey?.projectActions?.actions ?? null
    const teamActions = journey?.teamActions?.actions ?? null
    const actionStatus: WorkspaceContextStatus = !isStudent
      ? contextStatus
      : journey?.isLoading
        ? 'loading'
        : journey?.error
          ? 'unavailable'
          : journey?.project
            ? projectActions ? 'ready' : 'unknown'
            : journey?.team
              ? teamActions ? 'ready' : 'unknown'
              : contextStatus

    return {
      identityRole,
      identityRoles,
      permissions: academic.authorization.permissions,
      departmentIds: academic.authorization.departmentIds,
      majorIds: academic.authorization.majorIds,
      selectedSemesterId: academic.academic?.selectedSemester?.id ?? null,
      teamId: journey?.team?.id ?? null,
      projectId: journey?.project?.id ?? null,
      projectState: journey?.project?.status ?? null,
      assignments,
      teamActions,
      projectActions,
      contextStatus,
      contextError: error,
      actionStatus,
      assignmentStatus: evaluatorState.status,
      isWorkflowActionAllowed: (code) => isWorkflowActionAllowed(projectActions ?? teamActions ?? academic.workflowContext?.actions ?? null, code),
    }
  }, [academic.academic?.selectedSemester?.id, academic.authorization.departmentIds, academic.authorization.majorIds, academic.authorization.permissions, academic.error?.message, academic.status, academic.workflowContext?.actions, evaluatorState, journey, session, sessionStatus, user])
}
