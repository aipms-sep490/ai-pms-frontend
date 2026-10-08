import { expect, it, vi } from 'vitest'
import { readAllPages } from './paged-read'
it('reads later pages when the server caps page size', async () => {
  const read = vi.fn().mockResolvedValueOnce({ items: [1, 2], totalCount: 3 }).mockResolvedValueOnce({ items: [3], totalCount: 3 })
  expect(await readAllPages<number>(read)).toEqual([1, 2, 3])
  expect(read.mock.calls).toEqual([[1], [2]])
})
it('does not present an incomplete source as complete', async () => {
  const read = vi.fn().mockResolvedValueOnce({ items: [1], totalCount: 2 }).mockResolvedValueOnce({ items: [], totalCount: 2 })
  await expect(readAllPages(read)).rejects.toThrow('incomplete page')
})
