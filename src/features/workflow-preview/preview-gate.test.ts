import { afterEach, describe, expect, it, vi } from 'vitest'
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })
describe('preview dual gate', () => {
  it.each([['api', 'true', false], ['mock', 'false', false], ['mock', 'true', true]])('requires mock mode and explicit flag (%s/%s)', async (mode, enabled, expected) => {
    vi.resetModules(); vi.stubEnv('VITE_DATA_MODE', mode); vi.stubEnv('VITE_ENABLE_WORKFLOW_PREVIEW', enabled)
    expect((await import('../../app/config/env')).env.workflowPreviewEnabled).toBe(expected)
  })
})
