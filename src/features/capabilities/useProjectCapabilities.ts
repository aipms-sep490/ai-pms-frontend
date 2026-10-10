import { useCallback, useEffect, useMemo, useState } from 'react'
import { HttpError } from '../../services/http/http-client'
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

/**
 * BE-10 unified capabilities. Fetches the one map for a project and exposes
 * stable helpers so consumers can migrate off the per-resource action endpoints.
 */
export function useProjectCapabilities(projectId: number | undefined): UseProjectCapabilitiesResult {
  const [data, setData] = useState<ProjectCapabilities | null>(null)
  const [loading, setLoading] = useState(Boolean(projectId))
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!projectId) return
    const controller = new AbortController()
    void getMyCapabilities(projectId, controller.signal).then(result => {
      if (controller.signal.aborted) return
      setData(result); setError(null)
    }).catch(reason => {
      if (controller.signal.aborted) return
      setError(reason instanceof HttpError && reason.status === 403
        ? 'Bạn chưa có quyền xem các thao tác của đồ án này.'
        : 'Chưa tải được danh sách thao tác khả dụng.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, revision])

  const retry = useCallback(() => {
    setLoading(true); setError(null); setData(null); setRevision(value => value + 1)
  }, [])

  return useMemo<UseProjectCapabilitiesResult>(() => ({
    data, loading, error, retry,
    can: code => data?.capabilities[code] === true,
    reasonsFor: code => data?.blockedReasons[code] ?? [],
    reasonLabel: code => {
      if (data?.capabilities[code] === true) return null
      const first = data?.blockedReasons[code]?.[0]
      return first ? describeReason(first) : null
    },
  }), [data, loading, error, retry])
}
