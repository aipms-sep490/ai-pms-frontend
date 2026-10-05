import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProjectEvidence } from './project-governance-api'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe('project evidence contract', () => {
  it('posts only the canonical Task source and optional major/notes', async () => {
    localStorage.setItem('token', 'evidence-token')
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1 }) })
    vi.stubGlobal('fetch', fetch)
    await createProjectEvidence(9, { sourceType: 'TASK', sourceId: 8, majorId: 4, notes: 'Kiểm thử tích hợp' })
    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/9/evidence', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ sourceType: 'TASK', sourceId: 8, majorId: 4, notes: 'Kiểm thử tích hợp' })
  })
})
