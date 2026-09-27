import { afterEach, describe, expect, it, vi } from 'vitest'
import { deleteProjectFile, downloadProjectFile, getProjectFiles, uploadProjectFile } from './project-files-api'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe('project file repository contract', () => {
  it('keeps project filters scoped and sends a multipart attachment to an explicit parent', async () => {
    localStorage.setItem('token', 'file-token')
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ items: [] }), blob: async () => new Blob(['file']) })
    vi.stubGlobal('fetch', fetch)

    await getProjectFiles(9, { search: 'minutes', contentType: 'application/pdf', uploadedBy: 4, from: '2026-09-01T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z', parentType: 'MEETING', page: 2 })
    await uploadProjectFile('TASK', 42, new File(['proof'], 'proof.txt', { type: 'text/plain' }))
    await downloadProjectFile(11)
    await deleteProjectFile(11)

    expect(fetch.mock.calls[0][0]).toBe('/api/v1/projects/9/files?page=2&pageSize=20&search=minutes&contentType=application%2Fpdf&uploadedBy=4&from=2026-09-01T00%3A00%3A00.000Z&to=2026-10-01T00%3A00%3A00.000Z&parentType=MEETING')
    expect(fetch.mock.calls[1][0]).toBe('/api/v1/files')
    expect(fetch.mock.calls[1][1].body.get('parentType')).toBe('TASK')
    expect(fetch.mock.calls[1][1].body.get('parentId')).toBe('42')
    expect(fetch.mock.calls[1][1].headers['Content-Type']).toBeUndefined()
    expect(fetch.mock.calls[2][0]).toBe('/api/v1/files/11/download')
    expect(fetch.mock.calls[3][0]).toBe('/api/v1/files/11')
    expect(fetch.mock.calls[3][1].method).toBe('DELETE')
  })
})
