import { useEffect, useMemo, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import type { WorkflowActionDto } from '../../../types/backend'

export type ExecutionCapabilityState = 'loading' | 'allowed' | 'denied' | 'unsupported_contract' | 'unavailable'
export type ExecutionContractStatus = Exclude<ExecutionCapabilityState, 'allowed' | 'denied'> | 'ready'

export interface ExecutionActionCapability {
  state: ExecutionCapabilityState
  allowed: boolean
  reasons: readonly string[]
}

export interface ExecutionActionCapabilities<T extends { actions: readonly WorkflowActionDto[] }> {
  status: ExecutionContractStatus
  data: T | null
  get: (code: string) => ExecutionActionCapability
}

/** Keeps a missing proposed route separate from an unavailable service. */
export function classifyExecutionContractError(error: unknown): ExecutionContractStatus {
  if (error instanceof HttpError && [404, 405, 501].includes(error.status)) return 'unsupported_contract'
  if (error instanceof HttpError && error.status === 403) return 'ready'
  return 'unavailable'
}

/** Resolves one published capability without deriving permission from frontend identity. */
export function resolveExecutionActionCapability(
  actions: readonly WorkflowActionDto[] | null,
  status: ExecutionContractStatus,
  code: string,
): ExecutionActionCapability {
  if (status === 'loading') return { state: 'loading', allowed: false, reasons: [] }
  if (status === 'unsupported_contract') return { state: 'unsupported_contract', allowed: false, reasons: ['UNSUPPORTED_CONTRACT'] }
  if (status === 'unavailable') return { state: 'unavailable', allowed: false, reasons: ['CONTRACT_UNAVAILABLE'] }
  if (!actions) return { state: 'denied', allowed: false, reasons: ['PROJECT_ACCESS_DENIED'] }
  const action = actions.find(item => item.code === code)
  if (!action) return { state: 'denied', allowed: false, reasons: ['ACTION_NOT_PUBLISHED'] }
  if (!action.allowed) return { state: 'denied', allowed: false, reasons: action.reasons }
  return { state: 'allowed', allowed: true, reasons: [] }
}

/** Central adapter for proposed execution-action endpoints. It never falls back to identity flags. */
export function useExecutionActionCapabilities<T extends { actions: readonly WorkflowActionDto[] }>(
  resourceId: number | undefined,
  reader: (id: number) => Promise<T>,
  refreshKey = 0,
): ExecutionActionCapabilities<T> {
  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<ExecutionContractStatus>('loading')

  useEffect(() => {
    let active = true
    setData(null)
    if (!resourceId || !Number.isSafeInteger(resourceId) || resourceId < 1) {
      setStatus('unsupported_contract')
      return () => { active = false }
    }
    setStatus('loading')
    void reader(resourceId).then(result => {
      if (!active) return
      setData(result)
      setStatus('ready')
    }).catch(error => {
      if (!active) return
      setStatus(classifyExecutionContractError(error))
    })
    return () => { active = false }
  }, [reader, refreshKey, resourceId])

  return useMemo(() => ({
    status,
    data,
    get: (code: string) => resolveExecutionActionCapability(data?.actions ?? null, status, code),
  }), [data, status])
}
