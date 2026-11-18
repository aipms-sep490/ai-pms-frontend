import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cancelProjectFileUpload, getSavedProjectFileUploads, uploadProjectFileInChunks, type ProjectFileUploadSession } from './project-file-uploads'
const { webcrypto } = await vi.importActual<{ webcrypto: Crypto }>('node:crypto')

const id = 'a'.repeat(32)
const file = () => new File(['123456'], 'proof.pdf', { type: 'application/pdf', lastModified: 123 })
const status = (patch: Partial<ProjectFileUploadSession> = {}): ProjectFileUploadSession => ({ sessionId: id, parentType: 'TASK', parentId: 42, fileName: 'proof.pdf', totalBytes: 6, nextOffset: 0, chunkSizeBytes: 2, expiresAt: new Date(Date.now() + 60_000).toISOString(), state: 'UPLOADING', file: null, error: null, ...patch })
const completed = () => status({ nextOffset: 6, state: 'COMPLETED', file: { id: 8, parentType: 'TASK', parentId: 42, fileName: 'proof.pdf', contentType: 'application/pdf', sizeBytes: 6, uploadedBy: 2, createdAt: '2026-11-18T00:00:00Z' } })
const response = (body: unknown, code = 200) => ({ ok: code >= 200 && code < 300, status: code, json: async () => body })
const login = (id = 2) => localStorage.setItem('ai-pms.auth-session', JSON.stringify({ user: { id } }))

beforeEach(() => { localStorage.clear(); login() })
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); localStorage.clear() })

