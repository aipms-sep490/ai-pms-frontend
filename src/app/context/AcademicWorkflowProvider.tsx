import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuthSession } from '../../features/auth/context/useAuthSession'
import type { AuthorizationContext } from '../../features/auth/policies/access-policy'
import { HttpError } from '../../services/http/http-client'
import { services } from '../../services/service-gateway'
import type { UserWorkflowContextDto } from '../../types/backend'
import {
  AcademicWorkflowContext,
  type AcademicContextSnapshot,
  type AcademicWorkflowErrorKind,
  type AcademicWorkflowStatus,
} from './academic-workflow-context'

const emptyAuthorization: AuthorizationContext = {
  roles: [],
  permissions: [],
  departmentIds: [],
  majorIds: [],
}

function toAcademicSnapshot(context: UserWorkflowContextDto): AcademicContextSnapshot {
  return {
    organization: context.academic.organization ?? null,
    departments: context.academic.department ? [context.academic.department] : [],
    majors: context.academic.major ? [context.academic.major] : [],
    currentSemesters: context.currentSemesters,
    selectedSemester: context.selectedSemester ?? null,
    periods: context.periods,
    hasActiveDepartmentScope: context.academic.hasActiveDepartmentScope,
    hasEligibleStudentProfile: context.academic.hasEligibleStudentProfile,
    issues: context.academic.issues,
  }
}

function toAuthorization(context: UserWorkflowContextDto, sessionRoles: readonly string[]): AuthorizationContext {
  return {
    roles: [...new Set([...sessionRoles, ...context.user.roles, ...context.user.effectiveRoles])],
    permissions: context.user.grantedPermissions,
    departmentIds: context.academic.department ? [context.academic.department.id] : [],
    majorIds: context.academic.major ? [context.academic.major.id] : [],
  }
}

export function AcademicWorkflowProvider({ children }: { children: ReactNode }) {
  const { session, status: sessionStatus } = useAuthSession()
  const sessionAccessToken = session?.accessToken
  const sessionUserId = session?.user.id
  const hasAuthenticatedSession = sessionStatus === 'authenticated' && sessionUserId !== undefined
  const [workflowContext, setWorkflowContext] = useState<UserWorkflowContextDto | null>(null)
  const [status, setStatus] = useState<AcademicWorkflowStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [errorKind, setErrorKind] = useState<AcademicWorkflowErrorKind>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const activeUserId = useRef<number | null>(null)

  const reset = useCallback(() => {
    activeUserId.current = null
    setWorkflowContext(null)
    setStatus('idle')
    setError(null)
    setErrorKind(null)
  }, [])

  const refresh = useCallback(async () => {
    setRefreshVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    if (!hasAuthenticatedSession || sessionUserId === undefined) {
      reset()
      return
    }

    const controller = new AbortController()
    if (activeUserId.current !== sessionUserId) {
      setWorkflowContext(null)
    }
    activeUserId.current = sessionUserId
    setStatus('loading')
    setError(null)
    setErrorKind(null)

    services.workflow.getCurrentContext(undefined, controller.signal)
      .then((nextContext) => {
        if (controller.signal.aborted) return
        setWorkflowContext(nextContext)
        setStatus('ready')
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        const nextError = reason instanceof Error ? reason : new Error('Không thể tải bối cảnh học vụ.')
        setError(nextError)
        if (reason instanceof HttpError && reason.status === 403) {
          setStatus('forbidden')
          setErrorKind(null)
          return
        }
        setWorkflowContext(null)
        setStatus('unavailable')
        setErrorKind(reason instanceof HttpError && reason.status === 401 ? 'authentication' : 'system')
      })

    return () => controller.abort()
  }, [hasAuthenticatedSession, refreshVersion, reset, sessionAccessToken, sessionUserId])

  const academic = useMemo(
    () => workflowContext ? toAcademicSnapshot(workflowContext) : null,
    [workflowContext],
  )
  const authorization = useMemo(
    () => workflowContext
      ? toAuthorization(workflowContext, session?.user.roles ?? [])
      : emptyAuthorization,
    [session?.user.roles, workflowContext],
  )
  const value = useMemo(
    () => ({
      currentUser: session?.user ?? null,
      workflowContext,
      academic,
      authorization,
      status,
      error,
      errorKind,
      refresh,
    }),
    [academic, authorization, error, errorKind, refresh, session?.user, status, workflowContext],
  )

  return <AcademicWorkflowContext.Provider value={value}>{children}</AcademicWorkflowContext.Provider>
}
