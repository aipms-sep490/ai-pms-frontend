import { describe, expect, it } from 'vitest'
import { canUseProjectExecutionAction, canUseTaskExecutionAction } from './execution-authority'
import type { ExecutionAccess } from './context/ExecutionAccessContext'

const allowed = { state: 'allowed' as const, allowed: true, reasons: [] }
const denied = { state: 'denied' as const, allowed: false, reasons: ['PROJECT_ACCESS_DENIED'] }
function access(overrides: Partial<ExecutionAccess>): ExecutionAccess {
  return { project: { id: 9 } as never, actor: 'student', canManageStructure: false, routeBase: '/project', executionCapabilities: { status: 'ready', get: () => allowed }, ...overrides }
}

describe('execution authority compatibility gates', () => {
  it('only exposes structural project actions to a student leader or active primary supervisor', () => {
    expect(canUseProjectExecutionAction(access({ canManageStructure: true }), 'create_task')).toBe(true)
    expect(canUseProjectExecutionAction(access({}), 'create_task')).toBe(false)
    expect(canUseProjectExecutionAction(access({ actor: 'supervisor', supervisor: { isPrimary: true, assignmentType: 'PRIMARY', endedAt: null } as never }), 'schedule_meeting')).toBe(true)
    expect(canUseProjectExecutionAction(access({ actor: 'supervisor', supervisor: { isPrimary: false, assignmentType: 'DISCIPLINE_MENTOR', endedAt: null } as never }), 'schedule_meeting')).toBe(false)
  })

  it('keeps structural task actions out of the mentor route and fails closed on a denied capability', () => {
    const mentor = access({ actor: 'mentor', supervisor: { assignmentType: 'DISCIPLINE_MENTOR', majorId: 4, endedAt: null } as never })
    expect(canUseTaskExecutionAction(mentor, 'update_task', allowed, true)).toBe(false)
    expect(canUseTaskExecutionAction(mentor, 'change_task_status', allowed)).toBe(false)
    expect(canUseTaskExecutionAction(mentor, 'change_task_status', allowed, true)).toBe(true)
    expect(canUseTaskExecutionAction(mentor, 'add_task_evidence', allowed, true)).toBe(true)
    expect(canUseTaskExecutionAction(mentor, 'change_task_status', denied, true)).toBe(false)
  })
})
