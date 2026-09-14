import { useCallback, useEffect, useMemo, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { canPerformBackendAction } from '../../auth/policies/access-policy'
import { useAuthSession } from '../../auth/context/useAuthSession'
import {
  getAcademicHierarchy,
  getAcademicWorkflowContext,
  saveAcademicRecord,
  setAcademicRecordStatus,
} from '../api/academic-api'
import type {
  AcademicEntityKind,
  AcademicFilters,
  AcademicHierarchyOrganization,
  AcademicRecordDraft,
  AcademicWorkflowContext,
} from '../types/academic.types'

const emptyFilters: AcademicFilters = { search: '', includeInactive: false }

export function useAcademicStructure(filters: AcademicFilters = emptyFilters) {
  const { session } = useAuthSession()
  const { search, organizationId, includeInactive } = filters
  const [hierarchy, setHierarchy] = useState<AcademicHierarchyOrganization[] | null>(null)
  const [context, setContext] = useState<AcademicWorkflowContext | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(session))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestVersion, setRequestVersion] = useState(0)

  const retry = useCallback(() => setRequestVersion((value) => value + 1), [])

  useEffect(() => {
    if (!session) {
      setHierarchy(null)
      setContext(null)
      setError(null)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    Promise.all([
      getAcademicHierarchy(session.accessToken, { search, organizationId, includeInactive }, controller.signal),
      getAcademicWorkflowContext(session.accessToken, controller.signal),
    ])
      .then(([nextHierarchy, nextContext]) => {
        setHierarchy(nextHierarchy)
        setContext(nextContext)
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason : new Error('Unable to load academic structure.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [session, search, organizationId, includeInactive, requestVersion])

  const submitRecord = useCallback(async (draft: AcademicRecordDraft) => {
    if (!session) throw new Error('An authenticated session is required.')
    setIsSubmitting(true)
    try {
      await saveAcademicRecord(draft, session.accessToken)
      retry()
    } finally {
      setIsSubmitting(false)
    }
  }, [session, retry])

  const changeStatus = useCallback(async (kind: AcademicEntityKind, id: number, isActive: boolean) => {
    if (!session) throw new Error('An authenticated session is required.')
    setIsSubmitting(true)
    try {
      await setAcademicRecordStatus(kind, id, isActive, session.accessToken)
      retry()
    } finally {
      setIsSubmitting(false)
    }
  }, [session, retry])

  const canManageAcademicStructure = useMemo(
    () => canPerformBackendAction(context?.actions ?? [], 'manage_academic_structure'),
    [context],
  )
  const isAdmin = context?.user.effectiveRoles.includes('ADMIN') ?? false

  return {
    hierarchy,
    context,
    error,
    isLoading,
    isSubmitting,
    isEmpty: hierarchy?.length === 0,
    isForbidden: error instanceof HttpError && error.status === 403,
    isUnauthorized: error instanceof HttpError && error.status === 401,
    isUnauthenticated: !session,
    canManageAcademicStructure,
    canManageOrganizations: canManageAcademicStructure && isAdmin,
    retry,
    submitRecord,
    changeStatus,
  }
}
