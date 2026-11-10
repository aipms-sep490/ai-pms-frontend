import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

describe('room planner rollout', () => {
  it.each([undefined, '', 'false'])('stays disabled without explicit opt-in (%s)', async flag => {
    vi.stubEnv('VITE_ENABLE_DEFENSE', 'true')
    vi.stubEnv('VITE_ENABLE_ROOM_PLANNER', flag)
    vi.resetModules()
    const { env } = await import('./env')
    expect(env.defenseScheduleEnabled).toBe(true)
    expect(env.roomPlannerEnabled).toBe(false)
  })

  it('accepts explicit opt-in without changing the existing defense flag', async () => {
    vi.stubEnv('VITE_ENABLE_DEFENSE', 'false')
    vi.stubEnv('VITE_ENABLE_ROOM_PLANNER', ' TRUE ')
    vi.resetModules()
    const { env } = await import('./env')
    expect(env.defenseScheduleEnabled).toBe(false)
    expect(env.roomPlannerEnabled).toBe(true)
  })
})
