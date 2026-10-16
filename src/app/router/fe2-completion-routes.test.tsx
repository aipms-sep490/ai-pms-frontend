import { isValidElement } from 'react'
import { matchRoutes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
vi.mock('../config/env', async importOriginal => {
  const { env } = await importOriginal<typeof import('../config/env')>()
  return { env: { ...env, workingAgreementEnabled: true, resultCorrectionEnabled: true, industryEnabled: true } }
})
import { appRouter } from './index'
import { RoleRoute } from '../../features/auth/components/RoleRoute'
import { ActiveStudentProjectRoute } from '../../features/projects/components/ActiveStudentProjectRoute'
import { DepartmentAcademicScopeRoute } from '../../features/department/components/DepartmentAcademicScopeRoute'
import { AcademicWorkflowGate } from '../context/AcademicWorkflowGate'
import { getHomePath, getWorkspaceRole } from '../../features/auth/utils/role-access'
const elements = (path: string) => (matchRoutes(appRouter.routes, path) ?? []).map(match => match.route.element).filter(isValidElement)

describe('FE2 route boundaries', () => {
  it.each(['/academic/governance', '/academic/project-periods/3/policy'])('opens %s for Admin without a department assignment', path => {
    const rows = elements(path)
    expect(rows.find(row => row.type === RoleRoute)?.props).toEqual({ allowed: ['department', 'admin'] })
    expect(rows.some(row => row.type === DepartmentAcademicScopeRoute)).toBe(false)
  })
  it('keeps agreement outside ACTIVE while preserving the task execution guard', () => {
    expect(elements('/project/agreement').some(row => row.type === ActiveStudentProjectRoute)).toBe(false)
    expect(elements('/project/tasks').some(row => row.type === ActiveStudentProjectRoute)).toBe(true)
  })
  it('lets assigned lecturer reviewers open direct correction links without a department role', () => {
    const rows = elements('/review/projects/9/corrections?request=4')
    expect(rows.find(row => row.type === RoleRoute)?.props).toEqual({ allowed: ['department', 'lecturer'] })
    expect(rows.some(row => row.type === DepartmentAcademicScopeRoute)).toBe(false)
  })
  it.each(['/industry/workspace', '/industry/assignments/4'])('isolates %s from academic onboarding', path => {
    const rows = elements(path)
    expect(rows.length).toBeGreaterThan(1)
    expect(rows.some(row => row.type === RoleRoute || row.type === AcademicWorkflowGate || row.type === DepartmentAcademicScopeRoute)).toBe(false)
  })
  it('does not manufacture an academic role for a role-free expert session', () => {
    expect(getWorkspaceRole({ roles: [] })).toBe('unknown')
    expect(getHomePath({ roles: [] })).toBe('/industry/workspace')
    expect(getHomePath({ roles: ['LECTURER'] })).toBe('/supervisor/workspace')
    expect(getHomePath({ roles: ['ADMIN', 'LECTURER'] })).toBe('/admin/access')
  })
})
