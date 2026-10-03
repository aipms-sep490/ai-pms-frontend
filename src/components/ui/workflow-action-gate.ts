import type { WorkflowActionDto } from '../../types/backend'

export type WorkflowActionGateState = 'allowed' | 'denied' | 'loading' | 'unavailable'

export function resolveWorkflowActionGate(actions: readonly WorkflowActionDto[] | null, code: string, status: 'ready' | 'loading' | 'unknown' | 'unavailable'): { state: WorkflowActionGateState; reasons: readonly string[] } {
  if (status === 'loading' || status === 'unknown') return { state: 'loading', reasons: [] }
  if (status === 'unavailable' || !actions) return { state: 'unavailable', reasons: [] }
  const action = actions.find((item) => item.code === code)
  if (!action || !action.allowed) return { state: 'denied', reasons: action?.reasons ?? [] }
  return { state: 'allowed', reasons: [] }
}
