import { describe, expect, it } from 'vitest'
import { contextualNavigation,isDeferredDepartmentPath,normalizeNavigationQuery } from './workspace-experience'

describe('workspace experience boundaries',()=>{
  it('defers department pages but includes administration and shared academic structure',()=>{
    for(const path of ['/department/workspace','/department/projects/2/files','/academic/governance','/academic/rubrics','/academic/project-periods/2/policy'])expect(isDeferredDepartmentPath(path)).toBe(true)
    for(const path of ['/admin/access','/academic','/academic/profile-verifications','/project/reports','/supervisor/dashboard','/mentor/workspace','/evaluator/workspace'])expect(isDeferredDepartmentPath(path)).toBe(false)
  })
  it('accepts Vietnamese searches with or without accents including đ',()=>{
    expect(normalizeNavigationQuery('  ĐỒ ÁN ')).toBe('do an')
    expect(normalizeNavigationQuery('Báo cáo tiến độ')).toBe(normalizeNavigationQuery('bao cao tien do'))
  })
  it('does not derive project destinations for other identities or malformed paths',()=>{
    expect(contextualNavigation('/supervisor/projects/2/workspace','student')).toEqual([])
    expect(contextualNavigation('/department/projects/2/files','lecturer')).toEqual([])
    expect(contextualNavigation('/supervisor/projects/0/workspace','lecturer')).toEqual([])
    expect(contextualNavigation('/supervisor/workspace','lecturer')).toEqual([])
  })
  it('keeps mentor navigation in its assigned project and major without supervisor-only areas',()=>{
    const routes=contextualNavigation('/mentor/projects/12/majors/3/tasks/8','lecturer')
    expect(routes.length).toBe(5)
    expect(routes.every(route=>route.path.startsWith('/mentor/projects/12/majors/3/'))).toBe(true)
    expect(routes.some(route=>route.path.endsWith('/final-submission'))).toBe(false)
  })
})