describe('resumable project file uploads', () => {
  it('sends bounded binary chunks and reports only server-confirmed progress', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(status())).mockResolvedValueOnce(response(status({ nextOffset: 2 })))
      .mockResolvedValueOnce(response(status({ nextOffset: 4 }))).mockResolvedValueOnce(response(status({ nextOffset: 6 }))).mockResolvedValueOnce(response(completed()))
    vi.stubGlobal('fetch', fetch)
    const progress = vi.fn()
    await expect(uploadProjectFileInChunks('TASK', 42, file(), { onProgress: progress })).resolves.toMatchObject({ id: 8 })
    expect(fetch.mock.calls.map(call => [call[0], call[1].method])).toEqual([
      ['/api/v1/files/upload-sessions', 'POST'],
      [`/api/v1/files/upload-sessions/${id}/chunks?offset=0`, 'PUT'],
      [`/api/v1/files/upload-sessions/${id}/chunks?offset=2`, 'PUT'],
      [`/api/v1/files/upload-sessions/${id}/chunks?offset=4`, 'PUT'],
      [`/api/v1/files/upload-sessions/${id}/complete`, 'POST'],
    ])
    for (const call of fetch.mock.calls.filter(call => call[1].method === 'PUT')) {
      expect(call[1].body.size).toBe(2)
      expect(call[1].headers['Content-Type']).toBe('application/octet-stream')
    }
    expect(progress.mock.calls.map(call => call[0].nextOffset)).toEqual([0, 2, 4, 6, 6])
    expect(getSavedProjectFileUploads(2)).toEqual([])
  })

  it('reads back a lost chunk acknowledgement and skips the bytes already saved', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(status())).mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(response(status({ nextOffset: 2 }))).mockResolvedValueOnce(response(status({ nextOffset: 4 })))
      .mockResolvedValueOnce(response(status({ nextOffset: 6 }))).mockResolvedValueOnce(response(completed()))
    vi.stubGlobal('fetch', fetch)
    await uploadProjectFileInChunks('TASK', 42, file())
    expect(fetch.mock.calls[2][1].method).toBe('GET')
    expect(fetch.mock.calls[3][0]).toContain('offset=2')
    expect(fetch.mock.calls.filter(call => call[0].endsWith('offset=0'))).toHaveLength(1)
  })

  it('retains the session after a network failure and resumes from the authoritative offset', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(status())).mockResolvedValueOnce(response(status({ nextOffset: 2 })))
      .mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(response(status({ nextOffset: 2 })))
    vi.stubGlobal('fetch', fetch)
    await expect(uploadProjectFileInChunks('TASK', 42, file())).rejects.toThrow('offline')
    expect(getSavedProjectFileUploads(2)).toHaveLength(1)
    fetch.mockReset().mockResolvedValueOnce(response(status({ nextOffset: 2 }))).mockResolvedValueOnce(response(status({ nextOffset: 4 })))
      .mockResolvedValueOnce(response(status({ nextOffset: 6 }))).mockResolvedValueOnce(response(completed()))
    await uploadProjectFileInChunks('TASK', 42, file())
    expect(fetch.mock.calls[0][1].method).toBe('GET')
    expect(fetch.mock.calls[1][0]).toContain('offset=2')
    expect(fetch.mock.calls.filter(call => call[0] === '/api/v1/files/upload-sessions')).toHaveLength(0)
  })

  it('never automatically repeats an uncertain session creation', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('lost response'))
    vi.stubGlobal('fetch', fetch)
    await expect(uploadProjectFileInChunks('TASK', 42, file())).rejects.toThrow('lost response')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('reconciles an uncertain completion without creating a duplicate upload', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(status({ nextOffset: 6 }))).mockRejectedValueOnce(new TypeError('lost response'))
      .mockResolvedValueOnce(response(completed()))
    vi.stubGlobal('fetch', fetch)
    await expect(uploadProjectFileInChunks('TASK', 42, file())).resolves.toMatchObject({ id: 8 })
    expect(fetch.mock.calls.map(call => call[1].method)).toEqual(['POST', 'POST', 'GET'])
  })

  it('waits for background processing and never treats sent bytes as a saved file', async () => {
    // This case controls polling time only. Real FileReader/WebCrypto work can
    // finish after the fake clock has advanced, leaving the first poll pending.
    // The content-fingerprint test below exercises the real hash separately.
    vi.stubGlobal('crypto', undefined)
    vi.useFakeTimers()
    const fetch = vi.fn().mockResolvedValueOnce(response(status({ nextOffset: 6 }))).mockResolvedValueOnce(response(status({ state: 'PROCESSING', nextOffset: 6 })))
      .mockResolvedValueOnce(response(status({ state: 'PROCESSING', nextOffset: 6 }))).mockResolvedValueOnce(response(completed()))
    vi.stubGlobal('fetch', fetch)
    const finished = vi.fn()
    const upload = uploadProjectFileInChunks('TASK', 42, file()).then(finished)
    await vi.advanceTimersByTimeAsync(999)
    expect(finished).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2500)
    await upload
    expect(finished).toHaveBeenCalledWith(expect.objectContaining({ id: 8 }))
  })

  it('stops on an invalid acknowledged offset rather than looping or skipping bytes', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(status())).mockResolvedValueOnce(response(status({ nextOffset: 3 })))
    vi.stubGlobal('fetch', fetch)
    await expect(uploadProjectFileInChunks('TASK', 42, file())).rejects.toThrow('Vị trí tải lên đã thay đổi')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('pauses without deleting server data and resumes after processing was already accepted', async () => {
    const controller = new AbortController()
    const fetch = vi.fn().mockResolvedValueOnce(response(status()))
    vi.stubGlobal('fetch', fetch)
    await expect(uploadProjectFileInChunks('TASK', 42, file(), { signal: controller.signal, onProgress: () => controller.abort() })).rejects.toMatchObject({ name: 'AbortError' })
    expect(getSavedProjectFileUploads(2)).toHaveLength(1)
    fetch.mockReset().mockResolvedValueOnce(response(completed()))
    await expect(uploadProjectFileInChunks('TASK', 42, file())).resolves.toMatchObject({ id: 8 })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][1].method).toBe('GET')
  })

  it('keeps failed processing visible and deletes the saved marker only after confirmed cancellation', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(status({ state: 'FAILED', error: 'Định dạng tệp không hợp lệ.' })))
    vi.stubGlobal('fetch', fetch)
    await expect(uploadProjectFileInChunks('TASK', 42, file())).rejects.toThrow('Định dạng tệp không hợp lệ.')
    fetch.mockResolvedValueOnce(response({}, 409))
    await expect(cancelProjectFileUpload(id, 2)).rejects.toMatchObject({ status: 409 })
    expect(getSavedProjectFileUploads(2)).toHaveLength(1)
    fetch.mockResolvedValueOnce(response(null, 204))
    await cancelProjectFileUpload(id, 2)
    expect(getSavedProjectFileUploads(2)).toHaveLength(0)
  })

  it('never shares saved sessions with another account', async () => {
    const controller = new AbortController()
    const fetch = vi.fn().mockResolvedValue(response(status()))
    vi.stubGlobal('fetch', fetch)
    await expect(uploadProjectFileInChunks('TASK', 42, file(), { signal: controller.signal, onProgress: () => controller.abort() })).rejects.toMatchObject({ name: 'AbortError' })
    expect(getSavedProjectFileUploads(99)).toHaveLength(0)
    login(99)
    fetch.mockReset().mockResolvedValueOnce(response(completed()))
    await uploadProjectFileInChunks('TASK', 42, file())
    expect(fetch.mock.calls[0][0]).toBe('/api/v1/files/upload-sessions')
    expect(getSavedProjectFileUploads(2)).toHaveLength(1)
  })

  it('stops when the active account changes during an upload', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(status()))
    vi.stubGlobal('fetch', fetch)
    await expect(uploadProjectFileInChunks('TASK', 42, file(), { onProgress: () => login(99) })).rejects.toMatchObject({ status: 401 })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('requires authoritative file metadata before reporting completion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(status({ state: 'COMPLETED', nextOffset: 6 }))))
    await expect(uploadProjectFileInChunks('TASK', 42, file())).rejects.toThrow('Chưa xác nhận được tệp đã lưu')
    expect(getSavedProjectFileUploads(2)).toHaveLength(1)
  })

  it('retries a saved FAILED processing session only on a new user invocation, without resending chunks', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(status({ state: 'FAILED', nextOffset: 6, error: 'Drive unavailable' })))
    vi.stubGlobal('fetch', fetch)
    await expect(uploadProjectFileInChunks('TASK', 42, file())).rejects.toThrow('Drive unavailable')
    expect(fetch).toHaveBeenCalledTimes(1)
    fetch.mockReset().mockResolvedValueOnce(response(status({ state: 'FAILED', nextOffset: 6 }))).mockResolvedValueOnce(response(completed()))
    await expect(uploadProjectFileInChunks('TASK', 42, file())).resolves.toMatchObject({ id: 8 })
    expect(fetch.mock.calls.map(call => call[1].method)).toEqual(['GET', 'POST'])
    expect(fetch.mock.calls[1][0]).toBe(`/api/v1/files/upload-sessions/${id}/complete`)
  })

  it('rejects a different file with identical name, length and lastModified before appending', async () => {
    vi.stubGlobal('crypto', webcrypto)
    const controller = new AbortController()
    const fetch = vi.fn().mockResolvedValueOnce(response(status()))
    vi.stubGlobal('fetch', fetch)
    await expect(uploadProjectFileInChunks('TASK', 42, file(), { signal: controller.signal, onProgress: () => controller.abort() })).rejects.toMatchObject({ name: 'AbortError' })
    const different = new File(['abcdef'], 'proof.pdf', { type: 'application/pdf', lastModified: 123 })
    await expect(uploadProjectFileInChunks('TASK', 42, different)).rejects.toThrow('Nội dung tệp đã chọn khác phiên tải trước')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
