import { isValidElement } from 'react'
import { matchRoutes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
// Include conditional destinations so the consistency scan does not silently skip disabled rollouts.
vi.mock('../config/env', async importOriginal => {
  const { env } = await importOriginal<typeof import('../config/env')>()
  return { env: { ...env, academicAiAssistantEnabled: true, aiAdvisoryEnabled: true, coldReportEnabled: true,
    defenseScheduleEnabled: true, gatesEnabled: true, industryEnabled: true, peerEvaluationEnabled: true,
    resultCorrectionEnabled: true, weeklyAssessmentEnabled: true, workflowPreviewEnabled: true, workingAgreementEnabled: true } }
})
import { appRouter } from './index'
import { getWorkspaceNavigation, workspaceRouteRegistry } from './workspace-route-registry'
import type { WorkspaceAccess } from '../context/workspace-access'
import { RoleRoute } from '../../features/auth/components/RoleRoute'
import type { WorkspaceRole } from '../../features/auth/utils/role-access'

const identityRole: Record<string, WorkspaceRole> = { STUDENT: 'student', LECTURER: 'lecturer', DEPARTMENT_STAFF: 'department', ADMIN: 'admin' }

const access = (overrides: Partial<WorkspaceAccess>): WorkspaceAccess => ({
  identityRole: 'unknown', identityRoles: [], permissions: [], departmentIds: [], departments: [], majorIds: [], selectedSemesterId: null,
  teamId: null, projectId: null, projectState: null, assignments: [], teamActions: null, projectActions: null,
  contextStatus: 'ready', contextError: null, actionStatus: 'unknown', assignmentStatus: 'unknown', isWorkflowActionAllowed: () => false,
  ...overrides,
})

describe('workspace route registry', () => {
  it.each(workspaceRouteRegistry.filter(route => route.navigationVisibility === 'always' && route.featureEnabled !== false))(
    'keeps $id visible only to identities accepted by its actual route', route => {
      const matches = matchRoutes(appRouter.routes, route.path)
      expect(matches, `${route.id} must resolve to a registered route`).not.toBeNull()
      expect(matches?.at(-1)?.route.path, `${route.id} must not resolve to the not-found fallback`).not.toBe('*')
      for (const role of route.identityRoles) {
        expect(identityRole[role], `${route.id} has an unmapped identity ${role}`).toBeDefined()
        for (const match of matches ?? []) {
          const element = match.route.element
          if (isValidElement<{ allowed: readonly WorkspaceRole[] }>(element) && element.type === RoleRoute) {
            expect(element.props.allowed, `${route.id} exposes ${role} outside its route guard`).toContain(identityRole[role])
          }
        }
      }
    },
  )

  it('has unique IDs and paths for migrated app-shell routes', () => {
    expect(new Set(workspaceRouteRegistry.map((route) => route.id)).size).toBe(workspaceRouteRegistry.length)
    expect(new Set(workspaceRouteRegistry.map((route) => route.path)).size).toBe(workspaceRouteRegistry.length)
  })

  it('keeps student-member and student-leader navigation project-contextual without inventing a role', () => {
    const member = getWorkspaceNavigation(access({ identityRole: 'student', identityRoles: ['STUDENT'], projectId: 4, projectState: 'ACTIVE', assignments: ['TEAM_MEMBER'] }))
    const leader = getWorkspaceNavigation(access({ identityRole: 'student', identityRoles: ['STUDENT'], projectId: 4, projectState: 'ACTIVE', assignments: ['TEAM_LEADER'] }))
    expect(member.map((route) => route.path)).toContain('/project/tasks')
    expect(leader.map((route) => route.path)).toEqual(member.map((route) => route.path))
  })

  it('does not expose evaluator navigation to a lecturer without a persisted evaluator capability', () => {
    const lecturer = getWorkspaceNavigation(access({ identityRole: 'lecturer', identityRoles: ['LECTURER'] }))
    const evaluator = getWorkspaceNavigation(access({ identityRole: 'lecturer', identityRoles: ['LECTURER'], assignments: ['EVALUATOR'] }))
    expect(lecturer.map((route) => route.id)).not.toContain('evaluator-work')
    expect(evaluator.map((route) => route.id)).toContain('evaluator-work')
  })

  it('keeps department academic governance distinct from platform administration', () => {
    const department = getWorkspaceNavigation(access({ identityRole: 'department', identityRoles: ['DEPARTMENT_STAFF'] }))
    const admin = getWorkspaceNavigation(access({ identityRole: 'admin', identityRoles: ['ADMIN'] }))
    expect(department.map((route) => route.id)).toContain('governance-review')
    expect(department.map((route) => route.path)).toEqual(expect.arrayContaining(['/department/workspace', '/department/student-qualifications', '/department/projects/archived']))
    expect(admin.map((route) => route.id)).toContain('administration-access')
    expect(admin.map((route) => route.id)).not.toContain('governance-review')
    expect(admin.map((route) => route.id)).not.toContain('governance-qualifications')
    expect(admin.map((route) => route.id)).not.toContain('governance-archives')
  })

  it('shows the department progress matrix to staff without promising Admin access', () => {
    const department = getWorkspaceNavigation(access({ identityRole: 'department', identityRoles: ['DEPARTMENT_STAFF'] }))
    const admin = getWorkspaceNavigation(access({ identityRole: 'admin', identityRoles: ['ADMIN'] }))
    expect(department.map(route => route.id)).toContain('governance-progress-matrix')
    expect(admin.map(route => route.id)).not.toContain('governance-progress-matrix')
  })

  it('shows the reviewer queue to lecturers without promising Department Staff access', () => {
    const department = getWorkspaceNavigation(access({ identityRole: 'department', identityRoles: ['DEPARTMENT_STAFF'] }))
    const lecturer = getWorkspaceNavigation(access({ identityRole: 'lecturer', identityRoles: ['LECTURER'] }))
    expect(lecturer.map(route => route.id)).toContain('reviewer-gate-assignments')
    expect(department.map(route => route.id)).not.toContain('reviewer-gate-assignments')
  })

  it('does not reveal contextual links while context is loading or unavailable', () => {
    expect(getWorkspaceNavigation(access({ identityRole: 'student', identityRoles: ['STUDENT'], contextStatus: 'loading' }))).toEqual([])
    expect(getWorkspaceNavigation(access({ identityRole: 'student', identityRoles: ['STUDENT'], contextStatus: 'unavailable', projectId: 4, projectState: 'ACTIVE' })).map((route) => route.id)).not.toContain('student-tasks')
  })

  it('organizes active student navigation into 5 distinct journey groups', () => {
    const studentRoutes = getWorkspaceNavigation(access({ identityRole: 'student', identityRoles: ['STUDENT'], projectId: 1, projectState: 'ACTIVE' }))
      .filter((route) => route.section === 'student')

    const groups = Array.from(new Set(studentRoutes.map((r) => r.group).filter(Boolean)))
    expect(groups).toEqual([
      '1. Điều phối & Tiến độ',
      '2. Thực thi công việc',
      '3. Tương tác & Hỗ trợ',
      '4. Nghiệm thu & Bảo vệ',
      '5. Hồ sơ & Đề tài',
    ])
    // Verify key destinations in their respective groups
    expect(studentRoutes.find((r) => r.path === '/project/timeline')?.group).toBe('1. Điều phối & Tiến độ')
    expect(studentRoutes.find((r) => r.path === '/project/tasks')?.group).toBe('2. Thực thi công việc')
    expect(studentRoutes.find((r) => r.path === '/project/contributions')?.group).toBe('3. Tương tác & Hỗ trợ')
    expect(studentRoutes.find((r) => r.path === '/project/final-submission')?.group).toBe('4. Nghiệm thu & Bảo vệ')
    expect(studentRoutes.find((r) => r.path === '/projects/lifecycle')?.group).toBe('5. Hồ sơ & Đề tài')
  })
})

