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

it('accepts a read larger than the frame limit when every complete event is small', async () => {
  const events = Array.from({ length: 1800 }, (_, index) => ({ type: 'preview', index, text: 'Nội dung báo cáo '.repeat(50) }))
  const text = events.map(event => JSON.stringify(event)).join('\n') + '\n'
  expect(text.length).toBeGreaterThan(1024 * 1024)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(text)); controller.close() } }))))
  const received: unknown[] = []
  await httpPostStream('/test', new FormData(), event => received.push(event))
  expect(received).toEqual(events)
  expect(fetch).toHaveBeenCalledTimes(1)
})

it('retains a long completed document and escaped Vietnamese text without a trailing newline', async () => {
  const answer = '# Báo cáo tuần\n' + 'Tiến độ, công việc và nội dung cần bổ sung.\n'.repeat(3500)
  const completed = { type: 'completed', response: { answer, citations: [], projectEvidence: [], runId: 27 } }
  // System.Text.Json may escape non-ASCII characters on the wire.
  const text = JSON.stringify(completed).replace(/[\u0080-\uffff]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)
  expect(text.length).toBeGreaterThan(256000)
  expect(text.length).toBeLessThan(1024 * 1024)
  const bytes = new TextEncoder().encode(text)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ReadableStream({ start(controller) { controller.enqueue(bytes.slice(0, 250000)); controller.enqueue(bytes.slice(250000)); controller.close() } }))))
  const received: unknown[] = []
  await httpPostStream('/test', new FormData(), event => received.push(event))
  expect(received).toEqual([completed])
})

it.each([false, true])('cancels an oversized individual frame (newline: %s) without replaying the request', async newline => {
  const cancel = vi.fn().mockResolvedValue(undefined)
  const releaseLock = vi.fn()
  const read = vi.fn().mockResolvedValue({ done: false, value: new TextEncoder().encode(JSON.stringify({ text: 'x'.repeat(1024 * 1024) }) + (newline ? '\n' : '')) })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: { getReader: () => ({ read, cancel, releaseLock }) } }))
  const received = vi.fn()
  await expect(httpPostStream('/test', new FormData(), received)).rejects.toThrow('Stream frame too large')
  expect(received).not.toHaveBeenCalled()
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(cancel).toHaveBeenCalledOnce()
  expect(releaseLock).toHaveBeenCalledOnce()
})
