import { describe, it, expect } from 'vitest'
import {
  mvpRoutes,
  getStudentNavItems,
  getBreadcrumbForPath,
} from './routes.config'

describe('routes.config', () => {
  it('defines the MVP screens including final submission', () => {
    expect(mvpRoutes).toHaveLength(14)
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
      '/project/milestones',
      '/project/gantt',
      '/project/reports',
      '/project/meetings',
      '/project/final-submission',
      '/project/result',
      '/project/contributions',
      '/supervisor/workspace',
      '/login',
      '/profile',
    ].sort())
  })

  describe('getStudentNavItems', () => {
    it('returns student workspace items and management preview items', () => {
      const { workspaceItems, managementItems } = getStudentNavItems()
      expect(workspaceItems).toHaveLength(10)
      expect(managementItems).toHaveLength(2)
      expect(managementItems.map((m) => m.path)).toContain('/supervisor/workspace')
      expect(managementItems.map((m) => m.path)).toContain('/department/workspace')
    })
  })

  describe('getBreadcrumbForPath', () => {
    it('keeps overview separate from the guarded ACTIVE workspace', () => {
      expect(getBreadcrumbForPath('/')).toBe('Tổng quan lộ trình')
      expect(getBreadcrumbForPath('/project/overview')).toBe('Tổng quan lộ trình')
      expect(getBreadcrumbForPath('/project/workspace')).toBe('Phối hợp nhóm')
    })

    it('resolves registered routes to their defined titles', () => {
      expect(getBreadcrumbForPath('/projects/lifecycle')).toBe('Hồ sơ đồ án')
      expect(getBreadcrumbForPath('/project/gantt')).toBe('Lịch thực hiện')
      expect(getBreadcrumbForPath('/project/milestones/M3')).toBe('Mốc đồ án')
      expect(getBreadcrumbForPath('/project/milestones/M1')).toBe('Mốc đồ án')
      expect(getBreadcrumbForPath('/supervisor/workspace')).toBe('Bàn làm việc GVHD')
      expect(getBreadcrumbForPath('/academic/rubrics')).toBe('Rubric đánh giá')
      expect(getBreadcrumbForPath('/department/projects/2/evaluations')).toBe('Phân công evaluator')
      expect(getBreadcrumbForPath('/department/projects/2/evaluators')).toBe('Phân công evaluator')
    })

    it('does not expose unknown URLs in a page title', () => {
      expect(getBreadcrumbForPath('/unknown/route')).toBe('Trang không tồn tại')
      expect(getBreadcrumbForPath('/academic')).toBe('Cấu trúc đào tạo')
      expect(getBreadcrumbForPath('/academic/governance')).toBe('Quản lý học vụ')
      expect(getBreadcrumbForPath('/department/student-qualifications')).toBe('Xác minh điều kiện tham gia')
      expect(getBreadcrumbForPath('/project/source')).toBe('Chọn cách đăng ký đồ án')
    })
  })
})
