import { describe, expect, it } from 'vitest'
import { studentNavigation } from '../constants/student-navigation'
import { resolveStudentDestination } from './resolve-student-destination'
import { resolveStudentNextAction } from './resolve-student-next-action'

describe('resolveStudentDestination', () => {
  it('sends an active project to its workspace', () => {
    expect(resolveStudentDestination('ACTIVE')).toBe('/project/workspace')
  })

  it('sends revision work to the real edit route and existing drafts back to edit', () => {
    expect(resolveStudentDestination('REVISION_REQUIRED')).toBe('/project/edit')
    expect(resolveStudentNextAction({ journeyState: 'TEAM_ELIGIBLE', projectStatus: 'Draft' })).toMatchObject({
      label: 'Tiếp tục bản nháp', route: '/project/edit',
    })
  })

  it('sends rejected projects to the read-only review status and history UI', () => {
    expect(resolveStudentNextAction({ journeyState: 'PROJECT_REJECTED', projectStatus: 'Rejected' })).toMatchObject({
      label: 'Xem kết quả thẩm định', route: '/project/status',
    })
  })

  it('resolves every journey state to a real protected student route', () => {
    const knownStudentRoutes = new Set([
      '/team/create', '/team', '/project/register', '/project/edit', '/project/status',
      '/project/supervisor', '/project/workspace', '/projects/lifecycle',
    ])

    for (const step of studentNavigation) {
      expect(knownStudentRoutes.has(step.route)).toBe(true)
      expect(step.availability).toBe('available')
    }
  })
})
