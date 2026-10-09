import { describe, expect, it } from 'vitest'
import { matchRoutes } from 'react-router-dom'
import { appRouter } from './index'
import { RoleRoute } from '../../features/auth/components/RoleRoute'
import { DepartmentAcademicScopeRoute } from '../../features/department/components/DepartmentAcademicScopeRoute'
import { isValidElement } from 'react'

describe('production admin evaluation routes', () => {
  it.each(['evaluation-schemes', 'evaluators', 'final-submission', 'result'])('registers %s under Admin identity without requiring a department assignment', leaf => {
    const matches = matchRoutes(appRouter.routes, `/admin/projects/9/${leaf}`) ?? []
    expect(matches.at(-1)?.route.path).toBe(leaf)
    const elements = matches.map(match => match.route.element).filter(isValidElement)
    expect(elements.some(element => element.type === DepartmentAcademicScopeRoute)).toBe(false)
    const guard = elements.find(element => element.type === RoleRoute)
    expect(guard?.props).toEqual({ allowed: ['admin'] })
  })
  it('keeps academic review restricted to department staff', () => {
    const elements = (matchRoutes(appRouter.routes, '/department/projects/review/9') ?? []).map(match => match.route.element).filter(isValidElement)
    expect(elements.find(element => element.type === RoleRoute)?.props).toEqual({ allowed: ['department'] })
    expect(elements.some(element => element.type === DepartmentAcademicScopeRoute)).toBe(true)
  })
})
