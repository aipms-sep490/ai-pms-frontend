import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { HttpError } from '../../../services/http/http-client'
import { departmentError, useDepartmentSection } from './useDepartmentSection'
afterEach(cleanup)
it.each([[401, 'authentication'], [403, 'forbidden'], [404, 'not-found'], [405, 'unsupported'], [501, 'unsupported'], [503, 'unavailable']])('distinguishes status %s', (status, state) => {
  expect(departmentError(new HttpError('failed', Number(status))).state).toBe(state)
})
it('does not let a previous context response replace the current context', async () => {
  let finish!: (value: number[]) => void
  const old = vi.fn(() => new Promise<number[]>(resolve => { finish = resolve }))
  const current = vi.fn(async () => [2]), empty = (data: number[]) => data.length === 0
  const { result, rerender } = renderHook(({ read }) => useDepartmentSection(read, empty), { initialProps: { read: old as () => Promise<number[]> } })
  rerender({ read: current })
  await waitFor(() => expect(result.current.data).toEqual([2]))
  await act(async () => finish([1]))
  expect(result.current.data).toEqual([2])
})
