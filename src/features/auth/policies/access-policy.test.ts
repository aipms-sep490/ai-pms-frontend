import { describe, expect, it } from 'vitest'
import { canAccess, hasAnyRole, type AuthorizationContext } from './access-policy'

const leaderContext: AuthorizationContext = {
  roles: ['STUDENT_LEADER'],
  permissions: ['project.lifecycle.read'],
  projectId: 'project-123',
  projectState: 'ACTIVE',
  isProjectMember: true,
}

describe('access policy', () => {
  it('requires permission, state, and project membership together', () => {
    expect(
      canAccess(leaderContext, {
        requiredPermissions: ['project.lifecycle.read'],
        allowedProjectStates: ['ACTIVE'],
        requireProjectMembership: true,
      }),
    ).toBe(true)
  })

  it('does not let a matching role replace a missing permission', () => {
    expect(
      canAccess(
        { ...leaderContext, permissions: [] },
        { requiredPermissions: ['project.lifecycle.read'] },
      ),
    ).toBe(false)
  })

  it('rejects a valid permission outside the allowed project state', () => {
    expect(
      canAccess(
        { ...leaderContext, projectState: 'ARCHIVED' },
        { allowedProjectStates: ['ACTIVE'] },
      ),
    ).toBe(false)
  })

  it('keeps role checks separate for navigation and presentation', () => {
    expect(hasAnyRole(leaderContext, ['STUDENT_LEADER'])).toBe(true)
    expect(hasAnyRole(leaderContext, ['SUPERVISOR'])).toBe(false)
  })
})
