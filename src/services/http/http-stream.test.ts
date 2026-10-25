import { afterEach, expect, it, vi } from 'vitest'
import { httpPostStream, configureHttpAuthentication } from './http-client'
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })
it('decodes split UTF-8 frames without dropping events and refreshes once before starting', async () => {
  const encoded = new TextEncoder().encode('{"type":"preview","text":"Tiến độ"}\n{"type":"completed"}\n')
  const response = new Response(new ReadableStream({ start(controller) { for (let i = 0; i < encoded.length; i += 3) controller.enqueue(encoded.slice(i, i + 3)); controller.close() } }))
  const fetcher = vi.fn().mockResolvedValueOnce(new Response('', { status: 401 })).mockResolvedValueOnce(response)
  vi.stubGlobal('fetch', fetcher)
  const refresh = vi.fn().mockResolvedValue('test-token')
  const detach = configureHttpAuthentication({ refresh, onSessionExpired: vi.fn() })
  try {
    const frames: unknown[] = []
    await httpPostStream('/test', new FormData(), frame => frames.push(frame))
    expect(frames).toEqual([{ type: 'preview', text: 'Tiến độ' }, { type: 'completed' }])
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe('Bearer test-token')
  } finally { detach() }
})
it('does not retry malformed output after the stream has started', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('{"type":"preview"}\ninvalid\n'))
  vi.stubGlobal('fetch', fetcher)
  const received = vi.fn()
  await expect(httpPostStream('/test', new FormData(), received)).rejects.toThrow()
  expect(received).toHaveBeenCalledTimes(1)
  expect(fetcher).toHaveBeenCalledTimes(1)
})
