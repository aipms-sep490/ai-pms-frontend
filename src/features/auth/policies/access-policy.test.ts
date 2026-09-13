import { describe, expect, it } from 'vitest'
import { canAccess, canPerformBackendAction, hasAnyRole, type AuthorizationContext } from './access-policy'

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

  it('uses backend-evaluated actions instead of inventing a permission code', () => {
    expect(canPerformBackendAction([
      { code: 'manage_academic_structure', allowed: true, reasons: [] },
    ], 'manage_academic_structure')).toBe(true)
    expect(canPerformBackendAction([
      { code: 'manage_academic_structure', allowed: false, reasons: ['ACADEMIC_MANAGER_REQUIRED'] },
    ], 'manage_academic_structure')).toBe(false)
  })
})
