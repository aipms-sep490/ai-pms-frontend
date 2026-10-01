import type { ReactNode } from 'react'
import type { WorkflowActionDto } from '../../types/backend'
import { resolveWorkflowActionGate, type WorkflowActionGateState } from './workflow-action-gate'

export type { WorkflowActionGateState } from './workflow-action-gate'

export function WorkflowActionGate({ actions, actionCode, status, children, denied = 'disabled' }: {
  actions: readonly WorkflowActionDto[] | null
  actionCode: string
  status: 'ready' | 'loading' | 'unknown' | 'unavailable'
  children: (gate: { state: WorkflowActionGateState; reasons: readonly string[]; allowed: boolean }) => ReactNode
  denied?: 'disabled' | 'hidden'
}) {
  const gate = resolveWorkflowActionGate(actions, actionCode, status)
  if (denied === 'hidden' && gate.state === 'denied') return null
  return <>{children({ ...gate, allowed: gate.state === 'allowed' })}</>
}
