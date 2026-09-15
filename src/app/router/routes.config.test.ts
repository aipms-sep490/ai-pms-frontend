import { describe, it, expect } from 'vitest'
import {
  mvpRoutes,
  getStudentNavItems,
  getBreadcrumbForPath,
} from './routes.config'

describe('routes.config', () => {
  it('defines exactly 11 MVP screens', () => {
    expect(mvpRoutes).toHaveLength(11)
  })

  it('has unique route paths and unique IDs', () => {
    const paths = mvpRoutes.map((r) => r.path)
    const ids = mvpRoutes.map((r) => r.id)

    expect(new Set(paths).size).toBe(mvpRoutes.length)
    expect(new Set(ids).size).toBe(mvpRoutes.length)
  })

  it('contains valid section assignments and status flags', () => {
    const validSections = ['workspace', 'management', 'auth']
    const validStatuses = ['implemented', 'coming_soon']

    for (const route of mvpRoutes) {
      expect(validSections).toContain(route.section)
      expect(validStatuses).toContain(route.status)
      expect(route.icon.length).toBeGreaterThan(0)
      expect(route.title.length).toBeGreaterThan(0)
      expect(route.breadcrumb.length).toBeGreaterThan(0)
    }
  })

  it('marks exactly the implemented routes', () => {
    const implemented = mvpRoutes.filter((r) => r.status === 'implemented')
    expect(implemented.map((r) => r.path).sort()).toEqual([
      '/project/overview',
      '/projects/lifecycle',
      '/project/milestones/M3',
      '/project/gantt',
      '/supervisor/workspace',
      '/login',
      '/profile',
    ].sort())
  })

  describe('getStudentNavItems', () => {
    it('returns student workspace items and management preview items', () => {
      const { workspaceItems, managementItems } = getStudentNavItems()
      expect(workspaceItems).toHaveLength(7)
      expect(managementItems).toHaveLength(2)
      expect(managementItems.map((m) => m.path)).toContain('/supervisor/workspace')
      expect(managementItems.map((m) => m.path)).toContain('/department/workspace')
    })
  })

  describe('getBreadcrumbForPath', () => {
    it('keeps overview separate from the guarded ACTIVE workspace', () => {
      expect(getBreadcrumbForPath('/')).toBe('Tổng quan lộ trình')
      expect(getBreadcrumbForPath('/project/overview')).toBe('Tổng quan lộ trình')
      expect(getBreadcrumbForPath('/project/workspace')).toBe('Không gian đồ án ACTIVE')
    })

    it('resolves registered routes to their defined titles', () => {
      expect(getBreadcrumbForPath('/projects/lifecycle')).toBe('Đăng ký & Hồ sơ đề tài')
      expect(getBreadcrumbForPath('/project/gantt')).toBe('Gantt & Đường găng')
      expect(getBreadcrumbForPath('/project/milestones/M3')).toBe('Tiến trình & Cột mốc')
      expect(getBreadcrumbForPath('/project/milestones/M1')).toBe('Tiến trình & Cột mốc')
      expect(getBreadcrumbForPath('/supervisor/workspace')).toBe('Bàn làm việc GVHD')
    })

    it('strips leading slash for unknown paths as fallback', () => {
      expect(getBreadcrumbForPath('/unknown/route')).toBe('unknown/route')
    })
  })
})
