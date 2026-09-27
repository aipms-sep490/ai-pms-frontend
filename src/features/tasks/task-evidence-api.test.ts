import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from './task-evidence-api'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe('task evidence and comments contract', () => {
  it('binds uploads to the TASK parent and sends comments to the task resource', async () => {
    localStorage.setItem('token', 'task-token')
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1 }) })
    vi.stubGlobal('fetch', fetch)
    await api.uploadTaskEvidence(42, new File(['proof'], 'proof.txt', { type: 'text/plain' }))
    await api.addTaskComment(42, 'Verified result')

    expect(fetch.mock.calls[0][0]).toBe('/api/v1/files')
    expect(fetch.mock.calls[0][1].body.get('parentType')).toBe('TASK')
    expect(fetch.mock.calls[0][1].body.get('parentId')).toBe('42')
    expect(fetch.mock.calls[0][1].headers['Content-Type']).toBeUndefined()
    expect(fetch.mock.calls[1][0]).toBe('/api/v1/tasks/42/comments')
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ content: 'Verified result' })
  })
})
