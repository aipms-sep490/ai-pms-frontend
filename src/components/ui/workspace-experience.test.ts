import { describe, expect, it } from 'vitest'
import { contextualNavigation, normalizeNavigationQuery } from './workspace-experience'

describe('workspace experience boundaries', () => {
  it('offers scoped department project destinations only to department staff', () => {
    const deptRoutes = contextualNavigation('/department/projects/9/governance', 'department')
    expect(deptRoutes.length).toBeGreaterThan(0)
    expect(deptRoutes.every(route => route.path.startsWith('/department/projects/9/'))).toBe(true)
    expect(contextualNavigation('/department/projects/0/governance', 'department')).toEqual([])
    expect(contextualNavigation('/department/workspace', 'department')).toEqual([])
  })
  it('accepts Vietnamese searches with or without accents including đ', () => {
    expect(normalizeNavigationQuery('  ĐỒ ÁN ')).toBe('do an')
    expect(normalizeNavigationQuery('Báo cáo tiến độ')).toBe(normalizeNavigationQuery('bao cao tien do'))
  })
  it('does not derive project destinations for other identities or malformed paths', () => {
    expect(contextualNavigation('/supervisor/projects/2/workspace', 'student')).toEqual([])
    expect(contextualNavigation('/department/projects/2/files', 'lecturer')).toEqual([])
    expect(contextualNavigation('/supervisor/projects/2/workspace', 'department')).toEqual([])
    expect(contextualNavigation('/supervisor/projects/0/workspace', 'lecturer')).toEqual([])
    expect(contextualNavigation('/supervisor/workspace', 'lecturer')).toEqual([])
  })
  it('keeps mentor navigation in its assigned project and major without supervisor-only areas', () => {
    const routes = contextualNavigation('/mentor/projects/12/majors/3/tasks/8', 'lecturer')
    expect(routes.length).toBe(5)
    expect(routes.every(route => route.path.startsWith('/mentor/projects/12/majors/3/'))).toBe(true)
    expect(routes.some(route => route.path.endsWith('/final-submission'))).toBe(false)
  })
})
