import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from './final-submission-api'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body })

describe('final submission contract', () => {
  it('uses separate draft and checklist tokens and treats an absent locked package as pending', async () => {
    localStorage.setItem('token', 'student-token')
    const fetch = vi.fn()
      .mockResolvedValueOnce(ok({ id: 4, concurrencyToken: 'draft-token', items: [] }))
      .mockResolvedValueOnce(ok({ canSubmit: true, draftConcurrencyToken: 'draft-token', requirementsConcurrencyToken: 'requirements-token', items: [] }))
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ title: 'Not found' }) })
      .mockResolvedValueOnce(ok({ id: 9, isLocked: true, items: [] }))
    vi.stubGlobal('fetch', fetch)

    await api.getFinalDraft(7)
    await api.getFinalChecklist(7)
    expect(await api.getLockedFinalSubmission(7)).toBeNull()
    await api.submitFinalSubmission(7, 'draft-token', 'requirements-token')

    expect(fetch.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
      ['/api/v1/projects/7/final-submission-draft', 'GET'],
      ['/api/v1/projects/7/final-submission/checklist', 'GET'],
      ['/api/v1/projects/7/final-submission', 'GET'],
      ['/api/v1/projects/7/final-submission', 'POST'],
    ])
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ draftConcurrencyToken: 'draft-token', requirementsConcurrencyToken: 'requirements-token' })
    expect(fetch.mock.calls.every(([, options]) => options.headers.Authorization === 'Bearer student-token')).toBe(true)
  })

  it('downloads a locked snapshot file through the project-scoped route', async () => {
    localStorage.setItem('token', 'student-token')
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(['file']) })
    vi.stubGlobal('fetch', fetch)
    await api.downloadLockedFile(7, 11)
    expect(fetch.mock.calls[0][0]).toBe('/api/v1/projects/7/final-submission/files/11/download')
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer student-token')
  })
})
