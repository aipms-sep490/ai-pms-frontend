import { isValidElement } from 'react'
import { matchRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const flags = vi.hoisted(() => ({ resultCorrectionEnabled: true, defenseScheduleEnabled: true }))
vi.mock('../../app/config/env', async importOriginal => {
  const { env } = await importOriginal<typeof import('../../app/config/env')>()
  return { env: { ...env, get resultCorrectionEnabled() { return flags.resultCorrectionEnabled }, get defenseScheduleEnabled() { return flags.defenseScheduleEnabled } } }
})
import { resolveNotificationLink } from './notification-link-resolver'
import { appRouter } from '../../app/router'
import { RoleRoute } from '../auth/components/RoleRoute'
import { getWorkspaceRole } from '../auth/utils/role-access'

// Independent producer/legacy inventory; IDs below identify the entity in column two.
const cases: Array<[string[], string, Partial<Record<string, string>>]> = [
  [['TEAM_INVITATION_SENT', 'TEAM_INVITATION_ACCEPTED', 'TEAM_INVITATION_REJECTED', 'TEAM_INVITATION_CANCELLED'], 'TEAM_INVITATION', { STUDENT: '/team' }],
  [['TEAM_LEADER_CHANGE_REQUESTED', 'TEAM_LEADER_CHANGE_APPROVED', 'TEAM_LEADER_CHANGE_REJECTED'], 'TEAM_LEADER_CHANGE_REQUEST', { STUDENT: '/team', LECTURER: '/supervisor/workspace' }],
  [['SUPERVISOR_REQUEST_SENT', 'SUPERVISOR_REQUEST_ACCEPTED', 'SUPERVISOR_REQUEST_REJECTED', 'SUPERVISOR_REQUEST_CANCELLED', 'SUPERVISOR_REPLACED'], 'SUPERVISOR_REQUEST', { STUDENT: '/project/supervisor', LECTURER: '/supervisor/workspace' }],
  [['PROJECT_APPROVED', 'PROJECT_REJECTED', 'PROJECT_REVISION_REQUESTED', 'PROJECT_UPDATED'], 'PROJECT', { STUDENT: '/projects/lifecycle', LECTURER: '/supervisor/workspace', DEPARTMENT_STAFF: '/department/projects/review/17' }],
  [['SUPERVISOR_FEEDBACK_ADDED', 'PROGRESS_REPORT_SUBMITTED'], 'PROGRESS_REPORT', { STUDENT: '/project/reports/17', LECTURER: '/supervisor/workspace' }],
  [['TASK_DEADLINE_REMINDER', 'TASK_OVERDUE'], 'TASK', { STUDENT: '/project/tasks/17', LECTURER: '/supervisor/workspace' }],
  [['DELIVERABLE_DEADLINE_REMINDER', 'DELIVERABLE_OVERDUE', 'DELIVERABLE_SUBMITTED', 'DELIVERABLE_FEEDBACK_ADDED'], 'DELIVERABLE_VERSION', { STUDENT: '/project/deliverables', LECTURER: '/supervisor/workspace' }],
  [['MEETING_SCHEDULED', 'MEETING_START_REMINDER'], 'MEETING', { STUDENT: '/project/meetings/17', LECTURER: '/calendar' }],
  [['MEETING_ACTION_ASSIGNED'], 'MEETING_ACTION_ITEM', { STUDENT: '/project/meetings', LECTURER: '/calendar' }],
  [['FINAL_SUBMISSION_LOCKED', 'FINAL_SUBMISSION_DEADLINE_REMINDER', 'FINAL_SUBMISSION_OVERDUE'], 'PROJECT', { STUDENT: '/project/final-submission', LECTURER: '/supervisor/workspace', DEPARTMENT_STAFF: '/department/projects/17/final-submission' }],
  [['PROJECT_RESULT_PUBLISHED', 'STUDENT_RESULT_PUBLISHED'], 'STUDENT_RESULT', { STUDENT: '/project/result' }],
  [['PROJECT_RISK_MEDIUM', 'PROJECT_RISK_HIGH', 'PROJECT_RISK_CRITICAL'], 'PROJECT', { STUDENT: '/project/overview', LECTURER: '/supervisor/workspace', DEPARTMENT_STAFF: '/department/portfolio' }],
  [['DEFENSE_SCHEDULED', 'DEFENSE_CANCELLED'], 'DEFENSE_SESSION', { STUDENT: '/project/defense', LECTURER: '/calendar' }],
  [['EVALUATOR_ASSIGNED'], 'EVALUATION_ASSIGNMENT', { LECTURER: '/evaluator/assignments/17' }],
  [['EVALUATION_FINALIZED'], 'EVALUATION', { DEPARTMENT_STAFF: '/department/portfolio' }],
  [['APPEAL_REQUESTED', 'APPEAL_REVIEWER_ASSIGNED', 'APPEAL_REVIEWED', 'APPEAL_DECIDED'], 'PROJECT', { STUDENT: '/project/result', LECTURER: '/review/projects/17/corrections', DEPARTMENT_STAFF: '/review/projects/17/corrections' }],
  [['REVIEW_GATE_UPDATED', 'REVIEW_DEADLINE_APPROACHING', 'GATE_REVISION_REQUIRED', 'EVIDENCE_VERIFIED', 'GATE_DECISION_RECORDED', 'DISCIPLINE_REVIEW_PENDING', 'DISCIPLINE_DECISION_RECORDED', 'DEFENSE_READINESS_CHANGED'], 'PROJECT_GATE', { STUDENT: '/project/timeline', LECTURER: '/supervisor/workspace', DEPARTMENT_STAFF: '/department/projects/progress-matrix' }],
  [['GATE_REVIEW_ASSIGNED', 'GATE_REVIEW_SUBMITTED', 'GATE_REVISION_SUBMITTED'], 'PROJECT_GATE', { STUDENT: '/project/timeline', LECTURER: '/review/gate-assignments', DEPARTMENT_STAFF: '/department/projects/progress-matrix' }],
  [['REVIEW_POLICY_PUBLISHED'], 'PROJECT_PERIOD', { STUDENT: '/project/timeline', LECTURER: '/supervisor/workspace', DEPARTMENT_STAFF: '/department/projects/progress-matrix', ADMIN: '/academic/review-gates' }],
  [['INDUSTRY_INVITATION'], 'USER', {}],
]
const rows = cases.flatMap(([types, entity, destinations]) => types.map(type => ({ type, entity, destinations })))
const roles = ['STUDENT', 'LECTURER', 'DEPARTMENT_STAFF', 'ADMIN']
const item = (type: string, entity: string, id: number | null = 17) => ({ notificationType: type, relatedEntityType: entity, relatedEntityId: id })
beforeEach(() => { flags.resultCorrectionEnabled = true; flags.defenseScheduleEnabled = true })

describe('recipient notification destinations', () => {
  it.each(rows)('maps $type for every identity to the intended screen or null', ({ type, entity, destinations }) => {
    for (const role of roles) {
      const link = resolveNotificationLink(item(type, entity), [role])
      expect(link?.url ?? null).toBe(destinations[role] ?? null)
      if (link) {
        const matches = matchRoutes(appRouter.routes, link.url)
        expect(matches, `${type}/${role} has a real route`).not.toBeNull()
        expect(matches?.at(-1)?.route.path).not.toBe('*')
        for (const match of matches ?? []) {
          const element = match.route.element
          if (isValidElement<{ allowed: readonly string[] }>(element) && element.type === RoleRoute) {
            expect(element.props.allowed, `${type}/${role} must pass the destination identity guard`).toContain(getWorkspaceRole({ roles: [role] }))
          }
        }
      }
    }
  })

  it.each([null, 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects an unsafe external entity ID %s', id => {
    expect(resolveNotificationLink(item('TEAM_INVITATION_SENT', 'TEAM_INVITATION', id), ['STUDENT'])).toBeNull()
  })
  it('rejects absent/wrong entity types and unknown or inherited event names', () => {
    for (const type of ['FUTURE_EVENT', '__proto__', 'constructor', 'GATE_FUTURE']) expect(resolveNotificationLink(item(type, 'PROJECT'), ['STUDENT'])).toBeNull()
    expect(resolveNotificationLink(item('MEETING_SCHEDULED', 'PROJECT'), ['STUDENT'])).toBeNull()
    expect(resolveNotificationLink({ ...item('TEAM_INVITATION_SENT', 'TEAM_INVITATION'), relatedEntityType: null }, ['STUDENT'])).toBeNull()
  })
  it('uses parent IDs for report/meeting feedback without treating request IDs as project IDs', () => {
    expect(resolveNotificationLink(item('SUPERVISOR_FEEDBACK_ADDED', 'MEETING'), ['STUDENT'])?.url).toBe('/project/meetings/17')
    expect(resolveNotificationLink(item('SUPERVISOR_FEEDBACK_ADDED', 'DELIVERABLE_VERSION'), ['STUDENT'])?.url).toBe('/project/deliverables')
    expect(resolveNotificationLink(item('SUPERVISOR_REQUEST_SENT', 'SUPERVISOR_REQUEST'), ['LECTURER'])?.url).toBe('/supervisor/workspace')
    expect(resolveNotificationLink(item('STUDENT_RESULT_PUBLISHED', 'STUDENT_RESULT'), ['STUDENT'])?.url).toBe('/project/result')
  })
  it('closes gated destinations when rollout flags are off but keeps core Review Gates independent', () => {
    flags.resultCorrectionEnabled = false; flags.defenseScheduleEnabled = false
    expect(resolveNotificationLink(item('APPEAL_DECIDED', 'PROJECT'), ['STUDENT'])).toBeNull()
    expect(resolveNotificationLink(item('DEFENSE_SCHEDULED', 'DEFENSE_SESSION'), ['LECTURER'])).toBeNull()
    expect(resolveNotificationLink(item('REVIEW_GATE_UPDATED', 'PROJECT_GATE'), ['STUDENT'])?.url).toBe('/project/timeline')
  })
  it.each([
    ['GATE_REVIEW_ASSIGNED', 'PROJECT_GATE', ['ADMIN', 'LECTURER'], '/review/gate-assignments'],
    ['GATE_REVIEW_ASSIGNED', 'PROJECT_GATE', ['DEPARTMENT_STAFF', 'LECTURER'], '/review/gate-assignments'],
    ['GATE_REVIEW_ASSIGNED', 'PROJECT_GATE', ['LECTURER', 'DEPARTMENT_STAFF'], '/review/gate-assignments'],
    ['REVIEW_POLICY_PUBLISHED', 'PROJECT_PERIOD', ['DEPARTMENT_STAFF', 'LECTURER'], '/department/projects/progress-matrix'],
    ['REVIEW_POLICY_PUBLISHED', 'PROJECT_PERIOD', ['LECTURER', 'ADMIN'], '/academic/review-gates'],
    ['TEAM_INVITATION_SENT', 'TEAM_INVITATION', ['ADMIN', 'STUDENT'], '/team'],
    ['PROJECT_APPROVED', 'PROJECT', ['ADMIN'], null],
    ['GATE_REVIEW_ASSIGNED', 'PROJECT_GATE', ['admin', 'lecturer'], '/review/gate-assignments'],
  ])('resolves %s by the recipient roles and event priority', (type, entity, identities, url) => {
    const link = resolveNotificationLink(item(type, entity), identities as string[])
    expect(link?.url ?? null).toBe(url)
    if (link) {
      const matches = matchRoutes(appRouter.routes, link.url)
      expect(matches?.at(-1)?.route.path).not.toBe('*')
      expect(matches).not.toBeNull()
      for (const match of matches ?? []) {
        const element = match.route.element
        if (isValidElement<{ allowed: readonly string[] }>(element) && element.type === RoleRoute) {
          expect(element.props.allowed.some(role => (identities as string[]).some(identity => getWorkspaceRole({ roles: [identity] }) === role))).toBe(true)
        }
      }
    }
  })
  it('fails closed when none of the recipient identities has an event destination', () => {
    expect(resolveNotificationLink(item('PROJECT_APPROVED', 'PROJECT'), [] )).toBeNull()
    expect(resolveNotificationLink(item('PROJECT_APPROVED', 'PROJECT'), ['UNKNOWN'])).toBeNull()
  })
})
