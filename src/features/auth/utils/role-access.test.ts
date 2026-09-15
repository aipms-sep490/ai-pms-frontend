import { describe, expect, it } from 'vitest'
import { getHomePath, getWorkspaceRole } from './role-access'

describe('role-based workspace', () => {
  it('uses backend roles to select the proper landing page', () => {
    expect(getHomePath({ roles: ['STUDENT'] })).toBe('/project/workspace')
    expect(getHomePath({ roles: ['LECTURER'] })).toBe('/supervisor/workspace')
    expect(getHomePath({ roles: ['DEPARTMENT_STAFF'] })).toBe('/department/projects/review')
    expect(getHomePath({ roles: ['ADMIN'] })).toBe('/admin/access')
  })

  it('does not interpret a lecturer as department staff and handles unknown roles', () => {
    expect(getWorkspaceRole({ roles: ['LECTURER'] })).toBe('lecturer')
    expect(getHomePath({ roles: ['OTHER'] })).toBe('/profile')
  })

  it('gives the administrative role precedence for multi-role accounts', () => {
    expect(getWorkspaceRole({ roles: ['STUDENT', 'DEPARTMENT_STAFF'] })).toBe('department')
    expect(getWorkspaceRole({ roles: ['LECTURER', 'ADMIN'] })).toBe('admin')
  })
})
