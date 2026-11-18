import { afterEach, describe, expect, it, vi } from 'vitest'
import { deleteProjectFile, downloadProjectFile, getProjectFiles, saveProjectFile, uploadProjectFile } from './project-files-api'
import { clearUploadPolicyCache } from '../../services/api/upload-policies.api'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); clearUploadPolicyCache() })

describe('project file repository contract', () => {
  it('enforces the published500MiB limit before creating an upload session', async () => {
    const file = new File(['pdf'], 'large.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'size', { value: 500 * 1024 * 1024 + 1 })
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ parentType: 'PROJECT_FILE', maxBytes: 500 * 1024 * 1024, maxBytesLabel: '500 MiB', allowedMimeTypes: ['application/pdf'], allowedExtensions: ['.pdf'], chunkSizeBytes: 4 * 1024 * 1024, singleRequestMaxBytes: 20 * 1024 * 1024 }) })
    vi.stubGlobal('fetch', fetch)
    await expect(uploadProjectFile('TASK', 42, file)).rejects.toThrow('Tệp vượt giới hạn 500 MiB')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe('/api/v1/upload-policies/TASK')
  })

  it('does not send a large multipart request when the backend has not advertised chunk support', async () => {
    const file = new File(['pdf'], 'large.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'size', { value: 30 * 1024 * 1024 })
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ maxBytes: 500 * 1024 * 1024, allowedMimeTypes: ['application/pdf'], allowedExtensions: ['.pdf'] }) })
    vi.stubGlobal('fetch', fetch)
    await expect(uploadProjectFile('TASK', 42, file)).rejects.toThrow('Chưa xác nhận được chức năng tải tệp lớn')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('streams a large protected download into the selected file without converting to Blob', async () => {
    const write = vi.fn()
    const close = vi.fn()
    const picker = vi.fn().mockResolvedValue({ createWritable: async () => new WritableStream({ write, close }) })
    vi.stubGlobal('showSaveFilePicker', picker)
    const blob = vi.fn()
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob, body: new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1, 2, 3])); controller.close() } }) })
    vi.stubGlobal('fetch', fetch)
    await saveProjectFile({ id: 8, parentType: 'TASK', parentId: 42, fileName: 'large.pdf', contentType: 'application/pdf', sizeBytes: 500 * 1024 * 1024, uploadedBy: 2, createdAt: '' })
    expect(picker).toHaveBeenCalledWith({ suggestedName: 'large.pdf' })
    expect(picker.mock.invocationCallOrder[0]).toBeLessThan(fetch.mock.invocationCallOrder[0])
    expect(write).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledTimes(1)
    expect(blob).not.toHaveBeenCalled()
  })
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
