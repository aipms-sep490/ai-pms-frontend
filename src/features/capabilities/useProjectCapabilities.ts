import { useCallback, useEffect, useState } from 'react'
import { HttpError } from '../../services/http/http-client'
import { useAuthSession } from '../auth/context/useAuthSession'
import { describeReason, getMyCapabilities } from './capabilities-api'
import type { CapabilityReasonCode, ProjectCapabilities } from './capabilities-types'

export interface UseProjectCapabilitiesResult {
  data: ProjectCapabilities | null
  loading: boolean
  error: string | null
  /** Whether the viewer may perform an action. Unknown codes default to false. */
  can: (code: string) => boolean
  /** Ordered blocked-reason codes for an action (empty when allowed or unknown). */
  reasonsFor: (code: string) => CapabilityReasonCode[]
  /** First blocked reason as a Vietnamese label, or null when allowed. */
  reasonLabel: (code: string) => string | null
  retry: () => void
}

/** Fail closed across project, identity, refresh and failed/unsupported contracts. */
export function useProjectCapabilities(projectId: number | undefined): UseProjectCapabilitiesResult {
  const { session } = useAuthSession()
  const [revision, setRevision] = useState(0)
  const [response, setResponse] = useState<{
    projectId: number; session: typeof session; revision: number; data: ProjectCapabilities | null; error: string | null
  } | null>(null)
  const valid = Boolean(session && projectId && Number.isSafeInteger(projectId) && projectId > 0)

  useEffect(() => {
    if (!valid || !projectId) return
    const controller = new AbortController()
    void getMyCapabilities(projectId, controller.signal).then(data => {
      if (!controller.signal.aborted) setResponse({ projectId, session, revision, data, error: null })
    }).catch(reason => {
      if (controller.signal.aborted) return
      const error = reason instanceof HttpError && reason.status === 403
        ? 'Bạn chưa có quyền xem các thao tác của đồ án này.'
        : 'Chưa xác minh được thao tác khả dụng. Hãy tải lại quyền trước khi tiếp tục.'
      setResponse({ projectId, session, revision, data: null, error })
    })
    return () => controller.abort()
  }, [projectId, revision, session, valid])

  const current = valid && response && response.projectId === projectId && response.session === session && response.revision === revision ? response : null
  const data = current?.data ?? null
  const can = (code: string) => data?.actions.find(action => action.code === code)?.allowed === true
  const reasonsFor = (code: string) => data?.actions.find(action => action.code === code)?.reasons ?? []
  const retry = useCallback(() => setRevision(value => value + 1), [])

  return {
    data, loading: valid && !current, error: current?.error ?? null, can, reasonsFor, retry,
    reasonLabel: code => {
      if (can(code)) return null
      const first = reasonsFor(code)[0]
      return first ? describeReason(first) : 'Hệ thống chưa cấp quyền thực hiện thao tác này.'
    },
  }
}
