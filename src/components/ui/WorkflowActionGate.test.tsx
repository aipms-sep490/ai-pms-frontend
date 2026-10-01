import { describe, expect, it } from 'vitest'
import { resolveWorkflowActionGate } from './workflow-action-gate'

describe('resolveWorkflowActionGate', () => {
  it('allows only a backend-returned allowed action', () => {
    expect(resolveWorkflowActionGate([{ code: 'submit_project', allowed: true, reasons: [] }], 'submit_project', 'ready')).toMatchObject({ state: 'allowed' })
  })

  it('retains backend denial reasons without calling the mutation', () => {
    expect(resolveWorkflowActionGate([{ code: 'submit_project', allowed: false, reasons: ['WINDOW_CLOSED'] }], 'submit_project', 'ready')).toEqual({ state: 'denied', reasons: ['WINDOW_CLOSED'] })
  })

  it.each(['loading', 'unknown'] as const)('does not assume an action is allowed while %s', (status) => {
    expect(resolveWorkflowActionGate(null, 'submit_project', status)).toMatchObject({ state: 'loading' })
  })

  it('does not treat an unavailable action response as a denial or an allow', () => {
    expect(resolveWorkflowActionGate(null, 'submit_project', 'unavailable')).toMatchObject({ state: 'unavailable' })
  })

  it('uses the refreshed action collection as the source of truth', () => {
    expect(resolveWorkflowActionGate([{ code: 'submit_project', allowed: false, reasons: ['STALE'] }], 'submit_project', 'ready').state).toBe('denied')
    expect(resolveWorkflowActionGate([{ code: 'submit_project', allowed: true, reasons: [] }], 'submit_project', 'ready').state).toBe('allowed')
  })
})
