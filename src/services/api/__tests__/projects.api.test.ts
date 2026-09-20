import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDraft, getProject, getProjectHistory, resubmitProject, selectTopic, submitProject, updateDraft } from '../projects.api'

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

  it('selects a published topic through the exact JSON contract and preserves ProblemDetails errors', async () => {
    const selected = { ...project, topicId: 5, proposalSource: 'PUBLISHED_TOPIC', selectedTopic: { id: 5, code: 'TOP-5', title: 'AI topic' }, concurrencyToken: 'fresh-token' }
    const fetchMock = vi.fn().mockResolvedValueOnce(ok(selected)).mockResolvedValueOnce({ ok: false, status: 409, statusText: 'Conflict', json: async () => ({ title: 'Conflict', detail: 'Topic is no longer selectable.' }) } as Response)
    globalThis.fetch = fetchMock
    await expect(selectTopic(9, { topicId: 5, concurrencyToken: 'MTIzNDU2Nzg=' })).resolves.toMatchObject({ selectedTopic: { code: 'TOP-5' }, concurrencyToken: 'fresh-token' })
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/projects/9/topic', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ topicId: 5, concurrencyToken: 'MTIzNDU2Nzg=' }) }))
    await expect(selectTopic(9, { topicId: 5, concurrencyToken: 'fresh-token' })).rejects.toMatchObject({ status: 409, message: 'Topic is no longer selectable.' })
  })
})
