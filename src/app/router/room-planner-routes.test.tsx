import { isValidElement } from 'react'
import { matchRoutes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

describe('room planner route rollout', () => {
  it.each([
    ['true', undefined, false],
    ['true', 'false', false],
    ['false', 'true', true],
    ['true', 'true', true],
  ] as const)('decouples committee route from room planner flag (defense=%s, planner=%s)', async (defense, planner, plannerEnabled) => {
    vi.stubEnv('VITE_ENABLE_DEFENSE', defense)
    vi.stubEnv('VITE_ENABLE_ROOM_PLANNER', planner)
    vi.resetModules()
    const { appRouter } = await import('./index')
    const { RoleRoute } = await import('../../features/auth/components/RoleRoute')
    const matches = matchRoutes(appRouter.routes, '/academic/project-periods/3/room-planner') ?? []
    expect(matches.some(match => match.route.path === 'academic/project-periods/:periodId/room-planner')).toBe(plannerEnabled)
    if (plannerEnabled) {
      const elements = matches.map(match => match.route.element).filter(isValidElement)
      expect(elements.find(element => element.type === RoleRoute)?.props).toEqual({ allowed: ['department', 'admin'] })
    }
    // TK-W3-06: Department committee/defense management is ALWAYS mounted regardless of flags (POL-06 non-blocking)
    const deptDefenseMatches = matchRoutes(appRouter.routes, '/department/projects/12/defense') ?? []
    expect(deptDefenseMatches.some(match => match.route.path === 'department/projects/:projectId/defense')).toBe(true)
    const deptCommitteeMatches = matchRoutes(appRouter.routes, '/department/projects/12/committee') ?? []
    expect(deptCommitteeMatches.some(match => match.route.path === 'department/projects/:projectId/committee')).toBe(true)
    const defenseMatches = matchRoutes(appRouter.routes, '/project/defense') ?? []
    expect(defenseMatches.some(match => match.route.path === 'project/defense')).toBe(defense === 'true')
    appRouter.dispose()
  })
})
