import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { HttpError } from '../../../services/http/http-client'
import { useTopics } from './useTopics'
const api = vi.hoisted(() => ({ getTopic: vi.fn(), listTopics: vi.fn(), createTopic: vi.fn(), updateTopic: vi.fn(), publishTopic: vi.fn(), closeTopic: vi.fn() }))
vi.mock('../api/topic-api', () => api)
vi.mock('../../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { accessToken: 'synthetic-topic-session' } }) }))
const topic = { id: 9, concurrencyToken: 'old-token' }
beforeEach(() => { api.getTopic.mockResolvedValue(topic) })
afterEach(() => { cleanup(); vi.resetAllMocks() })
it('refreshes a changed topic on 409 without retrying the decision', async () => {
  const result = renderHook(() => useTopics(9))
  await waitFor(() => expect(result.result.current.current?.id).toBe(9))
  api.publishTopic.mockRejectedValue(new HttpError('Topic changed', 409))
  api.getTopic.mockResolvedValue({ ...topic, concurrencyToken: 'fresh-token' })
  await act(async () => { await result.result.current.publish().catch(() => undefined) })
  expect(result.result.current.current?.concurrencyToken).toBe('fresh-token')
  expect(result.result.current.mutationError).toBeInstanceOf(HttpError)
  expect(api.publishTopic).toHaveBeenCalledExactlyOnceWith(9, 'old-token', 'synthetic-topic-session')
  expect(api.getTopic).toHaveBeenCalledTimes(2)
})
it('does not let an earlier project topic read replace a newly opened dossier', async () => {
  let finish!: (value: unknown) => void
  api.getTopic.mockImplementation((id: number) => id === 9 ? new Promise(resolve => { finish = resolve }) : Promise.resolve({ id, concurrencyToken: 'new-token' }))
  const result = renderHook(({ id }) => useTopics(id), { initialProps: { id: 9 } })
  result.rerender({ id: 10 })
  await waitFor(() => expect(result.result.current.current?.id).toBe(10))
  await act(async () => { finish(topic) })
  expect(result.result.current.current?.id).toBe(10)
})
it('locks duplicate mutations synchronously while the first request is pending', async () => {
  let finish!: (value: unknown) => void
  api.publishTopic.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const result = renderHook(() => useTopics(9))
  await waitFor(() => expect(result.result.current.current?.id).toBe(9))
  let first!: Promise<unknown>
  await act(async () => { first = result.result.current.publish(); await result.result.current.publish().catch(() => undefined) })
  expect(api.publishTopic).toHaveBeenCalledTimes(1)
  await act(async () => { finish(topic); await first })
})
