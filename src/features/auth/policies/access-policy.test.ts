import { describe, expect, it } from 'vitest'
import {
  canAccess,
  canPerformBackendAction,
  hasAnyRole,
  hasDepartmentScope,
  hasMajorScope,
  hasPermission,
  hasRole,
  type AuthorizationContext,
} from './access-policy'

const studentProjectContext: AuthorizationContext = {
  roles: ['STUDENT'],
  permissions: ['project.lifecycle.read'],
  departmentIds: [14],
  majorIds: [29],
  projectId: 'project-123',
  projectState: 'ACTIVE',
  isProjectMember: true,
}

describe('access policy', () => {
  it('requires permission, state, and project membership together', () => {
    expect(
      canAccess(studentProjectContext, {
        requiredPermissions: ['project.lifecycle.read'],
        allowedProjectStates: ['ACTIVE'],
        requireProjectMembership: true,
      }),
    ).toBe(true)
  })

  it('does not let a matching role replace a missing permission', () => {
    expect(
      canAccess(
        { ...studentProjectContext, permissions: [] },
        { requiredPermissions: ['project.lifecycle.read'] },
      ),
    ).toBe(false)
  })

  it('rejects a valid permission outside the allowed project state', () => {
    expect(
      canAccess(
        { ...studentProjectContext, projectState: 'ARCHIVED' },
        { allowedProjectStates: ['ACTIVE'] },
      ),
    ).toBe(false)
  })

  it('limits identity-role checks to backend global roles', () => {
    expect(hasRole(studentProjectContext, 'STUDENT')).toBe(true)
    expect(hasAnyRole(studentProjectContext, ['STUDENT'])).toBe(true)
    expect(hasAnyRole(studentProjectContext, ['LECTURER'])).toBe(false)
  })

  it('uses server-derived permissions and academic scope predicates', () => {
    expect(hasPermission(studentProjectContext, 'project.lifecycle.read')).toBe(true)
    expect(hasPermission(studentProjectContext, 'department.manage')).toBe(false)
    expect(hasDepartmentScope(studentProjectContext, 14)).toBe(true)
    expect(hasDepartmentScope(studentProjectContext, 99)).toBe(false)
    expect(hasMajorScope(studentProjectContext, 29)).toBe(true)
    expect(hasMajorScope(studentProjectContext, 30)).toBe(false)
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
