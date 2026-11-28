import { describe, expect, it } from 'vitest'
import { matchRoutes, Navigate } from 'react-router-dom'
import { appRouter } from './index'
import { RoleRoute } from '../../features/auth/components/RoleRoute'
import { DepartmentAcademicScopeRoute } from '../../features/department/components/DepartmentAcademicScopeRoute'
import { isValidElement } from 'react'

describe('admin academic boundary routes (TK-W1-01)', () => {
  it.each(['portfolio', 'projects/9/evaluation-schemes', 'projects/9/evaluators', 'projects/9/final-submission', 'projects/9/result'])(
    'redirects legacy /admin/%s to /admin/access without rendering academic evaluation pages',
    subpath => {
      const matches = matchRoutes(appRouter.routes, `/admin/${subpath}`) ?? []
      const elements = matches.map(match => match.route.element).filter(isValidElement)
      const leaf = elements.at(-1)
      expect(leaf?.type).toBe(Navigate)
      expect(leaf?.props).toMatchObject({ to: '/admin/access', replace: true })
    },
  )

  it.each(['/department/pre-semester-setup', '/academic/review-gates', '/academic/profile-verifications', '/academic/rubrics'])(
    'restricts %s strictly to department staff with active academic scope',
    path => {
      const elements = (matchRoutes(appRouter.routes, path) ?? []).map(match => match.route.element).filter(isValidElement)
      expect(elements.find(element => element.type === RoleRoute)?.props).toEqual({ allowed: ['department'] })
      expect(elements.some(element => element.type === DepartmentAcademicScopeRoute)).toBe(true)
    },
  )

  it('keeps academic review restricted to department staff', () => {
    const elements = (matchRoutes(appRouter.routes, '/department/projects/review/9') ?? []).map(match => match.route.element).filter(isValidElement)
    expect(elements.find(element => element.type === RoleRoute)?.props).toEqual({ allowed: ['department'] })
    expect(elements.some(element => element.type === DepartmentAcademicScopeRoute)).toBe(true)
  })
})
