import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDraft, getProject, getProjectHistory, resubmitProject, submitProject, updateDraft } from '../projects.api'

const project = { id: 9, teamId: 4, teamName: 'Team 4', code: 'P-9', title: 'Title', status: 'Draft', registeredAt: '2026-09-01', createdBy: 1, createdByName: 'Leader', createdAt: '2026-09-01', updatedAt: '2026-09-01', concurrencyToken: 'MTIzNDU2Nzg=', majors: [], tags: [] }
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response

describe('projects API contract', () => {
  const originalFetch = globalThis.fetch
  afterEach(() => { globalThis.fetch = originalFetch })

  it('uses the supported create, detail, update, submit, resubmit and history routes with body tokens', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(ok(project)).mockResolvedValueOnce(ok(project)).mockResolvedValueOnce(ok(project))
      .mockResolvedValueOnce(ok(project)).mockResolvedValueOnce(ok(project)).mockResolvedValueOnce(ok([]))
    globalThis.fetch = fetchMock
    const payload = { title: 'Title', description: null, objectives: null, problemStatement: null, expectedOutput: null, requiredMajorIds: [7], domain: 'SE', technologies: ['React'], keywords: ['PMS'] }
    await createDraft(payload)
    await getProject(9)
    await updateDraft(9, { ...payload, concurrencyToken: 'MTIzNDU2Nzg=' })
    await submitProject(9, 'MTIzNDU2Nzg=')
    await resubmitProject(9, 'MTIzNDU2Nzg=')
    await getProjectHistory(9)
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method, init.body])).toEqual([
      ['/api/v1/projects', 'POST', JSON.stringify(payload)], ['/api/v1/projects/9', 'GET', undefined],
      ['/api/v1/projects/9', 'PUT', JSON.stringify({ ...payload, concurrencyToken: 'MTIzNDU2Nzg=' })],
      ['/api/v1/projects/9/submit', 'POST', JSON.stringify({ concurrencyToken: 'MTIzNDU2Nzg=' })],
      ['/api/v1/projects/9/resubmit', 'POST', JSON.stringify({ concurrencyToken: 'MTIzNDU2Nzg=' })],
      ['/api/v1/projects/9/history', 'GET', undefined],
    ])
  })
})
