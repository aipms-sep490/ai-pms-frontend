import { useCallback, useEffect, useMemo, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { canPerformBackendAction } from '../../auth/policies/access-policy'
import { useAuthSession } from '../../auth/context/useAuthSession'
import {
  getAcademicHierarchy,
  deleteAcademicRecord,
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
  const [resolved, setResolved] = useState<{
    key: string
    token: string
    hierarchy: AcademicHierarchyOrganization[] | null
    context: AcademicWorkflowContext | null
    error: Error | null
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestVersion, setRequestVersion] = useState(0)

  const retry = useCallback(() => setRequestVersion((value) => value + 1), [])
  const requestKey = session ? `${session.accessToken}:${search}:${organizationId ?? ''}:${includeInactive}:${requestVersion}` : ''

  useEffect(() => {
    if (!session) return
    const controller = new AbortController()
    const key = `${session.accessToken}:${search}:${organizationId ?? ''}:${includeInactive}:${requestVersion}`
    const token = session.accessToken

    Promise.all([
      getAcademicHierarchy(token, { search, organizationId, includeInactive }, controller.signal),
      getAcademicWorkflowContext(token, controller.signal),
    ])
      .then(([nextHierarchy, nextContext]) => {
        if (!controller.signal.aborted) {
          setResolved({ key, token, hierarchy: nextHierarchy, context: nextContext, error: null })
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setResolved((current) => ({
            key,
            token,
            hierarchy: current?.token === token ? current.hierarchy : null,
            context: current?.token === token ? current.context : null,
            error: reason instanceof Error ? reason : new Error('Unable to load academic structure.'),
          }))
        }
      })

    return () => controller.abort()
  }, [session, search, organizationId, includeInactive, requestVersion])

  const hierarchy = session && resolved?.token === session.accessToken ? resolved.hierarchy : null
  const context = session && resolved?.token === session.accessToken ? resolved.context : null
  const error = session && resolved?.key === requestKey ? resolved.error : null
  const isLoading = Boolean(session) && resolved?.key !== requestKey

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
    deleteRecord: async (kind: AcademicEntityKind, id: number) => {
      if (!session) throw new Error('Cần đăng nhập để tiếp tục.')
      setIsSubmitting(true)
      try { await deleteAcademicRecord(kind, id, session.accessToken); retry() }
      finally { setIsSubmitting(false) }
    },
  }
}
