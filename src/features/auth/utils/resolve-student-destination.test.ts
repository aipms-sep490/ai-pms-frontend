import { describe, expect, it } from 'vitest'
import { mvpRoutes } from '../../../app/router/routes.config'
import { studentNavigation } from '../constants/student-navigation'
import { resolveStudentDestination } from './resolve-student-destination'

describe('resolveStudentDestination', () => {
  it('sends an active project to its workspace', () => {
    expect(resolveStudentDestination('ACTIVE')).toBe('/project/workspace')
  })

  it('keeps a revision request on the registered lifecycle preview until editing exists', () => {
    expect(resolveStudentDestination('REVISION_REQUIRED')).toBe('/projects/lifecycle')
  })

  it('only resolves to implemented MVP routes while future destinations remain planned', () => {
    const implementedPaths = new Set(
      mvpRoutes.filter((route) => route.status === 'implemented').map((route) => route.path),
    )

    for (const step of studentNavigation) {
      expect(implementedPaths.has(step.route)).toBe(true)
      expect(step.availability === 'planned').toBe(Boolean(step.plannedRoute))
    }
  })
})
