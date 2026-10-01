import { describe, expect, it } from 'vitest'
import { getWorkspaceNavigation, workspaceRouteRegistry } from './workspace-route-registry'
import type { WorkspaceAccess } from '../context/workspace-access'

const access = (overrides: Partial<WorkspaceAccess>): WorkspaceAccess => ({
  identityRole: 'unknown', identityRoles: [], permissions: [], departmentIds: [], majorIds: [], selectedSemesterId: null,
  teamId: null, projectId: null, projectState: null, assignments: [], teamActions: null, projectActions: null,
  contextStatus: 'ready', contextError: null, actionStatus: 'unknown', assignmentStatus: 'unknown', isWorkflowActionAllowed: () => false,
  ...overrides,
})

describe('workspace route registry', () => {
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
    expect(admin.map((route) => route.id)).toContain('administration-access')
    expect(admin.map((route) => route.id)).not.toContain('governance-review')
  })

  it('does not reveal contextual links while context is loading or unavailable', () => {
    expect(getWorkspaceNavigation(access({ identityRole: 'student', identityRoles: ['STUDENT'], contextStatus: 'loading' }))).toEqual([])
    expect(getWorkspaceNavigation(access({ identityRole: 'student', identityRoles: ['STUDENT'], contextStatus: 'unavailable', projectId: 4, projectState: 'ACTIVE' })).map((route) => route.id)).not.toContain('student-tasks')
  })
})
