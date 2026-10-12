import { afterEach, expect, it, vi } from 'vitest'
import { getMyCapabilities } from './capabilities-api'
import { projectCapabilities } from '../../test/project-capabilities'

const http = vi.hoisted(() => ({ httpGet: vi.fn() }))
vi.mock('../../services/http/http-client', () => http)
afterEach(() => vi.resetAllMocks())
it('requests the merged endpoint and forwards the abort signal', async () => {
  const payload = projectCapabilities(9), signal = new AbortController().signal
  http.httpGet.mockResolvedValue(payload)
  expect(await getMyCapabilities(9, signal)).toBe(payload)
  expect(http.httpGet).toHaveBeenCalledExactlyOnceWith('/projects/9/my-capabilities', signal)
})
it.each([
  null, {}, { ...projectCapabilities(10) },
  { projectId: 9, capabilities: { PUBLISH_RESULT: true }, blockedReasons: {} },
  { ...projectCapabilities(9), actions: [{ code: 'manage_evaluators', allowed: 'true', reasons: [] }] },
  { ...projectCapabilities(9), actions: [{ code: 'manage_evaluators', allowed: true, reasons: [null] }] },
  { ...projectCapabilities(9), actions: [projectCapabilities(9).actions[0], projectCapabilities(9).actions[0]] },
])('rejects malformed, obsolete or foreign authority %#', async payload => {
  http.httpGet.mockResolvedValue(payload)
  await expect(getMyCapabilities(9)).rejects.toThrow('Project capability contract mismatch')
})
