import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatApi } from './chat-api'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe('chat API contract (BE-N09)', () => {
  it('uploads with the /uploads route and a capitalized File field', async () => {
    localStorage.setItem('token', 'chat-token')
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: '1', fileName: 'f.png', contentType: 'image/png', sizeBytes: 3, sha256: 'x' }) })
    vi.stubGlobal('fetch', fetch)
    const file = new File(['abc'], 'f.png', { type: 'image/png' })
    await chatApi.uploadAttachment('9', file)
    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('/api/v1/chat/conversations/9/uploads')
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    expect((options.body as FormData).get('File')).toBe(file)
  })

  it('downloads scoped to the conversation and message, not a bare attachment id', async () => {
    localStorage.setItem('token', 'chat-token')
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(['x']) })
    vi.stubGlobal('fetch', fetch)
    await chatApi.downloadAttachment('9', '17', '3')
    expect(fetch.mock.calls[0][0]).toBe('/api/v1/chat/conversations/9/messages/17/attachments/3/download')
  })

  it('reacts and unreacts with the real routes, and unreact uses a query param not a path segment', async () => {
    localStorage.setItem('token', 'chat-token')
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetch)
    await chatApi.react('9', '17', '👍')
    await chatApi.unreact('9', '17', '👍')
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method, options.body])).toEqual([
      ['/api/v1/chat/conversations/9/messages/17/reactions', 'PUT', JSON.stringify({ emoji: '👍' })],
      ['/api/v1/chat/conversations/9/messages/17/reactions?emoji=%F0%9F%91%8D', 'DELETE', undefined],
    ])
  })

  it('mutes with a mutedUntil body and unmutes by passing null', async () => {
    localStorage.setItem('token', 'chat-token')
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetch)
    await chatApi.mute('9', '2026-10-13T00:00:00.000Z')
    await chatApi.mute('9', null)
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method, options.body])).toEqual([
      ['/api/v1/chat/conversations/9/mute', 'PUT', JSON.stringify({ mutedUntil: '2026-10-13T00:00:00.000Z' })],
      ['/api/v1/chat/conversations/9/mute', 'PUT', JSON.stringify({ mutedUntil: null })],
    ])
  })

  it('sends with attachmentIds, not the old attachmentFileIds field', async () => {
    localStorage.setItem('token', 'chat-token')
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetch)
    await chatApi.send('9', { clientMessageId: 'c1', body: null, attachmentIds: ['1', '2'] })
    expect(fetch.mock.calls[0]).toEqual([
      '/api/v1/chat/conversations/9/messages', expect.objectContaining({ method: 'POST', body: JSON.stringify({ clientMessageId: 'c1', body: null, attachmentIds: ['1', '2'] }) }),
    ])
  })
})
